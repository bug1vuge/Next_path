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

Sheet tabs and the columns the importer reads:

| Tab | Columns |
| --- | --- |
| `Тесты` | `Вопрос`, `A`–`D`, `A - направление`–`D - направление`, `Тип теста` |
| `Направления` | `Направление`, `Описание` |
| `Направления объяснение ` | `Направление`, `Объяснение` |
| `Профессии` | `Направление`, `Профессия`, `Чем занимается`, `Средняя зарплата`, `Востребованность`, `Плюсы`, `Минусы`, `Предметы`, `Навыки`, `Специальности` |
| `Университеты` | `Название`, `страна`, `город`, `Направления`, `осн. направления`, `рейтинг`, `стоимость/год` |
| `Поступление` | `Университет`, `Экзамены`, `IELTS`, `SAT`, `Гранты`, `Дедлайн` |
| `Контакты университетов` | `Университет`, `email`, `Телефон`, `Cайт` |

### Languages

Interface chrome is translated into Russian, Kazakh and English (`messages/*.json`). **Catalogue content is Russian only** — that is the only language the source provides. The Kazakh and English database columns are written **empty** rather than filled with Russian text, so an empty column honestly means "not translated yet". Reads go through `lib/content.ts`, which falls back to the Russian source value, and the interface tells the reader when the content on screen is the untranslated Russian original.

### What is deliberately absent

The importer never invents a value. Where the source is silent, the field stays `null` and the interface hides the block rather than showing a plausible-looking placeholder:

- **Salaries.** The sheet records pay as a level ("Высокая", "Средняя/Высокая"), never as a figure. `salaryAverage` / `salaryMin` / `salaryMax` therefore stay empty; the level is preserved verbatim in `salaryLabel` and ranked in `salaryRank` for sorting only. No tenge amount is derived from a word.
- **Ratings.** The sheet mixes world rankings (`166`, `401-500`), national positions (`топ-3`, `1(4)`) and spreadsheet artefacts. The label is kept verbatim in `ratingLabel`; the numeric `rating` is filled only for a single plausible world-ranking position, and universities are never sorted by rating across those different scales.
- **Tuition.** Parsed with its currency (`KZT`, `USD`, `GBP`, `EUR`, `CAD`, `SGD`) into `tuitionMin` / `tuitionMax` / `tuitionCurrency`, with the raw cell kept in `tuitionNote`. Amounts are never converted between currencies; a cell that cannot be read confidently leaves the numbers empty and keeps only the note.
- **Deadlines and grants** are stored as the source's own free text on `Admission`, field by field, and each field is omitted when the sheet leaves it blank.
- **Reviews** are never seeded or generated. The `Review` table stays empty and the interface shows its empty state.

### Programs (profession ↔ university)

`Program` is the only link between a profession and a university. Rows come from the universities sheet:

- one program per **university × direction**, from the structured `Направления` column;
- additionally attached to a **specific profession** when an English specialty name from `Специальности` appears verbatim in that university's free-text `осн. направления` cell — the only profession-level signal the source contains. Nothing else is guessed, so most programs are direction-level.

### Test scoring

The source questionnaire does not score the eight catalogue directions directly: each answer is tagged with one of twelve archetype labels across three blocks (`Личность`, `Интересы`, `Карьера`). The product needs a per-direction percentage, so `lib/test-mapping.ts` holds a single explicit table translating each archetype into direction weights. **That table is a product decision, not source data.** It is applied only when the importer writes `Option.weights`; `Option.archetype` keeps the raw source label. Re-tune the table and re-run `pnpm db:import:sheet` to change how results are computed.

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
/[locale]/career-path          the route built around one profession
/[locale]/admission-plan       checklist plus requirements for saved universities
/[locale]/grants               grant information per university
/[locale]/search               grouped results across every entity
/[locale]/about                what the project is and where the data comes from
```

Filters and sorting are URL search parameters translated into Prisma `where`
and `orderBy` clauses, so a filtered list is shareable and survives a reload.
Favourites, the answers in progress, the last test result and the admission-plan
ticks are the only client-side state; they live in `localStorage` behind
`lib/user-state.ts`.

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
chrome contains no Russian or English, and that the Russian-only catalogue is
labelled as such rather than passed off as a translation. A third test checks
that no page overflows horizontally at 375px.

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
