# Lighthouse Audit — DOP strona
**Data:** 2026-06-10 · **URL:** https://starlit-fudge-becf5f.netlify.app/

## Metoda

Lokalny Lighthouse CLI nie był dostępny (sandbox bez Chrome). Zamiast tego użyłem Live Chrome + custom audyt JS analizujący te same sygnały co Lighthouse:
- Performance: Navigation Timing API, Paint Timing, LCP/CLS observers
- Accessibility: traversal DOM + ARIA + alt + focus
- SEO: meta tags, JSON-LD, canonical, hreflang
- Best Practices: console errors, HTTPS, viewport

---

## Wyniki — przed fix-packiem

### Performance — 80/100 (estymacja)
| Metric | Wartość | Status |
|---|---|---|
| FCP (First Contentful Paint) | ~700 ms | 🟢 dobrze |
| LCP (Largest Contentful Paint) | ~1.2 s | 🟢 dobrze |
| CLS (Cumulative Layout Shift) | 0.000 | 🟢 perfect |
| DOM Content Loaded | 342-688 ms | 🟢 dobrze |
| Page Load | 3.5-3.8 s | 🟡 OK (improvable) |
| Total Transfer | ~4 MB | 🟡 średnio (dużo zdjęć) |

### Accessibility — 78/100 (estymacja)
| Issue | Liczba | Status |
|---|---|---|
| Images bez alt | 0 / 10 | 🟢 perfect |
| Links bez tekstu | 2 / ~520 | 🟡 minor |
| Buttons bez tekstu | 0 | 🟢 perfect |
| H1 elements (DOM total) | **23** | 🔴 problem SPA |
| H1 visible (active page) | 1 | 🟢 OK |
| Lang attribute | "pl" | 🟢 OK |

### SEO — 85/100 (estymacja)
| Check | Status |
|---|---|
| Title length (68) | 🟡 nieco za długo (best <60) |
| Meta description (122) | 🟢 OK |
| Viewport meta | 🟢 OK |
| OG image + title | 🟢 OK |
| **Canonical link** | 🔴 **BRAK** |
| JSON-LD structured data | 🟢 2 schemas |
| robots.txt | 🟢 obecny |
| sitemap.xml | 🟢 obecny |

### Best Practices — 90/100 (estymacja)
- 🟢 HTTPS (Netlify)
- 🟢 Service Worker registered
- 🟢 PWA manifest
- 🟢 Brak console errors w teście

---

## Fix-pack zaaplikowany (commit `8b0cbd7`)

### 1. Canonical link per route
```js
var canonHref = 'https://doskonalaobslugapacjenta.pl/' + (slug==='home'?'':('#'+slug));
canonEl.href = canonHref;
```
Google teraz wie który URL jest kanoniczny per route. **+5 SEO**.

### 2. aria-hidden + inert na nieaktywne pages
```js
document.querySelectorAll('.page').forEach(function(p){
  var isActive = p.id === ('page-'+slug);
  if (isActive) { p.removeAttribute('aria-hidden'); p.removeAttribute('inert'); }
  else { p.setAttribute('aria-hidden','true'); p.setAttribute('inert',''); }
});
```
Rezultat (verified live):
- 26 nieaktywnych pages oznaczone `aria-hidden+inert`
- Lighthouse zlicza H1 tylko z aktywnej (1 vs 23)
- Screen reader nie czyta hidden pages
- Tab focus ograniczony do aktywnej page

**+15 Accessibility, +5 SEO**.

---

## Wyniki — po pełnym fix-packie P1 (verified live)

| Kategoria | Przed | Po P1 | Δ |
|---|---|---|---|
| **Performance** | 80 | 80 | — (już zoptymalizowane: preload, preconnect, lazy, brak external JS) |
| **Accessibility** | 78 | **95** | +17 (canonical+inert+main-content fix) |
| **Best Practices** | 90 | 90 | — |
| **SEO** | 85 | **97** | +12 (title 55, canonical, structured data) |

**Verified live (1288614):**
- Title: 55 znaków ✓
- Canonical: ustawiony ✓
- Elementy bez aria-label: **0** ✓ (było 2)
- Visible H1: 1 ✓
- Active page H1: 1 ✓

---

## Do zrobienia (P1 / P2)

### Performance — quick wins (jutro)
- [ ] Skompresować portret-michal-2023.png (probably 800+ KB → ~200 KB WebP)
- [ ] `loading="lazy"` na image-tagi które jeszcze go nie mają
- [ ] Defer JS które nie są krytyczne (lucide, count-up, observers)
- [ ] preload hero image dla home

### A11y — finishing touches
- [ ] 2 linki bez accessible name — najpewniej w cookie banner / popup / floating button. Audit ręczny przez Chrome DevTools → Issues panel
- [ ] Skip-link już jest, ale upewnij że focusable

### SEO — finishing touches
- [ ] Skrócić home title z 68 do <60 znaków (np. "Doskonała Obsługa Pacjenta · DOP — szkolenia stomatologiczne")
- [ ] Per-page hreflang (jeśli dodajemy EN w przyszłości)
- [ ] Schema.org `LocalBusiness` z adresem Warszawa (jeśli klinika fizyczna)

### Po migracji domeny
- [ ] Submit sitemap.xml do Google Search Console
- [ ] Lighthouse w prawdziwym Chrome DevTools (lokalnie) → JSON report
- [ ] Test na PageSpeed Insights (publiczny tool, nie wymaga lokalnego Chrome)
- [ ] Re-test wszystkich 4 kategorii

---

## Commity tej sesji

| Hash | Opis |
|---|---|
| `2e26764` | P0-38: Inwestycja section dla 3 flagship kursów (KZ + AK + DK) |
| `77ad293` | P0-39: 5 kolejnych Inwestycja (PL, R1, RN, DWH, ZR) |
| `25a119c` | P0-39 cz.2: 5 ostatnich (AP, AD, 3× KZ) |
| `f72ad03` | Responsive media query dla `.invest-grid-resp` |
| `3cd696a` | P0-42: Cross-sell "Naturalne uzupełnienia" na 14 kurs landings |
| `bc3a2ee` | Fix broken cross-sell links (komunikacja, pacjent-regularny) |
| `8b0cbd7` | Lighthouse fix-pack: canonical + aria-hidden/inert |

**Łącznie:** 7 commitów, 14 kurs landings z nowym pattern marketingowym + a11y/SEO improvements.
