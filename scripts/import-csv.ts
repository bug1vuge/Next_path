/**
 * Imports replacement data exported as UTF-8 CSV files from the content team.
 *
 * Usage:
 *   pnpm db:import directions=./data/directions.csv professions=./data/professions.csv
 *
 * Required headers follow Prisma field names. List fields use a JSON array;
 * JSON fields (`weights`, `careerLadder`) use a JSON object or array.
 */
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {Demand, Prisma, PrismaClient, QuestionCategory} from "@prisma/client";

const db = new PrismaClient();
const listFields = new Set(["skills", "schoolSubjects", "pros_ru", "pros_kk", "pros_en", "cons_ru", "cons_kk", "cons_en"]);
const numberFields = new Set(["salaryMin", "salaryMax", "salaryAverage", "tuitionMin", "tuitionMax", "tuitionCost", "rating", "order", "year", "rating"]);
const jsonFields = new Set(["weights", "careerLadder"]);

function parseCsv(source: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' && source[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && source[index + 1] === "\n") index += 1; row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = ""; }
    else value += char;
  }
  row.push(value); if (row.some(Boolean)) rows.push(row);
  const [headers, ...records] = rows;
  if (!headers) throw new Error("CSV is empty.");
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header.trim(), record[index]?.trim() ?? ""])));
}

function coerce(row: Record<string, string>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (value === "") return [key, null];
    if (listFields.has(key) || jsonFields.has(key)) return [key, JSON.parse(value)];
    if (numberFields.has(key)) return [key, Number(value)];
    return [key, value];
  }));
}

async function importFile(entity: string, path: string) {
  const rows = parseCsv(await readFile(resolve(path), "utf8")).map(coerce);
  for (const row of rows) {
    if (entity === "directions") await db.direction.upsert({where: {slug: row.slug as string}, create: row as Prisma.DirectionCreateInput, update: row as Prisma.DirectionUpdateInput});
    else if (entity === "universities") await db.university.upsert({where: {slug: row.slug as string}, create: row as Prisma.UniversityCreateInput, update: row as Prisma.UniversityUpdateInput});
    else if (entity === "professions") await db.profession.upsert({where: {slug: row.slug as string}, create: {...row, demand: row.demand as Demand} as Prisma.ProfessionCreateInput, update: {...row, demand: row.demand as Demand} as Prisma.ProfessionUpdateInput});
    else if (entity === "questions") await db.question.upsert({where: {order: row.order as number}, create: {...row, category: row.category as QuestionCategory} as Prisma.QuestionCreateInput, update: {...row, category: row.category as QuestionCategory} as Prisma.QuestionUpdateInput});
    else if (entity === "options") await db.option.upsert({where: {id: row.id as string}, create: row as Prisma.OptionCreateInput, update: row as Prisma.OptionUpdateInput});
    else if (entity === "programs") await db.program.upsert({where: {id: row.id as string}, create: row as Prisma.ProgramCreateInput, update: row as Prisma.ProgramUpdateInput});
    else throw new Error(`Unsupported CSV entity: ${entity}`);
  }
  console.log(`Imported ${rows.length} ${entity}.`);
}

async function main() {
  const pairs = process.argv.slice(2).map((arg) => arg.split("=", 2));
  if (!pairs.length || pairs.some(([entity, path]) => !entity || !path)) throw new Error("Pass one or more entity=path pairs.");
  for (const [entity, path] of pairs) await importFile(entity, path);
}

main().finally(() => db.$disconnect());
