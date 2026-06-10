// IndexNow protocol endpoint
// Pinguje Bing, Yandex, Seznam, Naver o nowych/zmienionych URL-ach
// Standardowy czas indeksacji Bing → <60 minut (vs 1-3 dni bez IndexNow)
//
// Usage:
//   GET  /api/indexnow-ping              → pinguje wszystkie URL z sitemap
//   POST /api/indexnow-ping {urls:[...]} → pinguje konkretne URL
//
// IndexNow key file: /98c0de9506f6236993cc8add4acec1d8c29126a0889d2a5b1aefa6b4c81f5295.txt

const INDEXNOW_KEY = '98c0de9506f6236993cc8add4acec1d8c29126a0889d2a5b1aefa6b4c81f5295';
const HOST = 'doskonalaobslugapacjenta.pl';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

// Hardcoded list of priority URLs (te najważniejsze dla GEO)
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

exports.handler = async (event) => {
  // CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // Determine URLs to ping
  let urlList = PRIORITY_URLS;
  if (event.httpMethod === 'POST' && event.body) {
    try {
      const body = JSON.parse(event.body);
      if (body.urls && Array.isArray(body.urls)) {
        urlList = body.urls;
      }
    } catch (e) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }
  }

  // IndexNow payload
  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urlList
  };

  // Ping IndexNow (main aggregator — pinguje wszystkie engines)
  const results = {};

  try {
    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': 'api.indexnow.org'
      },
      body: JSON.stringify(payload)
    });
    results.indexnow = {
      status: response.status,
      ok: response.ok,
      message: response.ok ? 'URLs submitted successfully' : await response.text()
    };
  } catch (err) {
    results.indexnow = { error: err.message };
  }

  // Optionally ping Bing direct (backup)
  try {
    const bingResponse = await fetch('https://www.bing.com/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload)
    });
    results.bing = {
      status: bingResponse.status,
      ok: bingResponse.ok
    };
  } catch (err) {
    results.bing = { error: err.message };
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submitted: urlList.length,
      results: results,
      urls: urlList,
      timestamp: new Date().toISOString()
    }, null, 2)
  };
};
