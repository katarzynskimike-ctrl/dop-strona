# Migracja na Cloudflare Pages — instrukcja krok po kroku

**Czas:** 15 minut. **Koszt:** 0 zł na zawsze. **Bandwidth:** unlimited.

Wszystkie pliki konfiguracyjne (`_headers`, `_redirects`, `functions/api/lead.js`, `functions/api/indexnow-ping.js`) są już w repo i kompatybilne z Cloudflare Pages. Wystarczy podłączyć repo do Cloudflare.

---

## Krok 1 — Zaloguj się do Cloudflare (2 min)

1. Wejdź na **https://dash.cloudflare.com**
2. Jeśli nie masz konta — załóż (free)
3. Z lewego menu wybierz: **Workers & Pages**

## Krok 2 — Utwórz nowy projekt Pages (5 min)

1. Kliknij **Create application**
2. Zakładka **Pages** → **Connect to Git**
3. Autoryzuj GitHub (jednorazowe)
4. Wybierz repozytorium: **`katarzynskimike-ctrl/dop-strona`**
5. Kliknij **Begin setup**

## Krok 3 — Konfiguracja buildu

Wypełnij następująco:

| Pole | Wartość |
|---|---|
| **Project name** | `dop-strona` (lub jak chcesz — Cloudflare doda `.pages.dev` na końcu) |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Build command** | (zostaw puste) |
| **Build output directory** | `/` |
| **Root directory** | `/` (zostaw default) |

Kliknij **Save and Deploy**.

**Pierwszy deploy:** ~30 sekund.

Po deploy dostaniesz URL tymczasowy: `https://dop-strona.pages.dev` lub podobny.

---

## Krok 4 — Environment variables (3 min)

Strona zadziała ale **formularze nie** dopóki nie dodasz klucza Brevo.

1. W projekcie Cloudflare Pages → **Settings** → **Environment variables**
2. Dodaj 3 zmienne dla **Production**:

| Variable name | Value | Type |
|---|---|---|
| `BREVO_API_KEY` | (Twój klucz `xkeysib-...`) | **Secret** ← zaznacz |
| `ALLOWED_ORIGIN` | `https://dop-strona.pages.dev` (na razie, potem zmień na domenę) | Plain text |
| `SITE_URL` | `https://dop-strona.pages.dev` (potem `https://doskonalaobslugapacjenta.pl`) | Plain text |

3. Kliknij **Save**
4. **Deployments** → wybierz ostatni deploy → **Retry deployment** (żeby env vars wczytały się do funkcji)

Po tym formularze działają.

---

## Krok 5 — Testuj funkcje (2 min)

**Test 1 — Strona ładuje się:**
```
https://dop-strona.pages.dev
```

**Test 2 — Lead form (API):**
```bash
curl -X POST https://dop-strona.pages.dev/api/lead \
  -H "Content-Type: application/json" \
  -d '{"form_id":"newsletter","EMAIL":"test@example.com"}'
```
Powinno zwrócić `{"ok":true,...}`.

**Test 3 — IndexNow ping:**
```bash
curl https://dop-strona.pages.dev/api/indexnow-ping
```
Powinno zwrócić JSON z `results.bing.ok: true`.

---

## Krok 6 — Podłącz domenę doskonalaobslugapacjenta.pl (5 min)

Tylko jeśli chcesz teraz migrować domenę (można zrobić później).

1. W projekcie Cloudflare Pages → **Custom domains** → **Set up a custom domain**
2. Wpisz: `doskonalaobslugapacjenta.pl`
3. Cloudflare pokaże instrukcje DNS:
   - Jeśli domena już jest w Cloudflare DNS — wystarczy kliknąć
   - Jeśli nie — Cloudflare poprosi o zmianę nameserverów na swoje
4. Po zatwierdzeniu DNS — Cloudflare wygeneruje SSL automatycznie (5 min)

**WAŻNE — pamiętaj zaktualizować env vars po migracji domeny:**
- `ALLOWED_ORIGIN` → `https://doskonalaobslugapacjenta.pl`
- `SITE_URL` → `https://doskonalaobslugapacjenta.pl`

Plus **Retry deployment** żeby się wczytały.

---

## Krok 7 — Wyłącz Netlify (oszczędność tymczasowych URL i nie myśleć o limitach)

1. **app.netlify.com** → wybierz site DOP
2. **Site settings** → **General** → **Delete this site** (lub: paused na zawsze)

Plus: usuń `netlify.toml` i `netlify/functions/` z repo (już nie potrzebne):
```bash
cd /Users/majkel/Documents/Claude/Projects/DOp-Strona
git rm netlify.toml
git rm -r netlify/
git commit -m "Cleanup: usunięty Netlify config po migracji na Cloudflare Pages"
git push
```

---

## Co Cloudflare daje vs Netlify

| Feature | Netlify Free | Cloudflare Pages Free |
|---|---|---|
| Bandwidth/m-c | 100 GB | **Unlimited** |
| Build minutes/m-c | 300 | 500 |
| Functions/m-c | 125k requests | **100k req/dzień (3M/m-c)** |
| Edge locations | ~50 | **300+** |
| Brotli compression | tak | tak (lepsze) |
| Build time | ~30 sek | ~30 sek |
| Custom domain SSL | tak | tak |
| Preview deployments | tak | tak |

**Co już mamy zoptymalizowane w repo dla Cloudflare:**
- ✅ `_headers` — agresywne cache (zdjęcia: 1 rok immutable, HTML: 1h, fonts: 1 rok)
- ✅ `_redirects` — SPA fallback (`/* → /index.html`)
- ✅ Cloudflare auto-Brotli — 1.6 MB HTML → ~150 KB na drucie (90% reduction)
- ✅ Functions w formacie Cloudflare (`onRequest` zamiast `exports.handler`)

---

## FAQ

**Q: Czy Brevo działa tak samo?**  
A: Tak. Funkcja `/api/lead` używa tej samej `forms-config.json` i tego samego endpointa Brevo. Tylko klucz API jest w innym dashboard.

**Q: Czy stary URL Netlify zostanie?**  
A: Po wyłączeniu Netlify — nie. Wszystkie linki w mailach, social mediach, lead magnet PDF będą prowadzić do `dop-strona.pages.dev` (lub Twojej domeny po migracji).

**Q: Co z Brevo SMTP email (lead magnet PDF link)?**  
A: Funkcja `lead.js` używa env var `SITE_URL` żeby skonstruować link do PDF. Po deployu z `SITE_URL=https://dop-strona.pages.dev` — wszystko działa.

**Q: Co jeśli będzie problem?**  
A: Cloudflare Pages ma **rollback** w 1 kliku — Deployments → wybierz poprzedni deploy → Rollback. Nawet jeśli coś zepsujesz commit-em, można cofnąć w 5 sekund.

**Q: Czy mogę mieć Netlify i Cloudflare równolegle?**  
A: Tak. Cloudflare deploy nic nie psuje w Netlify. Tylko domena może wskazywać na jeden — wybierasz który chcesz głównym.

---

## Po deployu — wysłać mi link Cloudflare

Daj mi nowy URL `https://dop-strona.pages.dev` — zaktualizuję wszystkie linki w `llms.txt`, `llms-full.txt`, `feed.xml`, `lead.js` (PDF link w email), `IndexNow PRIORITY_URLS`.

To zajmie mi 5 minut → wszystko zsynchronizowane.

---

Generated: 2026-06-10 · DOP Cloudflare Migration
