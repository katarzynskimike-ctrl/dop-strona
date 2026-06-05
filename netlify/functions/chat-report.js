/**
 * DOP Chat Report — Netlify Scheduled Function
 * Cron: każdy poniedziałek 8:00 (Europe/Warsaw)
 * Pobiera ostatnie pytania z listy Brevo "chat_questions" (id 11)
 * Agreguje + wysyła email do biuro@doskonalaobslugapacjenta.pl
 *
 * Konfiguracja schedule w netlify.toml:
 * [[plugins]] / [functions."chat-report"] schedule = "0 6 * * 1"  (UTC pon 6:00 = PL pon 8:00 CET / 7:00 CEST)
 */

const BREVO_API = 'https://api.brevo.com/v3';
const LIST_ID = 11; // chat_questions
const REPORT_RECIPIENT = 'biuro@doskonalaobslugapacjenta.pl';
const REPORT_SENDER = { name: 'DOP Chat Analytics', email: 'forms@doskonalaobslugapacjenta.pl' };

exports.handler = async (event) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { statusCode: 500, body: 'BREVO_API_KEY missing' };

  try {
    // Pobierz contacts z ostatnich 7 dni
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sinceISO = since.toISOString().slice(0, 19);

    // Brevo list contacts API
    let allContacts = [];
    let offset = 0;
    const limit = 100;
    while (allContacts.length < 500) {
      const r = await fetch(`${BREVO_API}/contacts/lists/${LIST_ID}/contacts?limit=${limit}&offset=${offset}&modifiedSince=${encodeURIComponent(sinceISO)}`, {
        headers: { 'api-key': apiKey, 'accept': 'application/json' }
      });
      if (!r.ok) {
        const errBody = await r.text();
        return { statusCode: 502, body: `Brevo list fetch failed: ${r.status} ${errBody.substring(0, 200)}` };
      }
      const data = await r.json();
      const contacts = data.contacts || [];
      if (contacts.length === 0) break;
      allContacts = allContacts.concat(contacts);
      if (contacts.length < limit) break;
      offset += limit;
    }

    if (allContacts.length === 0) {
      return { statusCode: 200, body: 'No new chat questions this week — no report sent.' };
    }

    // Wyciągnij pytania (attribute QUESTION)
    const questions = allContacts
      .filter(c => c.attributes && c.attributes.QUESTION)
      .map(c => ({
        question: c.attributes.QUESTION,
        email: c.attributes.EMAIL || c.email || 'anonymous',
        page: c.attributes.PAGE || '?',
        source: c.attributes.SOURCE || '?',
        date: c.createdAt || c.modifiedAt || ''
      }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (questions.length === 0) {
      return { statusCode: 200, body: 'No questions in chat list this week.' };
    }

    // Agregacja: pogrupuj po słowach kluczowych
    const topics = {};
    const keywords = ['kurs', 'cena', 'rata', 'akademia', 'audyt', 'kalendarz', 'higien', 'rejestracj', 'plan', 'konsultacj', 'zamknięt', 'wyc', 'rozmow', 'kont', 'fakt', 'Michał'];
    questions.forEach(q => {
      const qLow = (q.question || '').toLowerCase();
      keywords.forEach(k => {
        if (qLow.indexOf(k.toLowerCase()) >= 0) {
          topics[k] = (topics[k] || 0) + 1;
        }
      });
    });
    const topicsSorted = Object.entries(topics).sort((a, b) => b[1] - a[1]);

    // Top 20 ostatnich pytań w pełni
    const top20 = questions.slice(0, 20);

    const dateRange = `${since.toISOString().slice(0, 10)} → ${new Date().toISOString().slice(0, 10)}`;

    // HTML email
    const rowsTopics = topicsSorted
      .map(([k, n]) => `<tr><td style="padding:6px 12px;font-size:14px;color:#1A1A1A">${escapeHtml(k)}</td><td style="padding:6px 12px;font-size:14px;font-weight:700;color:#C9A24A;text-align:right">${n}</td></tr>`)
      .join('');

    const rowsQuestions = top20
      .map((q, i) => `<tr><td style="padding:10px 12px;font-size:11px;color:#5F5E5A;vertical-align:top;width:30px">${i + 1}</td><td style="padding:10px 12px;font-size:14px;color:#1A1A1A;line-height:1.5"><strong style="color:#1B2C4F">${escapeHtml(q.question.substring(0, 250))}</strong><br><span style="font-size:11px;color:#5F5E5A">${escapeHtml(q.email)} · ${escapeHtml(q.page)} · ${escapeHtml((q.date || '').substring(0, 10))}</span></td></tr>`)
      .join('');

    const html = `<table width="100%" style="background:#F5F3EE;padding:24px;font-family:'Figtree',sans-serif"><tr><td align="center"><table width="700" style="background:#FFF;border-radius:12px;overflow:hidden"><tr><td style="background:#1B2C4F;color:#FFF;padding:28px 32px">
<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#C9A24A;margin-bottom:6px">DOP Chat Analytics · raport tygodniowy</div>
<div style="font-family:Georgia,serif;font-size:26px;font-style:italic;color:#FFF;margin-bottom:4px">${questions.length} pytań w ostatnich 7 dniach</div>
<div style="font-size:13px;color:rgba(255,255,255,.75)">${dateRange}</div>
</td></tr><tr><td style="padding:24px 32px">
<h2 style="font-family:Georgia,serif;font-size:20px;color:#1B2C4F;margin:0 0 14px">Top tematy (słowa kluczowe)</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:28px">${rowsTopics || '<tr><td colspan="2" style="font-size:14px;color:#5F5E5A">Brak rozpoznanych tematów</td></tr>'}</table>
<h2 style="font-family:Georgia,serif;font-size:20px;color:#1B2C4F;margin:0 0 14px">Top ${top20.length} ostatnich pytań</h2>
<table style="width:100%;border-collapse:collapse">${rowsQuestions}</table>
<p style="margin-top:28px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#5F5E5A">
<strong>Sugestia:</strong> sprawdź pytania bez dobrej odpowiedzi w Brevo (lista <em>chat_questions</em>, ID ${LIST_ID}). Pytania niepasujące do żadnego wzorca → fallback "porozmawiajmy 15 minut".
</p>
</td></tr></table></td></tr></table>`;

    // Wyślij email transakcyjny via Brevo
    const sendResp = await fetch(`${BREVO_API}/smtp/email`, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'accept': 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: REPORT_SENDER,
        to: [{ email: REPORT_RECIPIENT, name: 'Michał Katarzyński' }],
        subject: `[DOP Chat] ${questions.length} pytań · ${dateRange}`,
        htmlContent: html
      })
    });
    if (!sendResp.ok) {
      const errBody = await sendResp.text();
      return { statusCode: 502, body: `Email send failed: ${sendResp.status} ${errBody.substring(0, 200)}` };
    }

    return { statusCode: 200, body: `Report sent: ${questions.length} questions, ${topicsSorted.length} topics.` };
  } catch (e) {
    return { statusCode: 500, body: 'Error: ' + (e.message || String(e)) };
  }
};

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
