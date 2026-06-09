/**
 * DOP Lead Capture — Netlify Function
 * Route: POST /.netlify/functions/lead (lub /api/lead przez _redirects)
 * Env: BREVO_API_KEY, ALLOWED_ORIGIN
 */

const formsConfig = require('../../forms-config.json');
const BREVO_API = 'https://api.brevo.com/v3';

exports.handler = async (event) => {
 const headers = corsHeaders(event);
 if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
 if (event.httpMethod !== 'POST') return jsonResp({ ok: false, error: 'Method not allowed' }, 405, headers);

 const apiKey = process.env.BREVO_API_KEY;
 if (!apiKey) return jsonResp({ ok: false, error: 'Server misconfigured' }, 500, headers);

 let payload;
 try { payload = JSON.parse(event.body || '{}'); }
 catch { return jsonResp({ ok: false, error: 'Invalid JSON' }, 400, headers); }

 const formId = String(payload.form_id || '').trim();
 const form = formsConfig.forms[formId];
 if (!form) return jsonResp({ ok: false, error: 'Unknown form_id: ' + formId }, 400, headers);

 if (payload._gotcha || payload.honeypot) {
  return jsonResp({ ok: true, message: form.success_message || 'OK' }, 200, headers);
 }

 const errors = [];
 const data = {};
 for (const field of form.fields) {
  const raw = payload[field.name] ?? payload[field.name.toLowerCase()] ?? '';
  const value = typeof raw === 'string' ? raw.trim() : raw;
  if (field.required && (value === '' || value == null)) {
   errors.push({ field: field.name, message: 'Pole "' + field.label + '" jest wymagane' }); continue;
  }
  if (value === '' || value == null) continue;
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
   errors.push({ field: field.name, message: 'Wprowadź poprawny adres email' }); continue;
  }
  if (field.type === 'tel' && !/^[\+0-9\s\-\(\)]{9,}$/.test(value)) {
   errors.push({ field: field.name, message: 'Wprowadź poprawny numer telefonu' }); continue;
  }
  if (field.pattern && !new RegExp(field.pattern).test(value)) {
   errors.push({ field: field.name, message: 'Nieprawidłowy format pola "' + field.label + '"' }); continue;
  }
  if (field.max && String(value).length > field.max) {
   errors.push({ field: field.name, message: '"' + field.label + '" — max ' + field.max + ' znaków' }); continue;
  }
  if (field.type === 'number') {
   const n = Number(value);
   if (Number.isNaN(n)) { errors.push({ field: field.name, message: '"' + field.label + '" musi być liczbą' }); continue; }
   data[field.name] = n; continue;
  }
  data[field.name] = value;
 }
 if (errors.length > 0) return jsonResp({ ok: false, error: 'Validation failed', errors }, 400, headers);

 const email = String(data.EMAIL || '').toLowerCase();
 if (!email) return jsonResp({ ok: false, error: 'Email is required', field: 'EMAIL' }, 400, headers);

 const hidden = Object.assign({}, form.hidden || {});
 const ALLOWED = ['SOURCE', 'KURS_SLUG', 'KURS_NAME', 'KURS_PRICE', 'LEAD_TYPE', 'HOT_LEAD', 'LEAD_MAGNET', 'INTENT'];
 for (const key of ALLOWED) {
  if (payload[key] != null && payload[key] !== '') hidden[key] = payload[key];
 }

 const listEntry = formsConfig.lists[form.list];
 if (!listEntry || !listEntry.id) return jsonResp({ ok: false, error: 'List ID missing' }, 500, headers);

 const attributes = {};
 for (const [k, v] of Object.entries(data)) { if (k !== 'EMAIL') attributes[k] = v; }
 for (const [k, v] of Object.entries(hidden)) { attributes[k] = v; }
 attributes.SIGNUP_DATE = new Date().toISOString().slice(0, 10);
 attributes.SIGNUP_TIMESTAMP = new Date().toISOString();

 // PDF tracking — gdy form_id=lead-magnet, oznacz że dostali e-book
 if (formId === 'lead-magnet') {
  attributes.PDF_SENT_AT = new Date().toISOString();
  attributes.PDF_VERSION = 'v6'; // bump przy każdym nowym PDF
 }

 try {
  const r = await fetch(BREVO_API + '/contacts', {
   method: 'POST',
   headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
   body: JSON.stringify({ email, listIds: [listEntry.id], updateEnabled: true, attributes })
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok && !(r.status === 400 && body.code === 'duplicate_parameter')) {
   return jsonResp({ ok: false, error: 'Brevo rejected', details: body.message, code: body.code }, 502, headers);
  }
 } catch (e) {
  return jsonResp({ ok: false, error: 'Brak połączenia z CRM' }, 502, headers);
 }

 if (form.notification_email) {
  try { await sendNotif({ apiKey, to: form.notification_email, formId, formName: formName(formId, hidden), leadEmail: email, fields: data, hidden }); }
  catch (e) { console.error('Notif error (non-fatal):', e); }
 }

 // ── LEAD MAGNET: auto-deliver e-book PDF ──
 if (formId === 'lead-magnet') {
  try { await deliverLeadMagnet({ apiKey, leadEmail: email, firstName: data.FIRSTNAME || '' }); }
  catch (e) { console.error('Lead magnet delivery error (non-fatal):', e); }
 }

 return jsonResp({ ok: true, message: form.success_message || 'Zapisano' }, 200, headers);
};

/**
 * Wysyła e-book PDF (link) na email pacjenta zaraz po zapisie.
 * Hosting PDF: https://doskonalaobslugapacjenta.pl/ebook-10bledow.pdf
 * Backup URL (Netlify): https://starlit-fudge-becf5f.netlify.app/ebook-10bledow.pdf
 */
async function deliverLeadMagnet({ apiKey, leadEmail, firstName }) {
 // Tymczasowo Netlify URL — migracja domeny doskonalaobslugapacjenta.pl w toku
 const SITE_URL = process.env.SITE_URL || 'https://starlit-fudge-becf5f.netlify.app';
 const PDF_URL = SITE_URL + '/ebook-10bledow.pdf';
 const greeting = firstName ? ('Witaj ' + firstName + '!') : 'Witaj!';
 const subject = '[DOP] Twój e-book: 10 błędów przez które pacjent mówi „muszę się zastanowić"';
 const html = `<table width="100%" style="background:#F5F3EE;padding:24px;font-family:'Figtree',Arial,sans-serif"><tr><td align="center"><table width="600" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(15,27,48,.08)">
<tr><td style="background:linear-gradient(135deg,#1B2C4F 0%,#0F1B30 100%);color:#FFFFFF;padding:36px 32px;text-align:center">
 <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#C9A24A;margin-bottom:10px;font-weight:700">E-book DOP · 27 stron</div>
 <div style="font-family:Georgia,serif;font-size:32px;color:#FFFFFF;line-height:1.1;margin-bottom:8px">10 błędów,</div>
 <div style="font-family:Georgia,serif;font-size:22px;font-style:italic;color:#D9B560;line-height:1.2">przez które pacjent mówi „muszę się zastanowić"</div>
</td></tr>
<tr><td style="padding:32px">
 <p style="font-size:18px;color:#1A1A1A;margin:0 0 16px;line-height:1.5"><strong>${escapeHtml(greeting)}</strong></p>
 <p style="font-size:15px;color:#1A1A1A;line-height:1.65;margin:0 0 18px">Dzięki, że pobierasz mój e-book. To 27-stronicowy wyciąg z mojej książki <em>„Dlaczego pacjenci mówią TAK"</em> — analiza 10 najczęstszych błędów, które obserwuję w polskich praktykach stomatologicznych od 14 lat.</p>
 <p style="font-size:15px;color:#1A1A1A;line-height:1.65;margin:0 0 28px">Każdy z 10 błędów ma diagnozę, autentyczny cytat z mojej książki, 5 konkretnych narzędzi do wdrożenia od jutra oraz „czerwoną flagę" dla Twojego zespołu.</p>

 <div style="text-align:center;margin:28px 0">
  <a href="${PDF_URL}" style="display:inline-block;background:#C9A24A;color:#FFFFFF;text-decoration:none;padding:16px 32px;border-radius:10px;font-size:15px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 6px 16px -4px rgba(201,162,74,.4)">📖 Pobierz e-book (PDF)</a>
 </div>
 <p style="font-size:12px;color:#5F5E5A;text-align:center;margin:0 0 28px">Link bezpośredni: <a href="${PDF_URL}" style="color:#C9A24A;word-break:break-all">${PDF_URL}</a></p>

 <div style="border-top:1px solid #eee;padding-top:24px;margin-top:8px">
  <p style="font-size:13px;color:#5F5E5A;line-height:1.6;margin:0 0 12px"><strong style="color:#1B2C4F">Co dalej?</strong></p>
  <p style="font-size:14px;color:#1A1A1A;line-height:1.6;margin:0 0 14px">Jeśli po przeczytaniu zechcesz porozmawiać — <a href="${SITE_URL}/#audyt-doradczy" style="color:#C9A24A;font-weight:700;text-decoration:none">15 minut bezpłatnie</a>, opowiesz mi o swojej praktyce, podpowiem najkrótszą ścieżkę.</p>
  <p style="font-size:14px;color:#1A1A1A;line-height:1.6;margin:0">Albo zacznij od ścieżki, która Ci pasuje:</p>
  <ul style="font-size:14px;color:#1A1A1A;line-height:1.8;margin:8px 0 0;padding-left:20px">
   <li><a href="${SITE_URL}/#akademia" style="color:#C9A24A;font-weight:600;text-decoration:none">Akademia Online</a> — 12 kursów video + Q&A live, 8 990 zł/rok</li>
   <li><a href="${SITE_URL}/#kalendarz" style="color:#C9A24A;font-weight:600;text-decoration:none">Kursy stacjonarne w Warszawie</a> — od 1 690 zł/os.</li>
   <li><a href="${SITE_URL}/#kurs-zamkniety-wl" style="color:#C9A24A;font-weight:600;text-decoration:none">Kurs zamknięty in-house</a> — dla całego zespołu</li>
  </ul>
 </div>

 <p style="margin-top:36px;font-size:14px;color:#1A1A1A;line-height:1.5">Powodzenia we wdrażaniu,<br><strong style="color:#1B2C4F;font-family:Georgia,serif;font-size:18px">— Michał Katarzyński</strong><br><span style="font-size:12px;color:#5F5E5A">autor systemu Doskonała Obsługa Pacjenta</span></p>
</td></tr>
<tr><td style="background:#F5F3EE;padding:18px 32px;text-align:center;font-size:11px;color:#5F5E5A">
 © 2026 Excellent Patient Service sp. z o.o. · <a href="${SITE_URL}" style="color:#5F5E5A">doskonalaobslugapacjenta.pl</a><br>
 Otrzymujesz tę wiadomość, bo zapisałeś/aś się na e-book DOP. <a href="${SITE_URL}/wypisz" style="color:#5F5E5A">Wypisz się</a>
</td></tr>
</table></td></tr></table>`;

 const r = await fetch(BREVO_API + '/smtp/email', {
  method: 'POST',
  headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
  body: JSON.stringify({
   sender: { name: 'Michał Katarzyński · DOP', email: 'forms@doskonalaobslugapacjenta.pl' },
   to: [{ email: leadEmail, name: firstName || '' }],
   replyTo: { email: 'biuro@doskonalaobslugapacjenta.pl', name: 'Michał Katarzyński' },
   subject, htmlContent: html
  })
 });
 if (!r.ok) throw new Error('Brevo SMTP ' + r.status + ': ' + (await r.text()));
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function corsHeaders(event) {
 const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
 const allowed = process.env.ALLOWED_ORIGIN || '*';
 return {
  'Access-Control-Allow-Origin': allowed === '*' ? '*' : (origin === allowed ? origin : 'null'),
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin'
 };
}

function jsonResp(body, status, extra) {
 return { statusCode: status, headers: Object.assign({ 'Content-Type': 'application/json' }, extra || {}), body: JSON.stringify(body) };
}

function formName(formId, hidden) {
 if (formId === 'enroll' && hidden.KURS_NAME) return 'Zapis: ' + hidden.KURS_NAME;
 if (formId === 'kurs-zamkniety') {
  const v = hidden.SOURCE || '';
  if (v.endsWith('-wl')) return 'Kurs zamknięty — Właściciele';
  if (v.endsWith('-lek')) return 'Kurs zamknięty — Lekarze';
  if (v.endsWith('-rec')) return 'Kurs zamknięty — Rejestracja';
  return 'Kurs zamknięty';
 }
 return ({ 'newsletter': 'Newsletter', 'lead-magnet': 'Lead magnet — E-book', 'audyt-praktyki': 'Audyt praktyki', 'audyt-doradczy': 'Audyt doradczy — email', 'kontakt': 'Kontakt ogólny' })[formId] || formId;
}

async function sendNotif({ apiKey, to, formName, leadEmail, fields, hidden }) {
 const isHot = hidden.HOT_LEAD === 'true' || hidden.HOT_LEAD === true;
 const tag = isHot ? '🔥 [Pilne zapytanie]' : '[Nowe zapytanie]';
 const labels = { FIRSTNAME:'Imię', LASTNAME:'Nazwisko', EMAIL:'Email', PHONE:'Telefon', KLINIKA_NAZWA:'Klinika', KLINIKA_LOKALIZACJA:'Lokalizacja', NIP:'NIP', LICZBA_OSOB:'Liczba osób', PREF_TERMIN:'Pref. termin', WIADOMOSC:'Wiadomość', TEMAT:'Temat' };
 const rows = [];
 for (const [k, v] of Object.entries(fields)) {
  if (k === 'EMAIL') continue;
  rows.push('<tr><td style="padding:6px 12px 6px 0;color:#5F5E5A;font-size:13px;vertical-align:top">' + (labels[k]||k) + '</td><td style="padding:6px 0;font-size:14px;color:#1A1A1A">' + String(v).replace(/</g,'&lt;') + '</td></tr>');
 }
 const sourceInfo = hidden.SOURCE ? ' · ' + hidden.SOURCE : '';
 const kursInfo = hidden.KURS_NAME ? ' · ' + hidden.KURS_NAME + ' (' + (hidden.KURS_PRICE || 'wycena') + ' zł)' : '';
 const subject = tag + ' ' + formName + kursInfo + ': ' + leadEmail;
 const html = '<table width="100%" style="background:#F5F3EE;padding:24px"><tr><td align="center"><table width="600" style="background:#FFF;border-radius:12px;overflow:hidden"><tr><td style="background:#1B2C4F;color:#FFF;padding:24px"><div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#C9A24A;margin-bottom:6px">' + tag + sourceInfo + '</div><div style="font-family:Georgia,serif;font-size:22px;color:#FFF">Nowe zgłoszenie: ' + formName + '</div></td></tr><tr><td style="padding:24px"><table style="width:100%"><tr><td style="padding:0 12px 0 0;color:#5F5E5A;font-size:13px">Email</td><td style="font-size:14px"><a href="mailto:' + leadEmail + '" style="color:#C9A24A;text-decoration:none;font-weight:700">' + leadEmail + '</a></td></tr>' + rows.join('') + '</table></td></tr></table></td></tr></table>';
 const r = await fetch(BREVO_API + '/smtp/email', {
  method: 'POST',
  headers: { 'accept':'application/json', 'content-type':'application/json', 'api-key':apiKey },
  body: JSON.stringify({
   sender: { name: 'DOP Forms', email: 'forms@doskonalaobslugapacjenta.pl' },
   to: [{ email: to }],
   replyTo: { email: leadEmail },
   subject, htmlContent: html
  })
 });
 if (!r.ok) throw new Error('Brevo SMTP ' + r.status + ': ' + (await r.text()));
}
