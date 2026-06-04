# DOP — Doskonała Obsługa Pacjenta

Strona produkcyjna **Excellent Patient Service sp. z o.o.** dla projektu *Doskonała Obsługa Pacjenta*.

## Architektura
- **Frontend:** `index.html` — single-file standalone (23 podstron, SPA-style routing)
- **Forms backend:** Netlify Functions + Brevo API (`netlify/functions/lead.js`)
- **Forms config:** `forms-config.json` (single source of truth: 7 formularzy, 6 list Brevo, 8 kursów)
- **Hosting:** Netlify (auto-deploy z brancha `main`)

## Deploy
Każda zmiana na `main` → Netlify automatycznie buduje i publikuje (~30 sek).

## Edycja
- **Styl:** Brandbook 2026 (Granat #1B2C4F, Złoto #C9A24A, Instrument Serif + Figtree)
- **Treść:** edycja `index.html` (lub przez `dop_cms_editor_v6.html` — CMS editor lokalnie)
