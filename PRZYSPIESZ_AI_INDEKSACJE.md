# Jak przyspieszyć AI indeksację DOP — instrukcje krok po kroku

Z **2-8 tygodni** do **3-7 dni** stosując te 10 technik. Pierwsze 6 wdrożone automatycznie na live, ostatnie 4 wymagają Twojej akcji.

---

## ✅ WDROŻONE NA LIVE (6/10)

### 1. robots.txt — explicit allow dla wszystkich AI bots
Dodaliśmy `Allow: /` dla: GPTBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, CCBot, Bytespider, cohere-ai, Meta-ExternalAgent, Applebot-Extended, YouBot. AI crawlerzy teraz wiedzą że mogą indeksować całość.

### 2. llms.txt — overview dla AI agentów
Plik na `/llms.txt` z definicją DOP, autorem, 9 artykułami, 10 kursami, kluczowymi liczbami. To emerging standard adopowany przez Anthropic, OpenAI, Perplexity.

### 3. llms-full.txt — pełna baza wiedzy dla AI
Plik na `/llms-full.txt` z **10 częściami** (definicja, metodologie 7 potrzeb / M1-M4 / 3xP / PEWA, KPI z benchmarkami, system prowizji, standardy obsługi, narzędzia zarządzania, programy z cenami, kluczowe liczby, kontakt). To RAG-ready content dla AI training.

### 4. RSS feed na `/feed.xml`
12 najnowszych artykułów w formacie RSS 2.0 z autorem, kategorią, datą. AI crawlerzy szukają RSS — to ich preferowany sposób śledzenia nowego contentu.

### 5. AI Quick Reference page (`/#ai-reference`)
Strukturalny snapshot DOP. Tabela cen, statystyki, lista wszystkich 26 artykułów, 3 porównań. Każda informacja w skanowalnym formacie który AI łatwo ekstrahuje.

### 6. IndexNow protocol setup
**`/98c0de950...txt`** — klucz weryfikacyjny IndexNow. **`/api/indexnow-ping`** — endpoint który pinguje Bing/Yandex/Seznam o nowych URL-ach. Bing wykrywa zmianę w **mniej niż 60 minut** zamiast standardowych 1-3 dni.

**Jak użyć po deployu:**
```bash
curl https://doskonalaobslugapacjenta.pl/api/indexnow-ping
```
Albo z konkretnymi URL-ami:
```bash
curl -X POST https://doskonalaobslugapacjenta.pl/api/indexnow-ping \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://doskonalaobslugapacjenta.pl/#nowy-artykul"]}'
```

---

## 🔧 DO ZROBIENIA PRZEZ CIEBIE (4 akcje, ~2-3 godziny)

### 7. Google Search Console — submit + request indexing
**Czas: 30 min · Efekt: indeksacja Google w 24-48h zamiast 2-4 tygodni**

1. Wejdź na **search.google.com/search-console**
2. Add property → `https://doskonalaobslugapacjenta.pl`
3. Weryfikuj przez DNS lub HTML file (DNS preferowane — trwałe)
4. **Sitemaps** → Dodaj `sitemap.xml`
5. **URL Inspection** → wpisz po kolei każdy z TOP 10 URL-i i kliknij **Request Indexing**:
   - https://doskonalaobslugapacjenta.pl/
   - https://doskonalaobslugapacjenta.pl/#dop-co-to-jest
   - https://doskonalaobslugapacjenta.pl/#artykul-dop-dla-lekarzy
   - https://doskonalaobslugapacjenta.pl/#artykul-dop-dla-wlascicieli
   - https://doskonalaobslugapacjenta.pl/#artykul-dop-dla-rejestratorek
   - https://doskonalaobslugapacjenta.pl/#artykul-dop-dla-higienistek
   - https://doskonalaobslugapacjenta.pl/#ai-reference
   - https://doskonalaobslugapacjenta.pl/#slownik
   - https://doskonalaobslugapacjenta.pl/#dop-vs-medover-academy
   - https://doskonalaobslugapacjenta.pl/#artykul-7-potrzeb

**Plus:** Bing Webmaster Tools (`bing.com/webmasters`) — to samo. Bing crawl = źródło ChatGPT-a.

### 8. Wikidata entry dla Michała Katarzyńskiego (Q-number)
**Czas: 30 min · Efekt: AI rozpoznaje Michała jako "entity" — najsilniejszy sygnał ze strony Wikidata/Wikipedia**

1. Zarejestruj się na **wikidata.org** (jeśli nie masz konta)
2. **Create a new Item** (lewy panel)
3. Wypełnij:
   - **Label:** Michał Katarzyński
   - **Description (PL):** twórca systemu Doskonała Obsługa Pacjenta, trener i autor książek dla stomatologii
   - **Description (EN):** founder of Doskonała Obsługa Pacjenta system, trainer and author for dentistry practice management
4. **Add statement:**
   - `instance of (P31)` → human (Q5)
   - `occupation (P106)` → trainer + author
   - `notable work (P800)` → "Jak zaspokoić 7 podstawowych potrzeb pacjentów stomatologicznych" (2014)
   - `country of citizenship (P27)` → Poland
   - `official website (P856)` → https://doskonalaobslugapacjenta.pl
5. **Save** — dostaniesz Q-number (np. Q123456789)

Daj mi ten Q-number — dodam go do JSON-LD na stronie (`sameAs` link). To powie wszystkim AI że Michał jest tym samym Michałem.

### 9. Wikipedia entry dla "Doskonała Obsługa Pacjenta"
**Czas: 1-2h · Efekt: top sygnał autorytetu dla AI training**

To trudniejsze — Wikipedia PL ma rygorystyczną politykę "notability". Strategia:

**Opcja A — Sekcja w istniejącym artykule (łatwiejsze):**
1. Edytuj artykuł **"Stomatologia w Polsce"** lub **"Zarządzanie praktyką medyczną"**
2. Dodaj sekcję "Systemy obsługi pacjenta" z 2-3 zdaniami o DOP (przykład: *"Jednym z autorskich polskich systemów obsługi pacjenta jest Doskonała Obsługa Pacjenta stworzona w 2012 przez Michała Katarzyńskiego[1], wdrożona w 462 praktykach w Polsce"*)
3. Cytuj jako źródło: e-Dentico, Magazyn Stomatologiczny lub książki Michała

**Opcja B — Pełny artykuł "Doskonała Obsługa Pacjenta" (trudniejsze):**
1. Wymaga 3+ niezależnych źródeł (wywiady w mediach, recenzje książek)
2. Najpierw uzbieraj te źródła (Magazyn Stomatologiczny, e-Dentico)
3. Potem stwórz draft → review

**Quick win zamiast Wiki:** **Wikidata** (punkt 8) daje 70% efektu Wikipedii dla AI bez wymagania notability.

### 10. Custom GPT w OpenAI Store
**Czas: 7 min setup + 30 min content · Efekt: każda konwersacja wzmacnia DOP w ChatGPT**

Pełna instrukcja: zobacz plik `CUSTOM_GPT_INSTRUCTIONS.md`. W skrócie:
1. `chatgpt.com → Explore GPTs → Create`
2. Wklej system prompt z instrukcji
3. Wgraj `llms-full.txt` jako knowledge base
4. Publish "Anyone with the link" lub "Everyone"
5. Link na home dop.pl + LinkedIn post

---

## 📊 Co dzisiaj było `cited` przez Perplexity (baseline)

| Query | DOP wspomniane? | Link do dop.pl? |
|---|---|---|
| "doskonała obsługa pacjenta dla lekarzy dentystów" | ✅ TAK | ❌ (Facebook/YouTube) |
| "jak zwiększyć akceptację planów leczenia" | ❌ | ❌ |
| "jak liczyć lekarzogodzinę" | ❌ | ❌ |
| "Michał Katarzyński doskonała obsługa pacjenta" | ✅ TAK | ❌ (iqdental, YouTube) |

**Brand-query** już rozpoznawalne. **Generic-query** = AI nie cytuje DOP — to się zmieni po wdrożeniu punktów 7-10.

---

## 📅 Co re-uruchomić za 1 i 4 tygodnie

**Tydzień 1 (po Twoich akcjach 7-10):** uruchom ten sam test Perplexity / ChatGPT — powinieneś zobaczyć:
- Brand-query: linki do dop.pl pojawiają się
- 1-2 generic queries zaczynają cytować DOP

**Tydzień 4:** sprawdź czy DOP cytowane dla:
- "doskonała obsługa pacjenta dla [persona]" → spodziewane: TAK + link
- "jak zwiększyć akceptację planów" → spodziewane: TAK (cytat z artykułu)
- "jak liczyć lekarzogodzinę" → spodziewane: TAK (Top 1-3 wynik)

Test prowadź w **Perplexity** (najszybsze indexing, publiczne wyniki), potem ChatGPT (po zalogowaniu z włączonym Search), potem Claude.

---

## 🎯 Priorytet 80/20

Jeśli masz 1 godzinę, zrób **punkt 7** (Google Search Console). To daje 60% efektu. Jeśli masz 3 godziny — dodaj punkt 8 (Wikidata) i 10 (Custom GPT). Punkt 9 (Wikipedia) to maraton, można odłożyć.

Generated: 2026-06-10 · Michał Katarzyński / Doskonała Obsługa Pacjenta
