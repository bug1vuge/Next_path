/**
 * Imports the team's Google Sheet into PostgreSQL.
 *
 *   pnpm db:import:sheet                  # download the published sheet
 *   pnpm db:import:sheet ./local.xlsx     # or import a local .xlsx export
 *
 * The import is idempotent: every row is addressed by a stable key derived from
 * the source (slug or `sourceKey`), so re-running updates rows instead of
 * duplicating them, and rows that disappeared from the sheet are removed.
 *
 * Content is Russian. Kazakh and English columns are written empty on purpose —
 * see `lib/content.ts`. Unknown values (ratings, deadlines, tuition in an
 * unparsed currency) stay absent rather than being invented.
 */
import {readFile} from "node:fs/promises";
import * as XLSX from "xlsx";
import {PrismaClient, type Prisma} from "@prisma/client";
import {categoryForBlock, weightsForArchetype} from "../lib/test-mapping";
import {
  directionSlug,
  matchKey,
  optionalText,
  parseDemand,
  parseRating,
  parseSalaryAmount,
  parseSalaryLevel,
  parseTuition,
  slugify,
  specialtyTokens,
  splitList,
  text
} from "./source-parsing";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1Xs8wDhcSZ544TUtjivsJa4rVWoBGFc3up97IPDviBRc/export?format=xlsx";

const SHEETS = {
  tests: "Тесты",
  directions: "Направления",
  professions: "Профессии",
  universities: "Университеты",
  admission: "Поступление",
  contacts: "Контакты университетов",
  explanations: "Направления объяснение "
} as const;

const DIRECTION_ICONS: Record<string, string> = {
  "it-ai": "cpu",
  medicine: "stethoscope",
  "engineering-architecture": "ruler",
  "business-economics": "briefcase",
  "design-creative": "palette",
  "psychology-social-sciences": "brain",
  "law-government": "scale",
  "education-science": "flask-conical"
};

type Row = Record<string, unknown>;

const db = new PrismaClient();
const warnings: string[] = [];

function warn(message: string) {
  warnings.push(message);
}

function sheetRows(workbook: XLSX.WorkBook, name: string): Row[] {
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Sheet "${name}" is missing from the workbook.`);
  return XLSX.utils.sheet_to_json<Row>(sheet, {defval: ""});
}

async function loadWorkbook(path?: string): Promise<XLSX.WorkBook> {
  if (path) return XLSX.read(await readFile(path), {type: "buffer"});
  const response = await fetch(SHEET_URL);
  if (!response.ok) throw new Error(`Google Sheet download failed: ${response.status} ${response.statusText}`);
  return XLSX.read(Buffer.from(await response.arrayBuffer()), {type: "buffer"});
}

/** Most frequent values first — used to summarise a direction from its professions. */
function topValues(values: string[], limit: number): string[] {
  const counts = new Map<string, {label: string; count: number}>();
  for (const value of values) {
    const key = matchKey(value);
    if (!key) continue;
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, {label: value.replace(/^./, (char) => char.toUpperCase()), count: 1});
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ru"))
    .slice(0, limit)
    .map((entry) => entry.label);
}

async function importDirections(workbook: XLSX.WorkBook) {
  const rows = sheetRows(workbook, SHEETS.directions);
  const explanations = new Map(
    sheetRows(workbook, SHEETS.explanations).map((row) => [directionSlug(text(row["Направление"])), text(row["Объяснение"])])
  );

  const slugs: string[] = [];
  for (const [index, row] of rows.entries()) {
    const name = text(row["Направление"]);
    if (!name) continue;
    const slug = directionSlug(name);
    const description = text(row["Описание"]);
    const whoItSuits = explanations.get(slug) ?? "";
    if (!whoItSuits) warn(`Direction "${name}" has no "Объяснение" row.`);

    const data = {
      sortOrder: index,
      name_ru: name,
      name_kk: "",
      name_en: "",
      description_ru: description,
      description_kk: "",
      description_en: "",
      whoItSuits_ru: whoItSuits,
      whoItSuits_kk: "",
      whoItSuits_en: "",
      icon: DIRECTION_ICONS[slug] ?? "compass"
    };
    await db.direction.upsert({
      where: {slug},
      update: data,
      create: {...data, slug, skills: [], schoolSubjects: []}
    });
    slugs.push(slug);
  }

  const removed = await db.direction.deleteMany({where: {slug: {notIn: slugs}}});
  return {imported: slugs.length, removed: removed.count};
}

async function importProfessions(workbook: XLSX.WorkBook) {
  const rows = sheetRows(workbook, SHEETS.professions);
  const directions = new Map((await db.direction.findMany()).map((direction) => [direction.slug, direction.id]));
  const directionSlugById = new Map((await db.direction.findMany()).map((direction) => [direction.id, direction.slug]));
  const slugs: string[] = [];
  const taken = new Set<string>();
  const unmatchedDirections = new Set<string>();
  const duplicates: string[] = [];
  let numericSalaries = 0;

  for (const row of rows) {
    const name = text(row["Профессия"]);
    const directionName = text(row["Направление"]);
    if (!name) continue;
    const directionId = directions.get(directionSlug(directionName));
    if (!directionId) {
      unmatchedDirections.add(directionName);
      continue;
    }

    // The same profession name appears under more than one direction; the
    // direction is appended so neither row overwrites the other.
    const baseSlug = slugify(name);
    let slug = baseSlug;
    if (taken.has(slug)) {
      slug = `${baseSlug}-${directionSlugById.get(directionId) ?? "direction"}`;
      duplicates.push(`${name} (${directionName.trim()})`);
    }
    for (let suffix = 2; taken.has(slug); suffix += 1) slug = `${baseSlug}-${suffix}`;
    taken.add(slug);

    const description = text(row["Чем занимается"]);
    const salary = parseSalaryLevel(row["Средняя зарплата"]);
    const salaryAverage = parseSalaryAmount(row["Средняя зарплата"]);
    if (salaryAverage !== null) numericSalaries += 1;
    const demand = parseDemand(row["Востребованность"]);
    const pros = splitList(row["Плюсы"]);
    const cons = splitList(row["Минусы"]);

    const data = {
      directionId,
      name_ru: name,
      name_kk: "",
      name_en: "",
      shortDescription_ru: description,
      shortDescription_kk: "",
      shortDescription_en: "",
      whatTheyDo_ru: description,
      whatTheyDo_kk: "",
      whatTheyDo_en: "",
      salaryMin: null,
      salaryMax: null,
      salaryAverage,
      salaryLabel: salary.label,
      salaryRank: salary.rank,
      demand: demand.demand,
      demandLabel: demand.label,
      demandRank: demand.rank,
      specialties: splitList(row["Специальности"]),
      pros_ru: pros,
      pros_kk: [],
      pros_en: [],
      cons_ru: cons,
      cons_kk: [],
      cons_en: [],
      skills: splitList(row["Навыки"]),
      schoolSubjects: splitList(row["Предметы"]),
      careerLadder: [] as Prisma.InputJsonValue
    };

    await db.profession.upsert({where: {slug}, update: data, create: {...data, slug}});
    slugs.push(slug);
  }

  for (const name of unmatchedDirections) warn(`Profession direction "${name}" does not match any direction row.`);
  for (const entry of duplicates) warn(`Profession name repeats across directions, slug disambiguated: ${entry}`);
  const removed = await db.profession.deleteMany({where: {slug: {notIn: slugs}}});
  return {imported: slugs.length, removed: removed.count, numericSalaries};
}

/** Fills each direction's skills and subjects from the professions it contains. */
async function summariseDirections() {
  const directions = await db.direction.findMany({include: {professions: true}});
  for (const direction of directions) {
    await db.direction.update({
      where: {id: direction.id},
      data: {
        skills: topValues(direction.professions.flatMap((profession) => profession.skills), 8),
        schoolSubjects: topValues(direction.professions.flatMap((profession) => profession.schoolSubjects), 6)
      }
    });
  }
}

async function importUniversities(workbook: XLSX.WorkBook) {
  const rows = sheetRows(workbook, SHEETS.universities);
  const contacts = new Map(sheetRows(workbook, SHEETS.contacts).map((row) => [matchKey(row["Университет"]), row]));
  const admissions = new Map(sheetRows(workbook, SHEETS.admission).map((row) => [matchKey(row["Университет"]), row]));
  const usedContacts = new Set<string>();
  const usedAdmissions = new Set<string>();

  const slugs: string[] = [];
  let withAdmission = 0;
  let withContacts = 0;
  let withTuition = 0;
  let withRating = 0;

  for (const row of rows) {
    const name = text(row["Название"]);
    if (!name) continue;
    const slug = slugify(name);
    const key = matchKey(name);
    const contact = contacts.get(key);
    const admission = admissions.get(key);
    if (contact) usedContacts.add(key);
    if (admission) usedAdmissions.add(key);

    const tuition = parseTuition(row["стоимость/год"]);
    const rating = parseRating(row["рейтинг"]);
    const fields = optionalText(row["осн. направления"]);
    if (tuition.min !== null) withTuition += 1;
    if (rating.label) withRating += 1;

    const data = {
      name_ru: name,
      name_kk: "",
      name_en: "",
      country: text(row["страна"]) || "Казахстан",
      city: text(row["город"]),
      rating: rating.rating,
      ratingLabel: rating.label,
      tuitionMin: tuition.min,
      tuitionMax: tuition.max,
      tuitionCurrency: tuition.currency,
      tuitionNote: tuition.note,
      website: optionalText(contact?.["Cайт"]),
      email: optionalText(contact?.["email"]),
      phone: optionalText(contact?.["Телефон"]),
      address: null,
      description_ru: fields ?? "",
      description_kk: "",
      description_en: ""
    };

    const university = await db.university.upsert({where: {slug}, update: data, create: {...data, slug}});
    slugs.push(slug);
    if (contact) withContacts += 1;

    const admissionData = {
      exams: optionalText(admission?.["Экзамены"]),
      ielts: optionalText(admission?.["IELTS"]),
      sat: optionalText(admission?.["SAT"]),
      grants: optionalText(admission?.["Гранты"]),
      deadline: optionalText(admission?.["Дедлайн"])
    };
    const hasAdmission = Object.values(admissionData).some((value) => value !== null);
    if (hasAdmission) {
      withAdmission += 1;
      await db.admission.upsert({
        where: {universityId: university.id},
        update: admissionData,
        create: {...admissionData, universityId: university.id}
      });
    } else {
      await db.admission.deleteMany({where: {universityId: university.id}});
    }
  }

  for (const key of contacts.keys()) {
    if (key === "") warn("Contacts sheet contains a blank row.");
    else if (!usedContacts.has(key)) warn(`Contacts row "${key}" matches no university.`);
  }
  for (const key of admissions.keys()) {
    if (key === "") warn("Admission sheet contains a blank row.");
    else if (!usedAdmissions.has(key)) warn(`Admission row "${key}" matches no university.`);
  }

  const removed = await db.university.deleteMany({where: {slug: {notIn: slugs}}});
  return {imported: slugs.length, removed: removed.count, withAdmission, withContacts, withTuition, withRating};
}

/**
 * Builds Program rows from the universities sheet.
 *
 * `Направления` is the structured column and gives one program per
 * university × direction. A program is additionally attached to a profession
 * when an English specialty name from the professions sheet appears verbatim in
 * that university's free-text "осн. направления" cell — the only
 * profession-level signal the source actually contains. No other link is
 * guessed.
 */
async function importPrograms(workbook: XLSX.WorkBook) {
  const rows = sheetRows(workbook, SHEETS.universities);
  const directions = new Map((await db.direction.findMany()).map((direction) => [direction.slug, direction]));
  const universities = new Map((await db.university.findMany({include: {admission: true}})).map((item) => [item.slug, item]));
  const professions = await db.profession.findMany();

  const keys: string[] = [];
  const unmatchedTokens = new Set<string>();
  let professionLinks = 0;

  for (const row of rows) {
    const name = text(row["Название"]);
    if (!name) continue;
    const university = universities.get(slugify(name));
    if (!university) continue;

    const admission = university.admission;
    const requirements = [
      admission?.exams ? `Экзамены: ${admission.exams}` : null,
      admission?.ielts ? `IELTS: ${admission.ielts}` : null,
      admission?.sat ? `SAT: ${admission.sat}` : null
    ]
      .filter((line): line is string => line !== null)
      .join("\n");

    const tokens = specialtyTokens(row["осн. направления"]);

    for (const token of splitList(row["Направления"])) {
      const direction = directions.get(directionSlug(token));
      if (!direction) {
        unmatchedTokens.add(token);
        continue;
      }

      const directionKey = `${university.slug}:${direction.slug}`;
      const directionData = {
        universityId: university.id,
        directionId: direction.id,
        professionId: null,
        name_ru: direction.name_ru,
        name_kk: "",
        name_en: "",
        requirements_ru: requirements,
        requirements_kk: "",
        requirements_en: "",
        tuitionCost: null
      };
      await db.program.upsert({
        where: {sourceKey: directionKey},
        update: directionData,
        create: {...directionData, sourceKey: directionKey}
      });
      keys.push(directionKey);

      for (const profession of professions) {
        if (profession.directionId !== direction.id) continue;
        const specialty = profession.specialties.find((value) => tokens.has(matchKey(value)));
        if (!specialty) continue;

        const professionKey = `${university.slug}:${direction.slug}:${profession.slug}`;
        const professionData = {
          universityId: university.id,
          directionId: direction.id,
          professionId: profession.id,
          name_ru: specialty,
          name_kk: "",
          name_en: "",
          requirements_ru: requirements,
          requirements_kk: "",
          requirements_en: "",
          tuitionCost: null
        };
        await db.program.upsert({
          where: {sourceKey: professionKey},
          update: professionData,
          create: {...professionData, sourceKey: professionKey}
        });
        keys.push(professionKey);
        professionLinks += 1;
      }
    }
  }

  for (const token of unmatchedTokens) warn(`University direction token "${token}" matches no direction.`);
  const removed = await db.program.deleteMany({where: {sourceKey: {notIn: keys}}});
  return {imported: keys.length, removed: removed.count, professionLinks};
}

async function importTest(workbook: XLSX.WorkBook) {
  const rows = sheetRows(workbook, SHEETS.tests);
  const questionKeys: string[] = [];
  const optionKeys: string[] = [];
  const unmatchedArchetypes = new Set<string>();
  let weighted = 0;

  for (const [index, row] of rows.entries()) {
    const questionText = text(row["Вопрос"]);
    if (!questionText) continue;
    const order = index + 1;
    const block = text(row["Тип теста"]);
    const sourceKey = `q-${order}`;

    const questionData = {
      order,
      block,
      text_ru: questionText,
      text_kk: "",
      text_en: "",
      category: categoryForBlock(block)
    };
    const question = await db.question.upsert({
      where: {sourceKey},
      update: questionData,
      create: {...questionData, sourceKey}
    });
    questionKeys.push(sourceKey);

    for (const letter of ["A", "B", "C", "D"] as const) {
      const optionText = text(row[letter]);
      if (!optionText) continue;
      const archetype = text(row[`${letter} - направление`]);
      const weights = weightsForArchetype(archetype);
      if (!weights) unmatchedArchetypes.add(archetype);
      else weighted += 1;

      const optionKey = `${sourceKey}-${letter}`;
      const optionData = {
        questionId: question.id,
        archetype,
        text_ru: optionText,
        text_kk: "",
        text_en: "",
        weights: (weights ?? {}) as Prisma.InputJsonValue
      };
      await db.option.upsert({
        where: {sourceKey: optionKey},
        update: optionData,
        create: {...optionData, sourceKey: optionKey}
      });
      optionKeys.push(optionKey);
    }
  }

  for (const archetype of unmatchedArchetypes) {
    warn(`Answer archetype "${archetype}" has no direction weights in lib/test-mapping.ts.`);
  }

  const removedOptions = await db.option.deleteMany({where: {sourceKey: {notIn: optionKeys}}});
  const removedQuestions = await db.question.deleteMany({where: {sourceKey: {notIn: questionKeys}}});
  return {
    questions: questionKeys.length,
    options: optionKeys.length,
    weighted,
    removed: removedQuestions.count + removedOptions.count
  };
}

/** Reads back what is actually stored, so the summary reflects the database. */
async function verify() {
  const [directions, professions, universities, programs, questions, options, admissions, reviews] = await Promise.all([
    db.direction.count(),
    db.profession.count(),
    db.university.count(),
    db.program.count(),
    db.question.count(),
    db.option.count(),
    db.admission.count(),
    db.review.count()
  ]);

  const perDirection = await db.direction.findMany({
    orderBy: {sortOrder: "asc"},
    include: {_count: {select: {professions: true, programs: true}}}
  });
  const optionsWithoutWeights = await db.option.count({where: {weights: {equals: {}}}});
  const countries = await db.university.groupBy({by: ["country"], _count: {_all: true}, orderBy: {country: "asc"}});

  console.log("\nDatabase after import");
  console.log("─".repeat(64));
  console.table({
    directions,
    professions,
    universities,
    programs,
    admissions,
    questions,
    options,
    reviews
  });

  console.log("\nPer direction");
  console.table(
    perDirection.map((direction) => ({
      slug: direction.slug,
      name: direction.name_ru,
      professions: direction._count.professions,
      programs: direction._count.programs,
      skills: direction.skills.length,
      whoItSuits: direction.whoItSuits_ru ? "yes" : "MISSING"
    }))
  );

  console.log("\nUniversities by country");
  console.table(countries.map((entry) => ({country: entry.country, universities: entry._count._all})));

  const issues: string[] = [];
  if (optionsWithoutWeights > 0) issues.push(`${optionsWithoutWeights} answer options carry no direction weights`);
  if (questions * 4 !== options) issues.push(`${questions} questions but ${options} options (expected 4 per question)`);
  if (reviews > 0) issues.push(`${reviews} reviews present — reviews must stay empty`);
  return issues;
}

async function main() {
  const started = Date.now();
  const path = process.argv[2];
  console.log(path ? `Importing local workbook ${path}` : "Downloading the published Google Sheet…");
  const workbook = await loadWorkbook(path);

  const directions = await importDirections(workbook);
  const professions = await importProfessions(workbook);
  await summariseDirections();
  const universities = await importUniversities(workbook);
  const programs = await importPrograms(workbook);
  const test = await importTest(workbook);

  console.log("\nImported from the sheet");
  console.log("─".repeat(64));
  console.table({
    directions: {rows: directions.imported, removed: directions.removed},
    professions: {rows: professions.imported, removed: professions.removed},
    universities: {rows: universities.imported, removed: universities.removed},
    programs: {rows: programs.imported, removed: programs.removed},
    questions: {rows: test.questions, removed: test.removed},
    options: {rows: test.options, removed: 0}
  });
  console.log(
    [
      `Universities with contacts: ${universities.withContacts}/${universities.imported}`,
      `with admission details: ${universities.withAdmission}`,
      `with a parsed tuition figure: ${universities.withTuition}`,
      `with a rating value: ${universities.withRating}`
    ].join("\n")
  );
  console.log(`Programs linked to a specific profession: ${programs.professionLinks}`);
  console.log(`Answer options with direction weights: ${test.weighted}/${test.options}`);
  console.log(
    professions.numericSalaries === 0
      ? "Numeric salaries in the source: none — the sheet records pay as a level, so salary figures stay empty."
      : `Professions with a numeric salary: ${professions.numericSalaries}`
  );

  const issues = await verify();

  if (warnings.length > 0) {
    console.log(`\nSource warnings (${warnings.length})`);
    console.log("─".repeat(64));
    for (const message of warnings) console.log(`  • ${message}`);
  }
  if (issues.length > 0) {
    console.log("\nConsistency issues");
    console.log("─".repeat(64));
    for (const issue of issues) console.log(`  • ${issue}`);
  }
  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  if (issues.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
