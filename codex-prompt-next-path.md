# Codex task: build the Next Path MVP

## Context

Next Path is a career-guidance web platform for schoolchildren aged 14–18 in Kazakhstan (grades 8–11) and university applicants. It walks a user through one chain: **test → matching directions → professions → universities → admission plan → career path**. The full product brief is in `BRIEF.md` at the repo root (Russian) — read it before writing code; this document is the technical contract, `BRIEF.md` is the product detail.

There is no existing codebase. Start from an empty repository.

## Goal

A working, deployable MVP where a new visitor can open the site, take the test, get a computed result, explore directions and professions, find universities, save favourites, and see an admission plan and career path — in Russian, Kazakh or English — with no dead buttons, no placeholder pages and no fabricated data.

## Stack (fixed — do not substitute)

- Next.js 15, App Router, TypeScript in `strict` mode
- Tailwind CSS v4, no component library beyond `lucide-react` for icons
- Prisma ORM + PostgreSQL
- `next-intl` for localisation (`ru`, `kk`, `en`), locale as a route segment: `/[locale]/...`
- `next/font` with a variable font that has full Cyrillic coverage (Inter or Manrope)
- Vitest for unit tests, Playwright for one end-to-end journey test
- No authentication, no AI/LLM calls, no paid third-party services, no analytics

Anonymous state (favourites, last test result) lives in `localStorage` behind a single module `lib/user-state.ts` so it can later be swapped for a server-side store without touching components.

## Phases

Work in this order and commit after each phase. Do not start a phase before the previous one typechecks and its tests pass.

1. **Plan.** Write `PLAN.md`: file tree, route list, Prisma schema, scoring algorithm in pseudocode, open questions. Stop and output it before touching anything else.
2. Project scaffold, Tailwind design tokens, i18n wiring, layout shell (header, nav, language switcher, footer).
3. Prisma schema + migrations + seed script + CSV import script.
4. Test engine: questions, scoring, results page.
5. Directions catalogue and direction detail.
6. Professions catalogue (search, filters, sorting) and profession detail.
7. Universities catalogue (search, filters) and university detail.
8. Favourites, global search, career map, admission plan, grants page, about page, 404.
9. Polish: empty/loading/error states everywhere, mobile pass, README.

## Data model

Prisma schema. Every user-visible text field is localised as three columns (`*_ru`, `*_kk`, `*_en`) — do not use a single string column and translate at runtime.

- **Direction** — `id`, `slug`, `name_*`, `description_*`, `whoItSuits_*`, `skills` (string[]), `schoolSubjects` (string[]), `icon`
- **Profession** — `id`, `slug`, `name_*`, `shortDescription_*`, `whatTheyDo_*`, `salaryMin`, `salaryMax`, `salaryAverage` (integers, KZT, nullable), `demand` (enum `LOW|MEDIUM|HIGH`), `pros_*` (string[]), `cons_*` (string[]), `skills` (string[]), `schoolSubjects` (string[]), `careerLadder` (Json: ordered steps with localised titles), `directionId`
- **University** — `id`, `slug`, `name_*`, `country`, `city`, `rating` (Float, nullable), `tuitionMin`, `tuitionMax` (nullable), `website`, `email`, `phone`, `address`, `description_*`
- **Program** — `id`, `universityId`, `directionId`, `professionId` (nullable), `name_*`, `requirements_*`, `tuitionCost`
- **Question** — `id`, `order`, `text_*`, `category` (enum `INTERESTS|APTITUDES|ACTIVITY_TYPE`)
- **Option** — `id`, `questionId`, `text_*`, `weights` (Json: `{ directionSlug: number }`)
- **Review** — `id`, `universityId`, `programId`, `author`, `year`, `text`, `rating`

Relations: Direction 1→N Profession. Profession N↔N University **through** Program. University 1→N Program.

`Review` must be created in the schema but **seeded empty**. The UI shows the empty state. Never generate sample reviews.

## Test scoring — implement exactly this

Pure function in `lib/scoring.ts`, no DB access, fully unit-tested.

```
input:  answers: { questionId, optionId }[], allQuestionsWithOptions
output: { directionSlug, percent }[] sorted desc

for each direction d:
  raw[d]   = sum over answered questions of (selected option).weights[d] ?? 0
  max[d]   = sum over ALL questions of max(weights[d] across that question's options)
  percent[d] = max[d] === 0 ? 0 : round(raw[d] / max[d] * 100)
```

Return all 9 directions sorted by percent descending; the results page displays the top 3 prominently and the rest below. The function must be deterministic — identical answers always give identical percentages. Write unit tests covering: all-in-one-direction answers, evenly spread answers, a direction with zero weight anywhere, and partial completion.

## Routes

```
/[locale]                      home
/[locale]/test                 test (one question per screen, progress, back)
/[locale]/test/results         results
/[locale]/directions           directions catalogue
/[locale]/directions/[slug]    direction detail
/[locale]/professions          professions catalogue (search + filters + sort)
/[locale]/professions/[slug]   profession detail
/[locale]/universities         universities catalogue (search + filters)
/[locale]/universities/[slug]  university detail
/[locale]/favorites            favourites, tabbed: all / professions / universities / directions
/[locale]/career-path          career map, per selected profession
/[locale]/admission-plan       step checklist
/[locale]/grants               grants information
/[locale]/search               global search results
/[locale]/about                about the project
```

Plus a custom `not-found.tsx`.

## Requirements that must be real, not decorative

These are the acceptance criteria — each one is verifiable and each one has failed in similar builds, so test them:

- **Filters query the database.** Filtering professions by direction returns only that direction's professions. Filtering by minimum salary compares against the numeric `salaryAverage`. Filtering universities by country returns only that country's universities. Filter state lives in the URL query string so results are shareable and survive reload.
- **Sorting works** on name, salary ascending, salary descending, demand, and — when a test result exists in `localStorage` — match with the user's results.
- **Search** matches profession, direction, university and program names, case- and diacritic-insensitively, in whichever of the three languages the entry has. Global search returns results grouped by entity type.
- **Profession → university links come from the `Program` join table**, not from a hardcoded list. A profession page with no linked programs shows an empty state, not an empty section.
- **Every button** either performs an action or navigates to a route that exists. No `href="#"`, no `onClick={() => {}}`.
- **Language switching** swaps the entire page: navigation, headings, body copy, buttons, filter labels, empty states, error messages, and seeded content. Mixed-language screens are a build failure. Add a CI check that fails if any translation key is missing from any of the three locale files.
- **No invented data.** If a university has no rating, hide the rating block. If admission deadlines are unknown, the deadlines section does not render — never show placeholder or plausible-looking dates.
- **Salaries display as numbers** with a ₸ suffix and thousands separators, as a range when both bounds exist, never as the words "high/medium/low".
- **Every interactive surface implements** default, hover, active, disabled, loading, error and empty states.
- The test can be taken and results viewed **without registering or entering any personal data**.

## Seed data

The real content already exists — directions, professions, universities and their relationships are maintained by the team in a Google Sheet:

`https://docs.google.com/spreadsheets/d/1Xs8wDhcSZ544TUtjivsJa4rVWoBGFc3up97IPDviBRc/edit`

You will not be able to open it; it is not public and you have no Drive access. Treat it as the source of truth that will replace your seeds, and design accordingly:

- Write `prisma/seed.ts` with realistic placeholder content, typed against the schema, marked clearly with a `SEED_DATA_PLACEHOLDER` comment block at the top.
- Cover all 9 directions: IT/AI, Medicine, Engineering/Architecture, Business/Economics, Design/Creative, Psychology/Social sciences, Law/Public administration, Education/Science, Agriculture.
- At least 4 professions per direction, at least 15 universities (mix of Kazakh and foreign), at least 20 test questions with 4 options each and weights that actually distinguish the directions.
- Every seeded record must be filled in all three languages. No `TODO` strings in seeded content.
- Also write `scripts/import-csv.ts` that ingests one CSV per table into the same schema, so the real data can replace the placeholders without code changes. Document the expected column headers in `README.md`.

## Design direction

Light, airy, modern — an education product a student, a parent and a university would each take seriously. Not a template, not a dark dashboard, not a neon AI landing page.

- Light background, soft pastel accents, colour used to orient rather than decorate
- Generous whitespace, clear type scale (H1/H2/H3/body/caption/button), one icon family
- Cards for directions, professions, universities, results and favourites: consistent structure, one clear action each
- Restrained motion — transitions under 200ms, no scroll-triggered animation, no parallax
- Mobile first. On small screens: cards stack, filters collapse into a bottom sheet or drawer, nav collapses, tap targets stay ≥44px, no horizontal overflow, no table breaking the layout
- Define colours, spacing and typography as Tailwind theme tokens in one file. No arbitrary hex values in components.

## Definition of done

Run and pass all of these before you report completion:

```bash
pnpm typecheck   # tsc --noEmit, zero errors
pnpm lint        # zero errors
pnpm test        # unit tests, including lib/scoring.ts
pnpm test:e2e    # Playwright journey below
pnpm build       # production build succeeds
```

The Playwright test must walk the whole journey in one run: open home → start test → answer all questions → land on results with non-zero percentages → open the top direction → open a profession from it → verify salary and demand render → click through to universities → open a university → add it to favourites → open favourites and see it → open the admission plan → open the career path. Then repeat the first three steps with the locale switched to `kk` and assert no Russian or English strings appear on the page.

## Non-goals for this build

User accounts, payments, admin panel, AI recommendations, review content, real admission deadlines, mobile apps. Do not add dependencies beyond those listed without saying so in `PLAN.md` and explaining why.

## Output

`PLAN.md` first, then the implementation in the phase order above, one commit per phase with a descriptive message. Finish with a `README.md` covering local setup, environment variables, database migration, seeding, CSV import and deployment.
