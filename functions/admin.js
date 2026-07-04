/**
 * DOP Admin — panel "kto zapisał się na kursy"
 * Route: GET /admin  (Pages Function ma pierwszeństwo przed SPA fallback z _redirects)
 * HTML inline — bez auth na poziomie strony; dane wymagają ADMIN_TOKEN (patrz /api/admin/leads).
 * Brandbook DOP: granat #1B2C4F, złoto #C9A24A, Figtree + Georgia.
 */

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }
  return new Response(HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer'
    }
  });
}

const HTML = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>DOP · Panel zapisów</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --navy:#1B2C4F; --navy-dark:#0F1B30; --gold:#C9A24A; --gold-light:#D9B560;
    --cream:#F5F3EE; --ink:#1A1A1A; --muted:#5F5E5A; --line:#ECE9E0; --white:#FFFFFF;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Figtree',Arial,sans-serif;background:var(--cream);color:var(--ink);min-height:100vh}
  header{background:linear-gradient(135deg,var(--navy) 0%,var(--navy-dark) 100%);padding:28px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
  header .eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:6px}
  header h1{font-family:Georgia,serif;font-size:26px;color:rgba(255,255,255,.96);font-weight:400}
  .hbtns{display:flex;gap:10px}
  .btn{display:inline-block;border:none;cursor:pointer;border-radius:10px;font-family:'Figtree',Arial,sans-serif;font-size:13px;font-weight:700;padding:10px 18px;transition:opacity .15s}
  .btn:hover{opacity:.88}
  .btn-gold{background:var(--gold);color:var(--white)}
  .btn-ghost{background:rgba(255,255,255,.12);color:rgba(255,255,255,.85)}
  main{max-width:1280px;margin:0 auto;padding:28px 24px 64px}

  /* Login */
  .login-card{max-width:420px;margin:64px auto;background:var(--white);border-radius:12px;box-shadow:0 4px 16px rgba(15,27,48,.08);padding:36px}
  .login-card h2{font-family:Georgia,serif;font-size:22px;color:var(--navy);margin-bottom:8px}
  .login-card p{font-size:14px;color:var(--muted);margin-bottom:20px;line-height:1.5}
  .login-card input{width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-size:14px;font-family:inherit;margin-bottom:14px}
  .login-card input:focus{outline:2px solid var(--gold);border-color:var(--gold)}
  .login-err{color:#B3261E;font-size:13px;margin-bottom:12px;display:none}

  /* Stats */
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:22px}
  .stat{background:var(--white);border-radius:12px;padding:18px 20px;box-shadow:0 2px 8px rgba(15,27,48,.05)}
  .stat .num{font-family:Georgia,serif;font-size:30px;color:var(--navy)}
  .stat .lbl{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:4px}

  /* Toolbar */
  .toolbar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
  .toolbar input,.toolbar select{padding:10px 14px;border:1px solid var(--line);border-radius:10px;font-size:14px;font-family:inherit;background:var(--white)}
  .toolbar input{flex:1;min-width:220px}
  .toolbar input:focus,.toolbar select:focus{outline:2px solid var(--gold);border-color:var(--gold)}

  /* Table */
  .tablewrap{background:var(--white);border-radius:12px;box-shadow:0 4px 16px rgba(15,27,48,.08);overflow-x:auto}
  table{width:100%;border-collapse:collapse;font-size:13px;min-width:1100px}
  thead th{background:var(--navy);color:rgba(255,255,255,.92);text-align:left;padding:12px 14px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;position:sticky;top:0}
  tbody td{padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:top}
  tbody tr:hover{background:#FBF9F4}
  td.nowrap{white-space:nowrap}
  .badge{display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
  .b-vat{background:#EAF2EA;color:#2E5C33}
  .b-paragon{background:#F0EDE5;color:#6B5B2E}
  .b-proforma{background:#E9EDF5;color:var(--navy)}
  .b-faktura{background:#F5E9D8;color:#8A6A1F}
  .empty{padding:48px;text-align:center;color:var(--muted);font-size:15px}
  .small{font-size:12px;color:var(--muted)}
  footer{text-align:center;font-size:12px;color:var(--muted);padding:24px}
  @media (max-width:640px){ header{padding:20px 16px} main{padding:20px 12px 48px} }
</style>
</head>
<body>
<header>
  <div>
    <div class="eyebrow">Doskonała Obsługa Pacjenta · Admin</div>
    <h1>Zapisy na kursy otwarte</h1>
  </div>
  <div class="hbtns" id="hbtns" style="display:none">
    <button class="btn btn-gold" id="csvBtn">⬇ Eksport CSV</button>
    <button class="btn btn-ghost" id="reloadBtn">Odśwież</button>
    <button class="btn btn-ghost" id="logoutBtn">Wyloguj</button>
  </div>
</header>

<main>
  <div id="login" class="login-card">
    <h2>Logowanie</h2>
    <p>Wklej token administratora (ADMIN_TOKEN z Cloudflare), aby zobaczyć listę zapisów.</p>
    <div class="login-err" id="loginErr">Nieprawidłowy token albo błąd serwera.</div>
    <input type="password" id="tokenInput" placeholder="Token administratora" autocomplete="off">
    <button class="btn btn-gold" id="loginBtn" style="width:100%">Zaloguj →</button>
  </div>

  <div id="app" style="display:none">
    <div class="stats" id="stats"></div>
    <div class="toolbar">
      <input type="search" id="q" placeholder="Szukaj: imię, nazwisko, email, NIP, dane faktury…">
      <select id="kursFilter"><option value="">Wszystkie kursy</option></select>
      <select id="dokFilter">
        <option value="">Dokument: wszystkie</option>
        <option value="faktura_vat">Faktura VAT</option>
        <option value="paragon">Paragon / imienna</option>
      </select>
    </div>
    <div class="tablewrap">
      <table>
        <thead><tr>
          <th>Data zapisu</th><th>Imię i nazwisko</th><th>Email</th><th>Telefon</th>
          <th>Kurs</th><th>Cena</th><th>Płatność</th><th>Dokument</th><th>NIP</th>
          <th>Dane do faktury</th><th>Pref. termin</th>
        </tr></thead>
        <tbody id="rows"></tbody>
      </table>
      <div class="empty" id="empty" style="display:none">Brak zapisów spełniających kryteria.</div>
    </div>
  </div>
</main>
<footer>Panel wewnętrzny DOP · dane z listy Brevo #9 · noindex</footer>

<script>
(function(){
  var LS_KEY = 'dop_admin_token';
  var ALL = [];
  var PRETTY_PLAT = { proforma:'Proforma', faktura:'Faktura z terminem' };
  var PRETTY_DOK  = { faktura_vat:'Faktura VAT', paragon:'Paragon / imienna' };

  function el(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function fetchLeads(token){
    return fetch('/api/admin/leads', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(j){ if(!j.ok) throw new Error(j.error || 'API error'); return j.contacts || []; });
  }

  function show(viewApp){
    el('login').style.display = viewApp ? 'none' : 'block';
    el('app').style.display   = viewApp ? 'block' : 'none';
    el('hbtns').style.display = viewApp ? 'flex'  : 'none';
  }

  function sortKey(c){ return c.signup_timestamp || c.signup_date || c.brevo_modified || ''; }

  function load(token, onErr){
    fetchLeads(token).then(function(contacts){
      contacts.sort(function(a,b){ return sortKey(b).localeCompare(sortKey(a)); });
      ALL = contacts;
      localStorage.setItem(LS_KEY, token);
      buildKursFilter(); render(); renderStats();
      show(true);
    }).catch(function(e){
      if (onErr) onErr(e);
      else { localStorage.removeItem(LS_KEY); show(false); }
    });
  }

  function buildKursFilter(){
    var sel = el('kursFilter');
    while (sel.options.length > 1) sel.remove(1);
    var seen = {};
    ALL.forEach(function(c){ if (c.kurs_name && !seen[c.kurs_name]) { seen[c.kurs_name] = 1; } });
    Object.keys(seen).sort().forEach(function(k){
      var o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o);
    });
  }

  function filtered(){
    var q = el('q').value.trim().toLowerCase();
    var fk = el('kursFilter').value;
    var fd = el('dokFilter').value;
    return ALL.filter(function(c){
      if (fk && c.kurs_name !== fk) return false;
      if (fd && c.dokument !== fd) return false;
      if (q) {
        var hay = [c.firstname, c.lastname, c.email, c.phone, c.nip, c.dane_faktury, c.kurs_name, c.pref_termin].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function fmtDate(c){
    var t = c.signup_timestamp || '';
    if (t) { return esc(t.slice(0,10)) + ' <span class="small">' + esc(t.slice(11,16)) + '</span>'; }
    return esc(c.signup_date || '—');
  }

  function render(){
    var rows = filtered();
    var tb = el('rows'); tb.innerHTML = '';
    el('empty').style.display = rows.length ? 'none' : 'block';
    var html = '';
    rows.forEach(function(c){
      var dok = c.dokument === 'faktura_vat'
        ? '<span class="badge b-vat">Faktura VAT</span>'
        : (c.dokument === 'paragon' ? '<span class="badge b-paragon">Paragon</span>' : esc(c.dokument||'—'));
      var plat = c.platnosc === 'proforma'
        ? '<span class="badge b-proforma">Proforma</span>'
        : (c.platnosc === 'faktura' ? '<span class="badge b-faktura">Termin płatności</span>' : esc(c.platnosc||'—'));
      html += '<tr>'
        + '<td class="nowrap">' + fmtDate(c) + '</td>'
        + '<td class="nowrap"><strong>' + esc((c.firstname + ' ' + c.lastname).trim() || '—') + '</strong></td>'
        + '<td><a href="mailto:' + esc(c.email) + '" style="color:#C9A24A;text-decoration:none;font-weight:600">' + esc(c.email) + '</a></td>'
        + '<td class="nowrap">' + esc(c.phone || '—') + '</td>'
        + '<td>' + esc(c.kurs_name || '—') + '</td>'
        + '<td class="nowrap">' + (c.kurs_price !== '' && c.kurs_price != null ? esc(c.kurs_price) + ' zł' : '—') + '</td>'
        + '<td>' + plat + '</td>'
        + '<td>' + dok + '</td>'
        + '<td class="nowrap">' + esc(c.nip || '—') + '</td>'
        + '<td style="max-width:260px">' + esc(c.dane_faktury || '—') + '</td>'
        + '<td>' + esc(c.pref_termin || '—') + '</td>'
        + '</tr>';
    });
    tb.innerHTML = html;
  }

  function renderStats(){
    var byKurs = {}, vat = 0, last = ALL.length ? (sortKey(ALL[0]).slice(0,10) || '—') : '—';
    ALL.forEach(function(c){
      if (c.kurs_name) byKurs[c.kurs_name] = (byKurs[c.kurs_name]||0) + 1;
      if (c.dokument === 'faktura_vat') vat++;
    });
    var topKurs = Object.keys(byKurs).sort(function(a,b){ return byKurs[b]-byKurs[a]; })[0];
    el('stats').innerHTML =
      '<div class="stat"><div class="num">' + ALL.length + '</div><div class="lbl">Zapisów łącznie</div></div>'
      + '<div class="stat"><div class="num">' + Object.keys(byKurs).length + '</div><div class="lbl">Kursów z zapisami</div></div>'
      + '<div class="stat"><div class="num">' + vat + '</div><div class="lbl">Faktur VAT</div></div>'
      + '<div class="stat"><div class="num" style="font-size:18px;padding-top:8px">' + esc(topKurs || '—') + '</div><div class="lbl">Najpopularniejszy kurs</div></div>'
      + '<div class="stat"><div class="num" style="font-size:18px;padding-top:8px">' + esc(last) + '</div><div class="lbl">Ostatni zapis</div></div>';
  }

  function exportCsv(){
    var rows = filtered();
    var head = ['Data zapisu','Imię','Nazwisko','Email','Telefon','Kurs','Cena','Płatność','Dokument','NIP','Dane do faktury','Preferowany termin','Źródło'];
    var lines = [head.join(';')];
    rows.forEach(function(c){
      var vals = [ (c.signup_timestamp || c.signup_date || ''), c.firstname, c.lastname, c.email, c.phone, c.kurs_name, c.kurs_price, (PRETTY_PLAT[c.platnosc] || c.platnosc), (PRETTY_DOK[c.dokument] || c.dokument), c.nip, c.dane_faktury, c.pref_termin, c.source ];
      lines.push(vals.map(function(v){
        v = String(v==null?'':v).replace(/"/g,'""').replace(/\\r?\\n/g,' ');
        return '"' + v + '"';
      }).join(';'));
    });
    var blob = new Blob(['\\uFEFF' + lines.join('\\r\\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dop-zapisy-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  // Events
  el('loginBtn').addEventListener('click', function(){
    var t = el('tokenInput').value.trim();
    if (!t) return;
    el('loginErr').style.display = 'none';
    load(t, function(){ el('loginErr').style.display = 'block'; });
  });
  el('tokenInput').addEventListener('keydown', function(e){ if (e.key === 'Enter') el('loginBtn').click(); });
  el('logoutBtn').addEventListener('click', function(){ localStorage.removeItem(LS_KEY); ALL = []; show(false); });
  el('reloadBtn').addEventListener('click', function(){ var t = localStorage.getItem(LS_KEY); if (t) load(t); });
  el('csvBtn').addEventListener('click', exportCsv);
  ['q','kursFilter','dokFilter'].forEach(function(id){ el(id).addEventListener('input', render); });

  // Auto-login z zapamiętanym tokenem
  var saved = localStorage.getItem(LS_KEY);
  if (saved) load(saved);
})();
</script>
</body>
</html>`;
