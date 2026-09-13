/**
 * Imports the team's Google Sheet into PostgreSQL.
 *
 *   pnpm db:import:sheet                  # download the published sheet
 *   pnpm db:import:sheet ./local.xlsx     # or import a local .xlsx export
 *
 * Every sheet exists three times — a Russian, a Kazakh and an English tab — with
 * the same rows in the same order and translated headers. Rows are therefore
 * paired across languages by position, and columns are read by position too.
 * The Russian tab provides identity (slugs, keys) and every number; the
 * translations provide text. The import refuses to run when the three tabs of a
 * sheet differ in row count, because one missing row would silently pair every
 * later row with the wrong translation.
 *
 * The import is idempotent: every row is addressed by a stable key derived from
 * the source (slug or `sourceKey`), so re-running updates rows instead of
 * duplicating them, and rows that disappeared from the sheet are removed.
 * Unknown values (ratings, deadlines, tuition in an unparsed currency) stay
 * absent rather than being invented.
 */
import {readFile} from "node:fs/promises";
import * as XLSX from "xlsx";
import {PrismaClient, type Admission, type Prisma} from "@prisma/client";
import {categoryForBlock, weightsForArchetype} from "../lib/test-mapping";
import {correct, TEST_CORRECTIONS, type Correction} from "./source-corrections";
import {
  directionSlug,
  inlineText,
  matchKey,
  optionalText,
  parseDemand,
  parseRating,
  parseSalaryAmount,
  parseSalaryLevel,
  parseTuition,
  sentenceCase,
  slugify,
  specialtyTokens,
  splitList,
  text
} from "./source-parsing";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1kxRgInOc2-iqbeJ4g06WERSEdyOw3mjZkYCZzTwRuf8/export?format=xlsx";

type Lang = "ru" | "kk" | "en";
const LANGS: Lang[] = ["ru", "kk", "en"];
const TAB_SUFFIX: Record<Lang, string> = {ru: "рус", kk: "каз", en: "англ"};

/** Column positions. Headers differ per language, positions do not. */
const DIRECTION = {name: 0, description: 1};
const EXPLANATION = {direction: 0, text: 1};
const PROFESSION = {direction: 0, name: 1, whatTheyDo: 2, salary: 3, demand: 4, pros: 5, cons: 6, subjects: 7, skills: 8, specialties: 9};
const UNIVERSITY = {name: 0, country: 1, city: 2, directions: 3, mainFields: 4, rating: 5, tuition: 6};
const ADMISSION = {university: 0, exams: 1};
const TEST = {question: 0, options: {A: 1, B: 2, C: 3, D: 4}, archetypes: {A: 5, B: 6, C: 7, D: 8}, block: 9};

/**
 * Admission columns an earlier revision of the sheet carried. When the current
 * sheet has dropped one, the values already stored for it are kept: a column
 * that is absent says nothing about the data, unlike a column left blank.
 */
const LEGACY_ADMISSION = {ielts: "IELTS", sat: "SAT", grants: "Гранты", deadline: "Дедлайн"} as const;

const REQUIREMENT_LABEL: Record<Lang, string> = {ru: "Экзамены", kk: "Емтихандар", en: "Exams"};

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

type Cells = unknown[];
type Sheet = {header: string[]; rows: Cells[]};
type Localised = Record<Lang, Sheet>;
type Triple<Value> = Record<Lang, Value>;

const db = new PrismaClient();
const warnings: string[] = [];

function warn(message: string) {
  warnings.push(message);
}

/** Tab names carry typos and stray spaces ("Професии англ", "Направление объяснение рус "). */
function tabKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    // `\b` only knows ASCII word characters, so Cyrillic word ends use a lookahead.
    .replace(/^професии(?=\s|$)/, "профессии")
    .replace(/^направление(?=\s|$)/, "направления");
}

function findTab(workbook: XLSX.WorkBook, wanted: string): XLSX.WorkSheet {
  const name = workbook.SheetNames.find((candidate) => tabKey(candidate) === wanted);
  if (!name) throw new Error(`Sheet "${wanted}" is missing from the workbook (tabs: ${workbook.SheetNames.join(", ")}).`);
  return workbook.Sheets[name];
}

function readSheet(sheet: XLSX.WorkSheet): Sheet {
  const [header = [], ...rows] = XLSX.utils.sheet_to_json<unknown[]>(sheet, {header: 1, defval: ""});
  return {
    header: header.map((cell) => text(cell)),
    rows: rows.filter((row) => row.some((cell) => text(cell) !== ""))
  };
}

function localised(workbook: XLSX.WorkBook, base: string): Localised {
  const sheets = Object.fromEntries(
    LANGS.map((lang) => [lang, readSheet(findTab(workbook, `${base} ${TAB_SUFFIX[lang]}`))])
  ) as Localised;
  const counts = LANGS.map((lang) => sheets[lang].rows.length);
  if (new Set(counts).size > 1) {
    throw new Error(
      `"${base}" has ${counts.join(" / ")} rows across ru / kk / en — the three tabs must list the same rows in the same order.`
    );
  }
  return sheets;
}

/** One cell of one row, in every language. */
function cell(sheet: Localised, row: number, column: number): Triple<unknown> {
  return {ru: sheet.ru.rows[row][column], kk: sheet.kk.rows[row][column], en: sheet.en.rows[row][column]};
}

function texts(values: Triple<unknown>, read: (value: unknown) => string = text): Triple<string> {
  return {ru: read(values.ru), kk: read(values.kk), en: read(values.en)};
}

function optionals(values: Triple<unknown>): Triple<string | null> {
  return {ru: optionalText(values.ru), kk: optionalText(values.kk), en: optionalText(values.en)};
}

function lists(values: Triple<unknown>): Triple<string[]> {
  return {ru: splitList(values.ru), kk: splitList(values.kk), en: splitList(values.en)};
}

/**
 * A Russian row with fewer filled cells than its translations usually has a
 * value in the wrong column — every later cell then lands in the wrong field.
 * It is reported, not repaired: which cell moved is for the team to confirm.
 */
function checkRowShape(sheetName: string, sheet: Localised, row: number, label: string) {
  const filled = (lang: Lang) => sheet[lang].rows[row].filter((value) => optionalText(value) !== null).length;
  const [ru, kk, en] = LANGS.map(filled);
  if (ru < Math.max(kk, en)) {
    warn(
      `${sheetName} рус, row ${row + 2} (${label}): ${ru} filled cells against ${kk} / ${en} in the translations — a value is missing or sits in the wrong column.`
    );
  }
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
  const sheet = localised(workbook, "направления");
  const explanations = localised(workbook, "направления объяснение");

  // Explanations are keyed by the English direction label, which every tab of that sheet shares.
  const explanationRow = new Map(
    explanations.ru.rows.map((row, index) => [directionSlug(text(row[EXPLANATION.direction])), index])
  );

  const slugs: string[] = [];
  for (const [index] of sheet.ru.rows.entries()) {
    // The Russian tab names directions in Russian; the English tab keeps the label
    // the professions and universities sheets use, so the key comes from there.
    const key = text(sheet.en.rows[index][DIRECTION.name]);
    if (!key) continue;
    const slug = directionSlug(key);
    const name = texts(cell(sheet, index, DIRECTION.name));
    const description = texts(cell(sheet, index, DIRECTION.description));
    const explanation = explanationRow.has(slug)
      ? texts(cell(explanations, explanationRow.get(slug) as number, EXPLANATION.text))
      : {ru: "", kk: "", en: ""};
    if (!explanation.ru) warn(`Direction "${key}" has no "Объяснение" row.`);

    const data = {
      sortOrder: index,
      name_ru: name.ru,
      name_kk: name.kk,
      name_en: name.en,
      description_ru: description.ru,
      description_kk: description.kk,
      description_en: description.en,
      whoItSuits_ru: explanation.ru,
      whoItSuits_kk: explanation.kk,
      whoItSuits_en: explanation.en,
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
  const sheet = localised(workbook, "профессии");
  const directions = await db.direction.findMany();
  const directionIdBySlug = new Map(directions.map((direction) => [direction.slug, direction.id]));
  const directionSlugById = new Map(directions.map((direction) => [direction.id, direction.slug]));
  const slugs: string[] = [];
  const taken = new Set<string>();
  const unmatchedDirections = new Set<string>();
  const duplicates: string[] = [];
  let numericSalaries = 0;

  for (const [index, row] of sheet.ru.rows.entries()) {
    const name = texts(cell(sheet, index, PROFESSION.name));
    const directionName = text(row[PROFESSION.direction]);
    if (!name.ru) continue;
    const directionId = directionIdBySlug.get(directionSlug(directionName));
    if (!directionId) {
      unmatchedDirections.add(directionName);
      continue;
    }
    checkRowShape("Профессии", sheet, index, name.ru);

    // The same profession name appears under more than one direction; the
    // direction is appended so neither row overwrites the other.
    const baseSlug = slugify(name.ru);
    let slug = baseSlug;
    if (taken.has(slug)) {
      slug = `${baseSlug}-${directionSlugById.get(directionId) ?? "direction"}`;
      duplicates.push(`${name.ru} (${directionName})`);
    }
    for (let suffix = 2; taken.has(slug); suffix += 1) slug = `${baseSlug}-${suffix}`;
    taken.add(slug);

    const description = texts(cell(sheet, index, PROFESSION.whatTheyDo));
    const salaryCell = cell(sheet, index, PROFESSION.salary);
    const salary = parseSalaryLevel(salaryCell.ru);
    const salaryLabel = optionals(salaryCell);
    const salaryAverage = parseSalaryAmount(salaryCell.ru);
    if (salaryAverage !== null) numericSalaries += 1;
    const demandCell = cell(sheet, index, PROFESSION.demand);
    const demand = parseDemand(demandCell.ru);
    const pros = lists(cell(sheet, index, PROFESSION.pros));
    const cons = lists(cell(sheet, index, PROFESSION.cons));
    const skills = lists(cell(sheet, index, PROFESSION.skills));
    const subjects = lists(cell(sheet, index, PROFESSION.subjects));
    // Specialties are English names in every tab; a Russian cell left blank can
    // take the value its translations state.
    const specialtyCells = lists(cell(sheet, index, PROFESSION.specialties));
    const specialties = specialtyCells.ru.length > 0 ? specialtyCells.ru : specialtyCells.en;

    const data = {
      directionId,
      name_ru: name.ru,
      name_kk: name.kk,
      name_en: name.en,
      shortDescription_ru: description.ru,
      shortDescription_kk: description.kk,
      shortDescription_en: description.en,
      whatTheyDo_ru: description.ru,
      whatTheyDo_kk: description.kk,
      whatTheyDo_en: description.en,
      salaryMin: null,
      salaryMax: null,
      salaryAverage,
      salaryLabel: salaryLabel.ru,
      salaryLabel_kk: salaryLabel.kk,
      salaryLabel_en: salaryLabel.en,
      salaryRank: salary.rank,
      demand: demand.demand,
      demandLabel: demand.label,
      demandLabel_kk: sentenceCase(optionalText(demandCell.kk)),
      demandLabel_en: sentenceCase(optionalText(demandCell.en)),
      demandRank: demand.rank,
      specialties,
      pros_ru: pros.ru,
      pros_kk: pros.kk,
      pros_en: pros.en,
      cons_ru: cons.ru,
      cons_kk: cons.kk,
      cons_en: cons.en,
      skills: skills.ru,
      skills_kk: skills.kk,
      skills_en: skills.en,
      schoolSubjects: subjects.ru,
      schoolSubjects_kk: subjects.kk,
      schoolSubjects_en: subjects.en,
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

/** Fills each direction's skills and subjects, per language, from the professions it contains. */
async function summariseDirections() {
  const directions = await db.direction.findMany({include: {professions: true}});
  for (const direction of directions) {
    const professions = direction.professions;
    await db.direction.update({
      where: {id: direction.id},
      data: {
        skills: topValues(professions.flatMap((profession) => profession.skills), 8),
        skills_kk: topValues(professions.flatMap((profession) => profession.skills_kk), 8),
        skills_en: topValues(professions.flatMap((profession) => profession.skills_en), 8),
        schoolSubjects: topValues(professions.flatMap((profession) => profession.schoolSubjects), 6),
        schoolSubjects_kk: topValues(professions.flatMap((profession) => profession.schoolSubjects_kk), 6),
        schoolSubjects_en: topValues(professions.flatMap((profession) => profession.schoolSubjects_en), 6)
      }
    });
  }
}

async function importUniversities(workbook: XLSX.WorkBook) {
  const sheet = localised(workbook, "университеты");
  const admissions = localised(workbook, "поступление");
  const contactRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(findTab(workbook, "контакты университетов"), {
    defval: ""
  });
  const contacts = new Map(contactRows.map((row) => [matchKey(row["Университет"]), row]));

  // Admission rows join a university by its Russian name; the translations of a
  // row are the rows at the same position in the other two tabs.
  const admissionRow = new Map(admissions.ru.rows.map((row, index) => [matchKey(row[ADMISSION.university]), index]));
  const legacyColumn = Object.fromEntries(
    Object.entries(LEGACY_ADMISSION).map(([field, header]) => [
      field,
      admissions.ru.header.findIndex((candidate) => matchKey(candidate) === matchKey(header))
    ])
  ) as Record<keyof typeof LEGACY_ADMISSION, number>;
  const droppedColumns = Object.entries(LEGACY_ADMISSION)
    .filter(([field]) => legacyColumn[field as keyof typeof LEGACY_ADMISSION] === -1)
    .map(([, header]) => header);
  if (droppedColumns.length > 0) {
    warn(
      `Поступление has no ${droppedColumns.join(", ")} column — the values already stored for them were kept, not cleared.`
    );
  }

  const usedContacts = new Set<string>();
  const usedAdmissions = new Set<string>();
  const slugs: string[] = [];
  let withAdmission = 0;
  let withContacts = 0;
  let withTuition = 0;
  let withRating = 0;

  for (const [index] of sheet.ru.rows.entries()) {
    const name = texts(cell(sheet, index, UNIVERSITY.name));
    if (!name.ru) continue;
    checkRowShape("Университеты", sheet, index, name.ru);
    const slug = slugify(name.ru);
    const key = matchKey(name.ru);
    const contact = contacts.get(key);
    if (contact) usedContacts.add(key);

    const tuitionCell = cell(sheet, index, UNIVERSITY.tuition);
    const tuition = parseTuition(tuitionCell.ru, [tuitionCell.en, tuitionCell.kk]);
    const tuitionNote = optionals(tuitionCell);
    const ratingCell = cell(sheet, index, UNIVERSITY.rating);
    const rating = parseRating(ratingCell.ru);
    const ratingLabel = optionals(ratingCell);
    const fields = texts(cell(sheet, index, UNIVERSITY.mainFields));
    const country = texts(cell(sheet, index, UNIVERSITY.country));
    const city = texts(cell(sheet, index, UNIVERSITY.city));
    if (tuition.min !== null) withTuition += 1;
    if (rating.label) withRating += 1;

    const data = {
      name_ru: name.ru,
      name_kk: name.kk,
      name_en: name.en,
      country: country.ru || "Казахстан",
      country_kk: country.kk,
      country_en: country.en,
      city: city.ru,
      city_kk: city.kk,
      city_en: city.en,
      rating: rating.rating,
      ratingLabel: rating.label,
      ratingLabel_kk: ratingLabel.kk,
      ratingLabel_en: ratingLabel.en,
      tuitionMin: tuition.min,
      tuitionMax: tuition.max,
      tuitionCurrency: tuition.currency,
      tuitionNote: tuition.note,
      tuitionNote_kk: tuitionNote.kk,
      tuitionNote_en: tuitionNote.en,
      website: optionalText(contact?.["Cайт"]),
      email: optionalText(contact?.["email"]),
      phone: optionalText(contact?.["Телефон"]),
      address: null,
      description_ru: fields.ru,
      description_kk: fields.kk,
      description_en: fields.en
    };

    const university = await db.university.upsert({where: {slug}, update: data, create: {...data, slug}});
    slugs.push(slug);
    if (contact) withContacts += 1;

    const row = admissionRow.get(key);
    if (row !== undefined) usedAdmissions.add(key);
    const exams = row === undefined ? {ru: null, kk: null, en: null} : optionals(cell(admissions, row, ADMISSION.exams));
    const admissionData: Prisma.AdmissionUpdateInput = {exams: exams.ru, exams_kk: exams.kk, exams_en: exams.en};
    for (const field of Object.keys(LEGACY_ADMISSION) as (keyof typeof LEGACY_ADMISSION)[]) {
      const column = legacyColumn[field];
      if (column !== -1) admissionData[field] = row === undefined ? null : optionalText(admissions.ru.rows[row][column]);
    }

    const existing = await db.admission.findUnique({where: {universityId: university.id}});
    const stated = Object.values(admissionData).some((value) => value !== null);
    if (stated || existing) {
      const saved = await db.admission.upsert({
        where: {universityId: university.id},
        update: admissionData,
        create: {...(admissionData as Prisma.AdmissionUncheckedCreateInput), universityId: university.id}
      });
      const kept = saved.exams ?? saved.ielts ?? saved.sat ?? saved.grants ?? saved.deadline;
      if (kept !== null) withAdmission += 1;
      else if (droppedColumns.length === 0) await db.admission.delete({where: {id: saved.id}});
    }
  }

  for (const key of contacts.keys()) {
    if (key === "") warn("Contacts sheet contains a blank row.");
    else if (!usedContacts.has(key)) warn(`Contacts row "${key}" matches no university.`);
  }
  for (const key of admissionRow.keys()) {
    if (key !== "" && !usedAdmissions.has(key)) warn(`Admission row "${key}" matches no university.`);
  }

  const removed = await db.university.deleteMany({where: {slug: {notIn: slugs}}});
  return {imported: slugs.length, removed: removed.count, withAdmission, withContacts, withTuition, withRating};
}

function requirements(admission: Admission | null, lang: Lang): string {
  const exams = lang === "ru" ? admission?.exams : (admission?.[`exams_${lang}`] ?? admission?.exams);
  return [
    exams ? `${REQUIREMENT_LABEL[lang]}: ${exams}` : null,
    admission?.ielts ? `IELTS: ${admission.ielts}` : null,
    admission?.sat ? `SAT: ${admission.sat}` : null
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
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
  const sheet = localised(workbook, "университеты");
  const directions = new Map((await db.direction.findMany()).map((direction) => [direction.slug, direction]));
  const universities = new Map((await db.university.findMany({include: {admission: true}})).map((item) => [item.slug, item]));
  const professions = await db.profession.findMany();

  const keys: string[] = [];
  const unmatchedTokens = new Set<string>();
  let professionLinks = 0;

  for (const row of sheet.ru.rows) {
    const name = text(row[UNIVERSITY.name]);
    if (!name) continue;
    const university = universities.get(slugify(name));
    if (!university) continue;

    const requirement = Object.fromEntries(LANGS.map((lang) => [lang, requirements(university.admission, lang)])) as Triple<string>;
    const tokens = specialtyTokens(row[UNIVERSITY.mainFields]);

    for (const token of splitList(row[UNIVERSITY.directions])) {
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
        name_kk: direction.name_kk,
        name_en: direction.name_en,
        requirements_ru: requirement.ru,
        requirements_kk: requirement.kk,
        requirements_en: requirement.en,
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

        // Specialty names are English in every tab, so the program name is too.
        const professionKey = `${university.slug}:${direction.slug}:${profession.slug}`;
        const professionData = {
          universityId: university.id,
          directionId: direction.id,
          professionId: profession.id,
          name_ru: specialty,
          name_kk: specialty,
          name_en: specialty,
          requirements_ru: requirement.ru,
          requirements_kk: requirement.kk,
          requirements_en: requirement.en,
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
  const sheet = localised(workbook, "тест");
  const questionKeys: string[] = [];
  const optionKeys: string[] = [];
  const unmatchedArchetypes = new Set<string>();
  const usedCorrections = new Set<Correction>();
  let weighted = 0;

  // Whitespace is normalised first, so a correction matches a sentence the sheet splits across lines.
  const testText = (value: Triple<unknown>): Triple<string> => {
    const normalised = texts(value, inlineText);
    return {
      ru: correct(normalised.ru, "ru", usedCorrections),
      kk: correct(normalised.kk, "kk", usedCorrections),
      en: correct(normalised.en, "en", usedCorrections)
    };
  };

  for (const [index] of sheet.ru.rows.entries()) {
    const question = testText(cell(sheet, index, TEST.question));
    if (!question.ru) continue;
    const order = index + 1;
    const block = texts(cell(sheet, index, TEST.block));
    const sourceKey = `q-${order}`;

    const questionData = {
      order,
      block: block.ru,
      block_kk: block.kk,
      block_en: block.en,
      text_ru: question.ru,
      text_kk: question.kk,
      text_en: question.en,
      category: categoryForBlock(block.ru)
    };
    const saved = await db.question.upsert({
      where: {sourceKey},
      update: questionData,
      create: {...questionData, sourceKey}
    });
    questionKeys.push(sourceKey);

    for (const letter of ["A", "B", "C", "D"] as const) {
      const option = testText(cell(sheet, index, TEST.options[letter]));
      if (!option.ru) continue;
      // The Russian archetype is the key the direction weights are defined by;
      // the translations are only its label.
      const archetype = texts(cell(sheet, index, TEST.archetypes[letter]));
      const weights = weightsForArchetype(archetype.ru);
      if (!weights) unmatchedArchetypes.add(archetype.ru);
      else weighted += 1;

      const optionKey = `${sourceKey}-${letter}`;
      const optionData = {
        questionId: saved.id,
        archetype: archetype.ru,
        archetype_kk: archetype.kk,
        archetype_en: archetype.en,
        text_ru: option.ru,
        text_kk: option.kk,
        text_en: option.en,
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
  for (const entry of TEST_CORRECTIONS) {
    if (!usedCorrections.has(entry)) {
      warn(
        `Correction for question ${entry.question} (${entry.lang}) no longer matches — the sheet is fixed; delete it from scripts/source-corrections.ts: "${entry.from}"`
      );
    }
  }

  const removedOptions = await db.option.deleteMany({where: {sourceKey: {notIn: optionKeys}}});
  const removedQuestions = await db.question.deleteMany({where: {sourceKey: {notIn: questionKeys}}});
  return {
    questions: questionKeys.length,
    options: optionKeys.length,
    weighted,
    corrections: usedCorrections.size,
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
  console.table({directions, professions, universities, programs, admissions, questions, options, reviews});

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

  // A missing translation still renders (the Russian value is shown), so it is
  // reported for the translators rather than failing the import.
  console.log("\nMissing translations (the Russian value is shown instead)");
  console.table({
    directions: {
      kk: await db.direction.count({where: {name_kk: ""}}),
      en: await db.direction.count({where: {name_en: ""}})
    },
    professions: {
      kk: await db.profession.count({where: {name_kk: ""}}),
      en: await db.profession.count({where: {name_en: ""}})
    },
    universities: {
      kk: await db.university.count({where: {name_kk: ""}}),
      en: await db.university.count({where: {name_en: ""}})
    },
    questions: {
      kk: await db.question.count({where: {text_kk: ""}}),
      en: await db.question.count({where: {text_en: ""}})
    },
    options: {
      kk: await db.option.count({where: {text_kk: ""}}),
      en: await db.option.count({where: {text_en: ""}})
    }
  });

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
  console.log(`Test text corrections applied: ${test.corrections}/${TEST_CORRECTIONS.length}`);
  console.log(`Professions with a salary figure: ${professions.numericSalaries}/${professions.imported}`);

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
