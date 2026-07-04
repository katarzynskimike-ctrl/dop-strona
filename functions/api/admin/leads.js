/**
 * DOP Admin — lista zapisów na kursy (lista Brevo #9 "Uczestnicy Kursów Otwartych")
 * Route: GET /api/admin/leads
 * Auth: header  Authorization: Bearer <ADMIN_TOKEN>
 * Env (Cloudflare dashboard → Settings → Variables and Secrets, Production):
 *   - ADMIN_TOKEN (Secret) — wymagane (fallback hash usunięty 2026-06-12 po
 *     poprawnym skonfigurowaniu sekretu w dashboardzie).
 *   - BREVO_API_KEY (Secret) — już skonfigurowane (używa go /api/lead)
 */

const BREVO_API = 'https://api.brevo.com/v3';
const LIST_ID = 9; // forms-config.json → lists.uczestnicy_kursow.id
const PAGE_LIMIT = 500;   // max Brevo
const MAX_CONTACTS = 5000; // bezpiecznik na paginację

export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, must-revalidate',
    'X-Robots-Tag': 'noindex, nofollow'
  };

  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed' }, 405, headers);
  }
  if (!env.BREVO_API_KEY) {
    return json({ ok: false, error: 'Server misconfigured: BREVO_API_KEY missing' }, 500, headers);
  }

  if (!env.ADMIN_TOKEN) {
    return json({ ok: false, error: 'Server misconfigured: ADMIN_TOKEN missing' }, 500, headers);
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const authorized = token ? timingSafeEqual(token, env.ADMIN_TOKEN) : false;
  if (!authorized) {
    return json({ ok: false, error: 'Unauthorized' }, 401, headers);
  }

  try {
    const contacts = [];
    let offset = 0;
    let total = null;
    while (contacts.length < MAX_CONTACTS) {
      const r = await fetch(
        BREVO_API + '/contacts/lists/' + LIST_ID + '/contacts?limit=' + PAGE_LIMIT + '&offset=' + offset + '&sort=desc',
        { headers: { 'accept': 'application/json', 'api-key': env.BREVO_API_KEY } }
      );
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        return json({ ok: false, error: 'Brevo error ' + r.status, details: body.slice(0, 300) }, 502, headers);
      }
      const page = await r.json();
      total = page.count ?? total;
      const batch = page.contacts || [];
      for (const c of batch) {
        const a = c.attributes || {};
        contacts.push({
          email: c.email,
          firstname: a.FIRSTNAME || '',
          lastname: a.LASTNAME || '',
          phone: a.PHONE || a.SMS || '',
          kurs_name: a.KURS_NAME || '',
          kurs_slug: a.KURS_SLUG || '',
          kurs_price: a.KURS_PRICE ?? '',
          platnosc: a.PLATNOSC || '',
          dokument: a.DOKUMENT || '',
          nip: a.NIP || '',
          dane_faktury: a.DANE_FAKTURY || '',
          pref_termin: a.PREF_TERMIN || '',
          signup_date: a.SIGNUP_DATE || '',
          signup_timestamp: a.SIGNUP_TIMESTAMP || '',
          intent: a.INTENT || '',
          source: a.SOURCE || '',
          brevo_id: c.id,
          brevo_modified: c.modifiedAt || ''
        });
      }
      offset += batch.length;
      if (batch.length < PAGE_LIMIT || (total != null && offset >= total)) break;
    }

    return json({ ok: true, list_id: LIST_ID, total: total ?? contacts.length, count: contacts.length, contacts }, 200, headers);
  } catch (e) {
    return json({ ok: false, error: 'Brak połączenia z Brevo: ' + (e && e.message || e) }, 502, headers);
  }
}

// Porównanie stałoczasowe (unika timing attack na token)
function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const ab = enc.encode(String(a));
  const bb = enc.encode(String(b));
  if (ab.length !== bb.length) {
    // porównaj b z samym sobą, by czas nie zdradzał długości
    let d = 1;
    for (let i = 0; i < bb.length; i++) d |= bb[i] ^ bb[i];
    return false;
  }
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}
