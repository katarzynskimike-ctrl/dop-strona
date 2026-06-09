# Migracja domeny doskonalaobslugapacjenta.pl

Strona obecnie działa pod tymczasowym URL Netlify:
**https://starlit-fudge-becf5f.netlify.app**

Po migracji domeny `doskonalaobslugapacjenta.pl` na Netlify, wykonaj poniższe kroki.

---

## 1. Netlify — podpiąć domenę

1. **Netlify dashboard** → projekt DOP → **Site configuration** → **Domain management**
2. **Add custom domain** → wpisz `doskonalaobslugapacjenta.pl`
3. Postępuj zgodnie z instrukcjami Netlify (DNS rekordy):
   - **A record** dla `@` → IP Netlify (Netlify pokaże)
   - **CNAME** dla `www` → `starlit-fudge-becf5f.netlify.app`
4. Poczekaj na DNS propagation (1–24h)
5. **HTTPS** — Netlify automatycznie wygeneruje Let's Encrypt cert (24h)

---

## 2. Netlify — Environment Variables

**Site configuration** → **Environment variables** → **Add a variable**:

| Key | Value | Comment |
|---|---|---|
| `SITE_URL` | `https://doskonalaobslugapacjenta.pl` | Używany przez `lead.js` do generowania linków w e-mailach |
| `ALLOWED_ORIGIN` | `https://doskonalaobslugapacjenta.pl` | CORS dla `/api/lead` (obecnie `*` — luźna polityka) |
| `BREVO_API_KEY` | (już skonfigurowany) | Klucz Brevo dla form submissions |

Po dodaniu zmiennych → **Trigger deploy** żeby weszły do running funkcji.

---

## 3. Brevo — Sender DNS

Obecnie e-maile transactional używają `forms@doskonalaobslugapacjenta.pl` (skonfigurowany).

**Po migracji** możesz przełączyć na `biuro@doskonalaobslugapacjenta.pl`:

1. **Brevo dashboard** → **Senders & domains** → **Domains**
2. Zweryfikuj `doskonalaobslugapacjenta.pl` (DKIM, SPF, DMARC w DNS)
3. Dodaj `biuro@doskonalaobslugapacjenta.pl` jako sender
4. W `netlify/functions/lead.js` zmień:
   ```js
   sender: { name: 'Michał Katarzyński · DOP', email: 'forms@doskonalaobslugapacjenta.pl' }
   ```
   → na:
   ```js
   sender: { name: 'Michał Katarzyński · DOP', email: 'biuro@doskonalaobslugapacjenta.pl' }
   ```
5. Commit + push (auto-deploy Netlify).

---

## 4. Brevo — Listy do segmentacji

Aktualne listy:

| ID | Nazwa | Użycie |
|----|-------|--------|
| 5 | DOP Newsletter | Newsletter (popup, footer, lead-magnet) |
| 6 | Leady B2B — Kursy zamknięte | Form `kurs-zamkniety` |
| 7 | Leady B2B — Audyty | Form `audyt-praktyki` |
| 8 | Leady B2B — Audyt Doradczy | Form `audyt-doradczy` |
| 9 | Uczestnicy Kursów Otwartych | Form `enroll` |
| 10 | Inquiries | Form `kontakt` |
| 11 | Chat AI — pytania uczestników | Chat widget |

**Lead-magnet ebook** trafia obecnie do listy 5 (Newsletter) z `SOURCE` attribute różnicującym (`home-lead-magnet` vs `popup-timed-40s-60scroll`). Jeśli chcesz osobnej listy — utwórz w Brevo (np. ID 12 = "Lead Magnet — E-book PDF") i zmień w `forms-config.json`:

```json
"lead-magnet": { "list": "lead-magnet-ebook", ... }
```

Plus dodaj do `_brevo.lists`:
```json
"lead-magnet-ebook": { "id": 12, "name": "Lead Magnet — E-book PDF" }
```

---

## 5. Sprawdź po migracji

Po wejściu doskonalaobslugapacjenta.pl:

- [ ] `https://doskonalaobslugapacjenta.pl` — strona ładuje się przez HTTPS
- [ ] `https://doskonalaobslugapacjenta.pl/ebook-10bledow.pdf` — PDF otwiera się
- [ ] Test submitu lead-magnet → e-mail dochodzi z linkiem do `https://doskonalaobslugapacjenta.pl/ebook-10bledow.pdf` (NIE z netlify.app)
- [ ] Test submitu kontakt → notification e-mail do `biuro@doskonalaobslugapacjenta.pl` dochodzi
- [ ] Test lead-magnet popup po 40s — działa i wysyła PDF
- [ ] OG image renderuje się na social share (Facebook debugger)
- [ ] Google Search Console — dodaj nową własność `doskonalaobslugapacjenta.pl`
- [ ] Submit sitemap.xml → `https://doskonalaobslugapacjenta.pl/sitemap.xml`

---

## 6. Calendly / Booking dla audyt-doradczy (opcjonalne)

Obecnie `/#audyt-doradczy` ma formularz e-mail. Dla wyższej konwersji można dodać Calendly embed (bezpośrednie wybieranie slotu).

**Setup:**
1. Załóż konto na **Calendly.com** (free plan wystarczy)
2. Utwórz event type: "15 minut z Michałem · DOP" (15 min, video Google Meet lub telefon)
3. Skopiuj public URL: `https://calendly.com/michal-dop/15min`
4. Dodaj do Netlify env: `CALENDLY_URL=https://calendly.com/michal-dop/15min`
5. Na page-audyt-doradczy w `index.html` dodaj iframe:
   ```html
   <iframe src="https://calendly.com/michal-dop/15min" width="100%" height="700" frameborder="0"></iframe>
   ```
   ALBO przycisk "Otwórz Calendly →" (popup):
   ```html
   <script src="https://assets.calendly.com/assets/external/widget.js"></script>
   <button onclick="Calendly.initPopupWidget({url:'https://calendly.com/michal-dop/15min'})">Wybierz termin →</button>
   ```

**Tryby:**
- **Inline embed** — UX zintegrowany, slot wybierany na stronie
- **Popup widget** — modal na klik (lekszy, mniej obniża LCP)

**Brevo integration:** Calendly → Webhook → Brevo automation (każde umówienie = lead w Brevo z tag "calendly-booked").

---

## 7. Po migracji — opcjonalne

- **301 redirects** ze starych adresów (np. WIX `/wiedza` jeśli był) — Netlify `_redirects`
- **Google Analytics 4** — setup po decyzji o cookie consent
- **Search Console** — sprawdzić index status nowej domeny
- **CDN cache invalidation** — clear Netlify cache
- **PWA manifest** — uppdate `start_url` w `manifest.json` jeśli używa absolute URL
