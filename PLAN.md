# Next Path MVP — implementation plan

## Scope and decisions

Build a Russian/Kazakh/English career-navigation MVP for learners aged 14–18. The product follows the core journey: test → directions → professions → universities/programs → admission plan → career path, while allowing free exploration. The technical contract in `codex-prompt-next-path.md` takes precedence where it is more specific than `BRIEF.md`.

Fixed stack: Next.js 15 App Router, strict TypeScript, Tailwind CSS v4, Prisma/PostgreSQL, next-intl, lucide-react, Vitest, and Playwright. `tsx` is the sole supporting development dependency: it executes the required TypeScript Prisma seed and CSV-import scripts without adding application runtime code. Client-only anonymous preferences and the last test result will be encapsulated in `lib/user-state.ts`.

## Route list

| Route | Purpose |
| --- | --- |
| `/[locale]` | Home: value proposition, test CTA, journey, featured catalogue content |
| `/[locale]/test` | One-question-at-a-time test with resume/back/progress |
| `/[locale]/test/results` | Persisted calculated ranking, top three and all directions |
| `/[locale]/directions` | All nine directions |
| `/[locale]/directions/[slug]` | Direction context, skills, subjects and professions |
| `/[locale]/professions` | Database-backed search, filters and sort |
| `/[locale]/professions/[slug]` | Details, salary/demand, career ladder and linked programs/universities |
| `/[locale]/universities` | Database-backed search and country filters |
| `/[locale]/universities/[slug]` | University information, programs and review empty state |
| `/[locale]/favorites` | Local favourites, filterable by entity type |
| `/[locale]/career-path` | Career ladder for a selected/saved profession |
| `/[locale]/admission-plan` | Local checklist of next admission actions |
| `/[locale]/grants` | Verified/static grants guidance without invented deadlines |
| `/[locale]/search` | Grouped cross-entity search results |
| `/[locale]/about` | Project rationale and how the guided journey works |
| `not-found.tsx` | Localised route fallback |

## Proposed file tree

```text
app/
  [locale]/
    layout.tsx  page.tsx  not-found.tsx
    test/page.tsx  test/results/page.tsx
    directions/page.tsx  directions/[slug]/page.tsx
    professions/page.tsx professions/[slug]/page.tsx
    universities/page.tsx universities/[slug]/page.tsx
    favorites/page.tsx career-path/page.tsx admission-plan/page.tsx
    grants/page.tsx search/page.tsx about/page.tsx
  globals.css  layout.tsx  not-found.tsx
components/
  layout/  ui/  home/  test/  directions/  professions/ universities/ favorites/
i18n/  messages/  lib/
  routing.ts request.ts navigation.ts
  ru.json kk.json en.json
lib/
  db.ts scoring.ts user-state.ts catalog.ts search.ts format.ts validation.ts
prisma/
  schema.prisma seed.ts migrations/
scripts/
  import-csv.ts check-translations.ts
tests/
  unit/scoring.test.ts unit/user-state.test.ts
  e2e/journey.spec.ts
public/
  favicon.svg
```

## Prisma schema

`Direction`: `id`, unique `slug`, `name_ru|kk|en`, `description_ru|kk|en`, `whoItSuits_ru|kk|en`, `skills String[]`, `schoolSubjects String[]`, `icon`, and `professions`.

`Profession`: `id`, unique `slug`, localised names/descriptions/what-they-do/pros/cons, nullable integer salary fields, `Demand` enum (`LOW`, `MEDIUM`, `HIGH`), `skills String[]`, `schoolSubjects String[]`, `careerLadder Json`, `directionId`, `direction`, and `programs`.

`University`: `id`, unique `slug`, localised names/descriptions, `country`, `city`, nullable `rating`, nullable tuition range, website/contact/address fields, `programs`, and `reviews`.

`Program`: `id`, foreign keys to `University` and `Direction`, optional `professionId`, localised `name` and `requirements`, nullable `tuitionCost`; it is the sole profession–university relation.

`Question`: `id`, unique `order`, localised text, `QuestionCategory` enum (`INTERESTS`, `APTITUDES`, `ACTIVITY_TYPE`), and options. `Option`: `id`, `questionId`, localised text, and JSON direction-weight map. `Review`: required schema relation with `universityId`, optional `programId`, `author`, `year`, `text`, `rating`; it has no seed records.

Indexes: slugs are unique; add indices for `Profession.directionId`, `Profession.salaryAverage`, `Profession.demand`, `Program.universityId`, `Program.directionId`, `Program.professionId`, and `University.country`.

## Scoring algorithm

```text
scoreAnswers(answers, allQuestionsWithOptions):
  initialise raw and max to 0 for every seeded direction slug
  for each direction d:
    for each answer:
      find its selected option from the supplied questions
      raw[d] += selectedOption.weights[d] ?? 0
    for each question:
      max[d] += maximum(option.weights[d] ?? 0 for option in question.options)
    percent[d] = max[d] == 0 ? 0 : round(raw[d] / max[d] * 100)
  return every direction as { directionSlug, percent }, descending by percent,
         resolving ties with stable seeded direction order
```

The function is pure and receives no database client. Unit tests cover a single-direction pattern, evenly distributed answers, a never-weighted direction, partial completion, deterministic tie ordering, and empty answers.

## Data, localisation, and query strategy

- Seed clearly-labelled temporary but realistic trilingual data: 9 directions, ≥36 professions, ≥15 universities, programs linking the catalogues, and ≥20 four-option questions. No reviews or made-up admission deadlines.
- `scripts/import-csv.ts` accepts one CSV per table, validates headers and relations, and upserts in dependency order. The README will document exact headers and expected JSON/array encoding.
- All chrome, controls, empty/error/loading copy, and seeded visible content have `ru`, `kk`, and `en` values. A translation parity script validates identical nested keys across message files in CI.
- Catalogue server queries parse URL search parameters. Profession filters use Prisma `where` conditions (`direction`, numeric `salaryAverage`, demand); university country filtering uses `University.country`. Sort is server-side. Match sort combines database rows with persisted client result only after retrieval, with a clear non-match fallback.
- Search normalises case and diacritics and searches localised name fields for each supported entity, returning grouped entity results. For PostgreSQL this uses `unaccent` + lowercase indexes/migration SQL; a tested normalisation fallback is retained for development environments.

## Implementation phases and verification

1. This plan only: review product requirements and agree unresolved data choices.
2. Scaffold app, strict tooling, Tailwind tokens, fonts, i18n routing, global layout and responsive navigation.
3. Add Prisma models/migration, placeholders seed, CSV importer, database helpers and seed/import documentation.
4. Implement test flow, pure scoring module, persistent last result and scoring unit tests.
5. Implement directions catalogue/detail and direction-to-profession navigation.
6. Implement profession catalogue/detail, URL filtering/sorting/search and program-derived university links.
7. Implement university catalogue/detail, URL filters, program display and review empty state.
8. Add favourites, global search, career map, admission checklist, grants, about and custom not-found states.
9. Polish responsive/accessibility/state behaviour, translation-key CI check, README and the complete Playwright journey.

Each phase is committed only after its relevant typecheck/tests pass. The final gate is `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.

## Open questions

1. The non-public Google Sheet remains the authoritative content source; who supplies CSV exports and the target header mapping for production data?
2. Which grant sources and country-specific rules may be presented as verified content? Until supplied, this page will avoid deadlines and amounts that cannot be sourced.
3. Does the production PostgreSQL role permit enabling the `unaccent` extension? If not, search needs a normalised indexed column maintained on import/seed.
4. The technical contract says no fabricated data but also requires placeholder seeds. The seed data will be explicitly marked and structured for replacement; it must not be represented as verified institutional/admission data.
5. Do university website/contact fields in placeholder data need to be omitted unless they can be verified, or is clearly-labelled temporary seed metadata acceptable during development?

---

## Data reality check (phase 3, after the source sheet became available)

The Google Sheet is now readable and is the source of truth. What it actually
contains differs from the assumptions in the technical contract, so the
following decisions were made and are reflected in the schema, the importer and
`README.md`.

- **Scope: Russian content only.** Interface chrome stays trilingual; catalogue
  columns `*_kk` / `*_en` are written empty and read through `lib/content.ts`,
  which falls back to Russian. An empty column means "not translated yet" and is
  never a Russian string masquerading as a translation.
- **Eight directions, not nine.** The sheet has no Agriculture direction. The
  home page and catalogue count directions from the database instead of
  hard-coding nine.
- **No salary figures exist.** `Средняя зарплата` is a level ("Высокая"),
  not a number. Added `salaryLabel` (verbatim) and `salaryRank` (for sorting);
  `salaryAverage` stays null and no tenge figure is displayed or invented. The
  numeric minimum-salary filter is implemented against `salaryAverage` but is
  only offered while numeric salaries exist in the database.
- **Ratings are not one scale.** World ranks, ranges and national "топ-N"
  positions are mixed. Added `ratingLabel` (verbatim); numeric `rating` is set
  only for a single plausible world-ranking position, and rating is not offered
  as a sort key.
- **Tuition carries a currency.** Added `tuitionCurrency` and `tuitionNote`
  (raw cell). Amounts are parsed per currency and never converted.
- **Admission belongs in its own table.** New `Admission` model, one row per
  university, every field nullable so unknown exams/IELTS/SAT/grants/deadlines
  stay absent instead of being fabricated.
- **Programs come from `Направления`** — one per university × direction — and
  attach to a specific profession only when an English specialty name appears
  verbatim in the university's `осн. направления` cell.
- **The test does not score directions.** Answers are tagged with twelve
  archetype labels across three blocks. `lib/test-mapping.ts` holds the single
  explicit archetype → direction weight table used by the importer; it is a
  product decision, documented as such, and `Option.archetype` keeps the raw
  label. Re-tune the table and re-import to change results.
- **Idempotency.** `Program`, `Question` and `Option` gained a unique
  `sourceKey`; every import upserts by a stable key and deletes rows that
  disappeared from the sheet.
