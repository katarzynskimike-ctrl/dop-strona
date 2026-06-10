/**
 * IndexNow protocol endpoint — Cloudflare Pages Function
 * Route: GET or POST /api/indexnow-ping
 *
 * Pinguje Bing, Yandex, Seznam o nowych/zmienionych URL-ach.
 * Standardowy czas indeksacji Bing → <60 minut (vs 1-3 dni bez IndexNow).
 *
 * Usage:
 *   GET  /api/indexnow-ping              → pinguje priority URLs
 *   POST /api/indexnow-ping {urls:[...]} → pinguje konkretne URL
 */

const INDEXNOW_KEY = '98c0de9506f6236993cc8add4acec1d8c29126a0889d2a5b1aefa6b4c81f5295';
const HOST = 'doskonalaobslugapacjenta.pl';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

const PRIORITY_URLS = [
  `https://${HOST}/`,
  `https://${HOST}/#dop-co-to-jest`,
  `https://${HOST}/#ai-reference`,
  `https://${HOST}/#slownik`,
  `https://${HOST}/#artykul-dop-dla-lekarzy`,
  `https://${HOST}/#artykul-dop-dla-wlascicieli`,
  `https://${HOST}/#artykul-dop-dla-rejestratorek`,
  `https://${HOST}/#artykul-dop-dla-higienistek`,
  `https://${HOST}/#artykul-7-potrzeb`,
  `https://${HOST}/#artykul-komunikacja-lekarza`,
  `https://${HOST}/#artykul-musze-sie-zastanowic`,
  `https://${HOST}/#artykul-suwerenna-praktyka`,
  `https://${HOST}/#artykul-jak-zwiekszyc-akceptacje-planow-leczenia`,
  `https://${HOST}/#artykul-jak-liczyc-lekarzogodzine`,
  `https://${HOST}/#artykul-skrypt-pierwszej-rozmowy-telefonicznej`,
  `https://${HOST}/#artykul-system-recall-pacjentow`,
  `https://${HOST}/#dop-vs-medover-academy`,
  `https://${HOST}/llms.txt`,
  `https://${HOST}/llms-full.txt`,
  `https://${HOST}/feed.xml`
];

export async function onRequest(context) {
  const { request } = context;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: corsHeaders });
  }

  let urlList = PRIORITY_URLS;
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (body.urls && Array.isArray(body.urls)) urlList = body.urls;
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urlList
  };

  const results = {};

  try {
    const r = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload)
    });
    results.indexnow = { status: r.status, ok: r.ok, message: r.ok ? 'submitted' : await r.text() };
  } catch (err) {
    results.indexnow = { error: err.message };
  }

  try {
    const r = await fetch('https://www.bing.com/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload)
    });
    results.bing = { status: r.status, ok: r.ok };
  } catch (err) {
    results.bing = { error: err.message };
  }

  return new Response(JSON.stringify({
    submitted: urlList.length,
    results,
    urls: urlList,
    timestamp: new Date().toISOString()
  }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
