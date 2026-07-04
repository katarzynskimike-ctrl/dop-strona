/**
 * DOP Komunikator AI — Cloudflare Pages Function
 * Route: GET  /api/chat  -> { configured: bool, model } (widget sprawdza czy pokazać bąbelek)
 *        POST /api/chat  -> { messages:[{role,content}] } => { reply }
 *
 * Env (Cloudflare dashboard -> Settings -> Environment variables):
 *   - ANTHROPIC_API_KEY (Secret) — WYMAGANE do działania (bez niego widget jest ukryty)
 *   - CHAT_MODEL (Plain) — opcjonalne, domyślnie 'claude-haiku-4-5-20251001'
 *   - ALLOWED_ORIGIN (Plain) — opcjonalne, domyślnie '*'
 *
 * Zakres (guardrails): bot odpowiada WYŁĄCZNIE o ofercie/kursach DOP i zachęca do rozmowy.
 * Nie wymyśla cen/terminów, nie udziela porad medycznych.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TURNS = 12;          // ile ostatnich wiadomości bierzemy
const MAX_CHARS = 2000;        // limit długości pojedynczej wiadomości usera
const MAX_TOKENS = 600;        // limit długości odpowiedzi

// ── Rate limiting (ochrona przed nadużyciami kosztowymi publicznego endpointu) ──
// Best-effort, in-memory per isolate (bez dodatkowej infry). Łapie szybkie serie z jednego IP
// oraz globalny skok ruchu. Dla twardych gwarancji można później podpiąć KV / Rate Limiting binding.
const RL_WINDOW_MS = 60000;   // okno 60 s
const RL_MAX_PER_IP = 12;     // maks. wiadomości / minutę / IP
const RL_MAX_GLOBAL = 150;    // bezpiecznik: maks. wiadomości / minutę łącznie
const _rl = { perIp: new Map(), global: [] };
function rateLimited(ip) {
  const now = Date.now();
  _rl.global = _rl.global.filter(t => now - t < RL_WINDOW_MS);
  if (_rl.global.length >= RL_MAX_GLOBAL) return true;
  let arr = (_rl.perIp.get(ip) || []).filter(t => now - t < RL_WINDOW_MS);
  if (arr.length >= RL_MAX_PER_IP) { _rl.perIp.set(ip, arr); return true; }
  arr.push(now); _rl.perIp.set(ip, arr); _rl.global.push(now);
  if (_rl.perIp.size > 5000) { for (const [k, v] of _rl.perIp) { if (!v.length || now - v[v.length - 1] > RL_WINDOW_MS) _rl.perIp.delete(k); } }
  return false;
}

let _kbCache = null;
async function getKnowledge(env, request) {
  if (_kbCache) return _kbCache;
  const tryFetch = async (req) => { try { const r = await (env.ASSETS ? env.ASSETS.fetch(req) : fetch(req)); if (r.ok) return await r.text(); } catch (e) {} return null; };
  const url = new URL(request.url);
  let txt = await tryFetch(new Request(url.origin + '/llms-full.txt'));
  if (!txt) txt = await tryFetch(new Request(url.origin + '/llms.txt'));
  _kbCache = txt || '';
  return _kbCache;
}

function systemPrompt(kb) {
  return [
    "Jesteś asystentem AI na stronie \"Doskonała Obsługa Pacjenta\" (DOP) — autorskiego systemu szkoleń dla praktyk stomatologicznych Michała Katarzyńskiego.",
    "Twoja rola: pomagać zainteresowanym ofertą — odpowiadać na pytania o kursy, szkolenia, dla kogo są, formaty i ceny — oraz zachęcać do rozmowy lub umówienia spotkania.",
    "",
    "ZASADY (przestrzegaj bezwzględnie):",
    "1. Odpowiadasz WYŁĄCZNIE na podstawie WIEDZY poniżej i tylko w temacie oferty/kursów DOP oraz tego, jak zacząć współpracę.",
    "2. Jeśli pytanie jest spoza tego zakresu (porada medyczna/stomatologiczna, diagnoza, tematy niezwiązane z ofertą) — uprzejmie wyjaśnij, że pomagasz w sprawach kursów i oferty, i zaproponuj rozmowę.",
    "3. NIE wymyślaj cen, terminów, nazwisk ani faktów. Jeśli czegoś nie ma w WIEDZY — powiedz wprost, że najlepiej ustalić to w rozmowie, i zaproponuj kontakt.",
    "4. Nie udzielasz porad medycznych ani stomatologicznych.",
    "5. Pisz po polsku, ciepło i zwięźle (zwykle 2–5 zdań). Mów do właściciela praktyki / uczestnika kursu.",
    "6. Gdy ktoś jest zainteresowany lub pyta o cenę/termin/zapis — zaproponuj umówienie rozmowy i zaznacz, że może kliknąć przycisk \"Umów rozmowę\" w tym oknie. Nie podawaj numerów ani e‑maili z pamięci.",
    "7. Nie obiecuj efektów ani rzeczy, których nie ma w WIEDZY.",
    "",
    "=== WIEDZA O OFERCIE DOP ===",
    kb || "(baza wiedzy chwilowo niedostępna — kieruj rozmowę do kontaktu/umówienia rozmowy)"
  ].join("\n");
}

export async function onRequest(context) {
  const { request, env } = context;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response('', { status: 204, headers });

  const apiKey = (env.ANTHROPIC_API_KEY || '').trim();
  const model = (env.CHAT_MODEL || DEFAULT_MODEL).trim();

  // GET -> status konfiguracji (widget decyduje czy się pokazać)
  if (request.method === 'GET') {
    return jsonResp({ configured: !!apiKey, model: apiKey ? model : null }, 200, headers);
  }
  if (request.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405, headers);
  if (!apiKey) return jsonResp({ error: 'not_configured', reply: 'Asystent jest chwilowo niedostępny. Kliknij „Umów rozmowę", a odezwiemy się osobiście.' }, 503, headers);

  // Rate limit — po potwierdzeniu POST + klucza, przed parsowaniem i żądaniem do API
  const _ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
  if (rateLimited(_ip)) {
    return jsonResp({ error: 'rate_limited', reply: 'Sporo pytań w krótkim czasie — daj mi chwilę i spróbuj ponownie, albo kliknij „Umów rozmowę".' }, 429, headers);
  }

  let payload;
  try { payload = await request.json(); } catch { return jsonResp({ error: 'Invalid JSON' }, 400, headers); }
  if (payload && payload.honeypot) return jsonResp({ reply: 'Dziękuję!' }, 200, headers);

  let messages = Array.isArray(payload && payload.messages) ? payload.messages : [];
  messages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map(m => ({ role: m.role, content: String(m.content).slice(0, MAX_CHARS) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return jsonResp({ error: 'Brak wiadomości' }, 400, headers);
  }

  const kb = await getKnowledge(env, request);
  try {
    const r = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system: systemPrompt(kb), messages })
    });
    if (!r.ok) {
      const errTxt = await r.text().catch(() => '');
      console.warn('Anthropic error', r.status, errTxt.slice(0, 300));
      return jsonResp({ error: 'upstream', reply: 'Przepraszam, mam chwilowy problem techniczny. Kliknij „Umów rozmowę" — chętnie pomożemy osobiście.' }, 502, headers);
    }
    const data = await r.json();
    const reply = (data && data.content && data.content[0] && data.content[0].text) ? data.content[0].text.trim() : 'Najlepiej omówić to w rozmowie — kliknij „Umów rozmowę".';
    return jsonResp({ reply }, 200, headers);
  } catch (e) {
    console.warn('chat fn error', e && e.message);
    return jsonResp({ error: 'exception', reply: 'Przepraszam, coś poszło nie tak. Kliknij „Umów rozmowę", a odezwiemy się osobiście.' }, 500, headers);
  }
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': allowed === '*' ? '*' : (origin === allowed ? origin : 'null'),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}
function jsonResp(body, status, extra) {
  return new Response(JSON.stringify(body), { status, headers: Object.assign({ 'Content-Type': 'application/json' }, extra || {}) });
}
