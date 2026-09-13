# Next Path

Career navigation for school students in Kazakhstan: **test → directions → professions → universities → admission plan → career path**.

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS v4 · Prisma + PostgreSQL · next-intl · Vitest · Playwright.

---

## Local setup

```bash
corepack pnpm@9.15.4 install
```

Create `.env` in the repository root (it is git-ignored and must never be committed):

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/next_path?schema=public"
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string used by Prisma at build and run time. |

Create the database and apply migrations:

```bash
createdb next_path                       # or CREATE DATABASE next_path;
corepack pnpm@9.15.4 exec prisma migrate deploy
corepack pnpm@9.15.4 exec prisma generate
```

Load content, then start the app:

```bash
corepack pnpm@9.15.4 db:import:sheet     # real catalogue from the team's Google Sheet
corepack pnpm@9.15.4 dev                 # http://localhost:3000/ru
```

### Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server. |
| `pnpm build` / `pnpm start` | Production build and server. |
| `pnpm typecheck` | `tsc --noEmit`. |
| `pnpm lint` | ESLint. |
| `pnpm test` | Vitest unit tests (scoring, stored user state, translation parity). |
| `pnpm test:e2e` | Playwright journey test — builds the app and drives a real browser. |
| `pnpm db:import:sheet [file.xlsx]` | Imports the Google Sheet (or a local `.xlsx` export) — see below. |
| `pnpm db:import <entity>=<file.csv>` | Imports one CSV per table. |
| `pnpm db:seed` | Placeholder fallback data; skips when the database already has content. |

---

## Content

### Source of truth

The catalogue is maintained by the team in a Google Sheet and imported with `pnpm db:import:sheet`. The importer is **idempotent**: every row is addressed by a stable key derived from the source, so re-running updates rows instead of duplicating them, and rows removed from the sheet are removed from the database. It prints a per-entity summary, a per-direction breakdown, source warnings and any consistency issues, and exits non-zero when an issue is found.

Every sheet exists three times — a `рус`, a `каз` and an `англ` tab — listing the same rows in the same order under translated headers. The importer therefore pairs rows across languages **by position** and reads columns **by position**, so the column order below is the contract. Tab names are matched loosely (case, stray spaces and the `Професии` / `Направление` spellings the sheet uses are all accepted). The Russian tab supplies identity and every number; the translations supply text.

**The importer refuses to run when the three tabs of a sheet differ in row count** — a single missing row would otherwise pair every later row with the wrong translation. It also warns when a Russian row has fewer filled cells than its translations, which usually means a value sits in the wrong column.

| Sheet (`… рус` / `… каз` / `… англ`) | Columns, in order |
| --- | --- |
| `Тест` | question, answers A–D, archetype of A–D, block |
| `Направления` | direction, description |
| `Направления объяснение` | direction (English label), explanation |
| `Профессии` | direction (English label), profession, what they do, salary, demand, pros, cons, subjects, skills, specialties |
| `Университеты` | name, country, city, directions, main fields, rating, tuition / year |
| `Поступление` | university, exams |
| `Контакты университетов` *(one tab)* | `Университет`, `email`, `Телефон`, `Cайт` |

Directions are keyed by their English label (`MEDICINE` → `medicine`), which the professions, explanations and universities sheets all use; the Russian tab names directions in Russian and only supplies the displayed name.

### Languages

Both the interface (`messages/*.json`) and the catalogue are in Russian, Kazakh and English. Catalogue columns come in two shapes, each with its own reader in `lib/content.ts`:

- fields localised from the start have a column per language — `name_ru`, `name_kk`, `name_en` — read with `localizedText` / `localizedList`;
- fields that began Russian-only and gained translations later keep the Russian value in the unsuffixed column next to `_kk` / `_en` — `city`, `city_kk`, `city_en` — read with `localizedValue` / `localizedValues` / `localizedPlace`. For `country` and `city` the Russian value is also the key the filters put in the URL, so a filtered link works in every language.

An empty translation falls back to the Russian value, so a cell the translators have not filled yet shows the original rather than a blank. The import prints how many rows are missing a Kazakh or English translation. The test's block and archetype stay keyed by their Russian labels — the direction weights and the career map's captions are defined on those — and their translations are display labels only.

### What is deliberately absent

The importer never invents a value. Where the source is silent, the field stays `null` and the interface hides the block rather than showing a plausible-looking placeholder:

- **Salaries.** The sheet states a monthly figure (`800 000 ₸`), read into `salaryAverage` and kept verbatim in `salaryLabel`. A cell that describes pay in words ("сильно зависит от бизнеса") gets no figure — no tenge amount is ever derived from a word — and sorts after the figures. Earlier revisions recorded a level ("Высокая"); a level is still ranked in `salaryRank`, for sorting only.
- **Ratings.** The sheet mixes world rankings (`166`, `401-500`), national positions (`топ-3`, `1(4)`) and spreadsheet artefacts. The label is kept verbatim in `ratingLabel`; the numeric `rating` is filled only for a single plausible world-ranking position, and universities are never sorted by rating across those different scales.
- **Tuition.** Parsed with its currency (`KZT`, `USD`, `GBP`, `EUR`, `CHF`, `CAD`, `SGD`) into `tuitionMin` / `tuitionMax` / `tuitionCurrency`, with the raw cell kept in `tuitionNote`. When the Russian cell omits the currency but the Kazakh or English version of that same cell names it, the currency is taken from there. Amounts are never converted between currencies; a cell that cannot be read confidently leaves the numbers empty and keeps only the note.
- **Admission** is stored as the source's own free text on `Admission`, field by field. A cell holding only a dash counts as blank. The current sheet carries only `Экзамены`; the `IELTS`, `SAT`, `Гранты` and `Дедлайн` columns an earlier revision had are **kept as stored, not cleared** — an absent column says nothing about the data, unlike a blank cell — and the import says so. Those four are Russian-only until the sheet provides them again.
- **Reviews** are never seeded or generated. The `Review` table stays empty and the interface shows its empty state.

The wording itself is never edited — typos are fixed in the sheet and re-imported. Only layout artefacts are normalised: line breaks and doubled spaces typed inside a test question or answer (which would otherwise split the sentence on screen), and label casing ("Очень Высокая" / "Очень высокая"), which would otherwise appear as two separate filter options.

### Programs (profession ↔ university)

`Program` is the only link between a profession and a university. Rows come from the universities sheet:

- one program per **university × direction**, from the structured `Направления` column;
- additionally attached to a **specific profession** when an English specialty name from `Специальности` appears verbatim in that university's free-text `осн. направления` cell — the only profession-level signal the source contains. Nothing else is guessed, so most programs are direction-level.

### Test scoring

The source questionnaire does not score the eight catalogue directions directly: each answer is tagged with one of twelve archetype labels across three blocks (`Личность`, `Интересы`, `Карьера`), keyed by their Russian labels. The product needs a per-direction percentage, so `lib/test-mapping.ts` holds a single explicit table translating each archetype into direction weights. **That table is a product decision, not source data.** It is applied only when the importer writes `Option.weights`; `Option.archetype` keeps the raw source label. Re-tune the table and re-run `pnpm db:import:sheet` to change how results are computed.

---

## CSV import

`pnpm db:import <entity>=<path.csv>` ingests one UTF-8 CSV per table so the catalogue can be replaced without code changes. Entities are imported in dependency order — directions and universities first, then professions, then programs, questions and options.

```bash
corepack pnpm@9.15.4 db:import \
  directions=./data/directions.csv \
  professions=./data/professions.csv \
  universities=./data/universities.csv \
  programs=./data/programs.csv \
  questions=./data/questions.csv \
  options=./data/options.csv
```

Headers are Prisma field names. Empty cells become `null`. List columns use a JSON array (`["Логика","Алгоритмы"]`), JSON columns use a JSON object or array. Localised columns are `*_ru`, `*_kk`, `*_en`; leave `_kk` / `_en` empty when no translation exists.

| Entity | Required headers |
| --- | --- |
| `directions` | `slug`, `sortOrder`, `name_ru`, `name_kk`, `name_en`, `description_ru`, `description_kk`, `description_en`, `whoItSuits_ru`, `whoItSuits_kk`, `whoItSuits_en`, `skills`, `schoolSubjects`, `icon` |
| `professions` | `slug`, `directionId`, `name_*`, `shortDescription_*`, `whatTheyDo_*`, `salaryMin`, `salaryMax`, `salaryAverage`, `salaryLabel`, `salaryRank`, `demand` (`LOW`/`MEDIUM`/`HIGH`), `demandLabel`, `demandRank`, `specialties`, `pros_*`, `cons_*`, `skills`, `schoolSubjects`, `careerLadder` |
| `universities` | `slug`, `name_*`, `country`, `city`, `rating`, `ratingLabel`, `tuitionMin`, `tuitionMax`, `tuitionCurrency`, `tuitionNote`, `website`, `email`, `phone`, `address`, `description_*` |
| `programs` | `sourceKey`, `universityId`, `directionId`, `professionId`, `name_*`, `requirements_*`, `tuitionCost` |
| `questions` | `sourceKey`, `order`, `block`, `text_*`, `category` (`INTERESTS`/`APTITUDES`/`ACTIVITY_TYPE`) |
| `options` | `sourceKey`, `questionId`, `archetype`, `text_*`, `weights` (JSON `{"direction-slug": 1}`) |

`careerLadder` is a JSON array of ordered steps with localised titles, e.g. `[{"title_ru":"Junior","title_kk":"","title_en":""}]`. It is empty until the source provides career-ladder content, and the interface hides the block while it is empty.

## Placeholder seed

`prisma/seed.ts` is marked `SEED_DATA_PLACEHOLDER` and exists only for environments that cannot reach the sheet. It **skips when the database already holds directions**, so it can never overwrite imported content; pass `--force` to reseed a scratch database on purpose. It contains no real ratings, tuition figures, deadlines, contacts or reviews.

## Routes

```
/[locale]                      home
/[locale]/test                 questionnaire, one question per screen
/[locale]/test/results         ranked directions, top three and the rest
/[locale]/directions           catalogue        /[locale]/directions/[slug]
/[locale]/professions          search + filters /[locale]/professions/[slug]
/[locale]/universities         search + filters /[locale]/universities/[slug]
/[locale]/favorites            saved items, tabbed
/[locale]/career-path          the career map, built around one profession
/[locale]/admission-plan       checklist plus requirements for saved universities
/[locale]/grants               grant information per university
/[locale]/search               grouped results across every entity
/[locale]/about                what the project is and where the data comes from
```

Filters and sorting are URL search parameters translated into Prisma `where`
and `orderBy` clauses, so a filtered list is shareable and survives a reload.
Favourites, the answers in progress, the last test result and the admission- and
development-plan ticks are the only client-side state; they live in
`localStorage` behind `lib/user-state.ts`.

## The career map

`/[locale]/career-path` is the product's navigator: one page that answers the
journey's questions in order — *who am I* → *what suits me* → *who can I become*
→ *where do I study* → *what do I do now* → *how do I get there*. Its nine
stations are the profile, the recommended directions, the professions inside
them, the comparison of saved professions, the universities, the admission plan,
the development plan, the career path itself and the alternative routes.

A sticky progress slider at the top shows how far along the visitor is and jumps
to each station. Six milestones fill it, and each counts only once the visitor
has actually taken the step — finished the test, saved a direction, chosen a
profession, saved a university, ticked an admission step, ticked a development
step. Progress and the profile are computed in `lib/career-map.ts`, which is
pure and unit-tested.

The profile is not a new source of truth: each answered question contributes its
option's **source archetype** to that question's **source block**, so a block
reads as "of the questions you answered here, this is what you chose most
often". The three blocks the sheet uses are given a plain-language caption
(`Личность` → "strengths and abilities") through a small table in
`lib/career-map.ts`; like the archetype weights in `lib/test-mapping.ts` that
table is a **product decision, not source data**, and a block the sheet adds
later simply appears under its own label with no caption.

The development plan is the one station the sheet has no content for. It is
therefore a checklist of **action prompts** — build these skills, strengthen
these subjects, take courses, build projects, enter competitions, assemble a
portfolio — filled in with the profession's own skills and school subjects. No
course, contest, internship or deadline is ever named that the source did not
provide, and the interface says so under the list. For the same reason the
career-path chain shows its growth step as unknown while `careerLadder` is
empty, rather than inventing job titles.

## Tests

```bash
corepack pnpm@9.15.4 test        # Vitest
corepack pnpm@9.15.4 test:e2e    # Playwright (needs a populated database)
```

`tests/unit/scoring.test.ts` covers the scoring contract: answers concentrated in
one direction, evenly spread answers, a direction that carries no weight
anywhere, partial completion, deterministic tie-breaking and answers that
reference unknown questions. `tests/unit/messages.test.ts` fails when any key,
value or message placeholder is missing from one of the three locale files — the
CI check for translation parity.

`tests/e2e/journey.spec.ts` walks the entire journey in one run — home → test →
every question answered → results with non-zero percentages → top direction →
a profession (salary level and demand rendered) → a university → favourites →
admission plan → career path — then switches to Kazakh and asserts the interface
chrome contains no Russian or English, and that the catalogue itself is
translated: Kazakh direction cards read in Kazakh, English ones carry no
Cyrillic. A third test checks that no page overflows horizontally at 375px.

`tests/unit/source-parsing.test.ts` covers the import rules — dash-only cells,
sentences split across lines, label casing, salary figures versus words, and a
tuition currency taken from a translation of the same cell;
`tests/unit/content.test.ts` covers the language fallbacks.

The Playwright config builds the app and starts it on port 3100. Install the
browser once with `corepack pnpm@9.15.4 exec playwright install chromium`.

## Database

```bash
corepack pnpm@9.15.4 exec prisma migrate dev --name <change>   # create a migration
corepack pnpm@9.15.4 exec prisma migrate deploy                # apply migrations
corepack pnpm@9.15.4 exec prisma studio                        # inspect data
```

## Deployment

Any Node host that can reach PostgreSQL. Set `DATABASE_URL`, then:

```bash
corepack pnpm@9.15.4 install --frozen-lockfile
corepack pnpm@9.15.4 exec prisma migrate deploy
corepack pnpm@9.15.4 build
corepack pnpm@9.15.4 start
```

Run `pnpm db:import:sheet` after deploying to load or refresh the catalogue.

### Railway

`railway.json` holds the deployment contract: Nixpacks builds the app, and each
release runs `prisma migrate deploy` before `next start`, so the schema is
migrated on every deploy and never at build time. `/ru` is the health check —
`/` is a locale redirect and would not answer with `200`. `postinstall` runs
`prisma generate`, because a fresh clone has no generated client and the build
imports it.

```bash
railway login
railway init                 # or: railway link, for an existing project
railway add --database postgres
railway up
```

Railway's PostgreSQL plugin publishes `DATABASE_URL` to the service; nothing
else is required. `next start` binds to the injected `PORT`, and
`RAILWAY_PUBLIC_DOMAIN` is picked up automatically as the `metadataBase` for
social images — set `NEXT_PUBLIC_SITE_URL` instead when serving from a custom
domain.

The catalogue is **not** part of the image. After the first successful deploy,
load it once against the deployed database:

```bash
railway run pnpm db:import:sheet
```

| Variable | Where it comes from | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL plugin | Prisma connection string. |
| `PORT` | Railway | Injected; `next start` binds to it. |
| `RAILWAY_PUBLIC_DOMAIN` | Railway | Absolute base for Open Graph images. |
| `NEXT_PUBLIC_SITE_URL` | you, optional | Overrides the base on a custom domain. |
