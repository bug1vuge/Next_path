import {Prisma, type Demand} from "@prisma/client";
import {db} from "./db";

/**
 * Every catalogue read lives here. Filters and sorting are translated into
 * Prisma queries — nothing is filtered in JavaScript after the fact — so that
 * URL search parameters really drive the database query.
 */

export const DEMAND_VALUES = ["LOW", "MEDIUM", "HIGH"] as const;

export type ProfessionFilters = {
  query?: string;
  direction?: string;
  demand?: Demand;
  salaryLevel?: number;
  minSalary?: number;
  sort?: string;
};

export type UniversityFilters = {
  query?: string;
  country?: string;
  city?: string;
  direction?: string;
  maxTuition?: number;
  sort?: string;
};

/**
 * Case-insensitive `contains` for one localised column. Russian "ё" is folded
 * to "е" as a second variant so a query typed either way matches.
 */
function nameSearch(query: string): Prisma.StringFilter {
  return {contains: query, mode: "insensitive"};
}

function queryVariants(query: string): string[] {
  const folded = query.replace(/ё/gi, (match) => (match === "Ё" ? "Е" : "е"));
  return folded === query ? [query] : [query, folded];
}

function localisedNameFilter<T extends {name_ru?: unknown}>(query: string, extra: (variant: string) => T[]): T[] {
  return queryVariants(query).flatMap(extra);
}

export async function getDirections() {
  return db.direction.findMany({
    orderBy: {sortOrder: "asc"},
    include: {_count: {select: {professions: true, programs: true}}}
  });
}

export async function getDirectionSlugs(): Promise<string[]> {
  const directions = await db.direction.findMany({orderBy: {sortOrder: "asc"}, select: {slug: true}});
  return directions.map((direction) => direction.slug);
}

export async function getDirection(slug: string) {
  return db.direction.findUnique({
    where: {slug},
    include: {
      professions: {orderBy: {name_ru: "asc"}},
      programs: {
        include: {university: true},
        orderBy: {university: {name_ru: "asc"}}
      }
    }
  });
}

export async function getProfessions(filters: ProfessionFilters) {
  const where: Prisma.ProfessionWhereInput = {};

  if (filters.query) {
    where.OR = localisedNameFilter<Prisma.ProfessionWhereInput>(filters.query, (variant) => [
      {name_ru: nameSearch(variant)},
      {name_kk: nameSearch(variant)},
      {name_en: nameSearch(variant)},
      {shortDescription_ru: nameSearch(variant)},
      {specialties: {hasSome: [variant]}}
    ]);
  }
  if (filters.direction) where.direction = {slug: filters.direction};
  if (filters.demand) where.demand = filters.demand;
  if (filters.salaryLevel !== undefined) where.salaryRank = {gte: filters.salaryLevel};
  if (filters.minSalary !== undefined) where.salaryAverage = {gte: filters.minSalary};

  const orderBy: Prisma.ProfessionOrderByWithRelationInput[] = (() => {
    switch (filters.sort) {
      case "salary-asc":
        return [{salaryRank: "asc"}, {name_ru: "asc"}];
      case "salary-desc":
        return [{salaryRank: "desc"}, {name_ru: "asc"}];
      case "demand":
        return [{demandRank: "desc"}, {name_ru: "asc"}];
      default:
        return [{name_ru: "asc"}];
    }
  })();

  const [items, total] = await Promise.all([
    db.profession.findMany({where, orderBy, include: {direction: true}}),
    db.profession.count()
  ]);
  return {items, total};
}

export async function getProfession(slug: string) {
  return db.profession.findUnique({
    where: {slug},
    include: {
      direction: true,
      programs: {include: {university: true}, orderBy: {university: {name_ru: "asc"}}}
    }
  });
}

/**
 * Universities that teach a profession. The link comes from Program only:
 * programs attached to the profession itself first, then programs of the
 * profession's direction at the same university.
 */
export async function getUniversitiesForProfession(professionId: string, directionId: string) {
  return db.university.findMany({
    where: {programs: {some: {OR: [{professionId}, {directionId}]}}},
    include: {
      admission: true,
      programs: {where: {OR: [{professionId}, {directionId}]}, include: {direction: true, profession: true}}
    },
    orderBy: {name_ru: "asc"}
  });
}

export async function getUniversities(filters: UniversityFilters) {
  const where: Prisma.UniversityWhereInput = {};

  if (filters.query) {
    where.OR = localisedNameFilter<Prisma.UniversityWhereInput>(filters.query, (variant) => [
      {name_ru: nameSearch(variant)},
      {name_kk: nameSearch(variant)},
      {name_en: nameSearch(variant)},
      {city: nameSearch(variant)},
      {programs: {some: {name_ru: nameSearch(variant)}}}
    ]);
  }
  if (filters.country) where.country = filters.country;
  if (filters.city) where.city = filters.city;
  if (filters.direction) where.programs = {some: {direction: {slug: filters.direction}}};
  // Tuition is stored in the currency the source used; the filter only applies
  // to universities priced in tenge, which the interface states explicitly.
  if (filters.maxTuition !== undefined) {
    where.tuitionCurrency = "KZT";
    where.tuitionMin = {lte: filters.maxTuition};
  }

  const orderBy: Prisma.UniversityOrderByWithRelationInput[] = (() => {
    switch (filters.sort) {
      case "tuition-asc":
        return [{tuitionMin: {sort: "asc", nulls: "last"}}, {name_ru: "asc"}];
      case "tuition-desc":
        return [{tuitionMin: {sort: "desc", nulls: "last"}}, {name_ru: "asc"}];
      default:
        return [{name_ru: "asc"}];
    }
  })();

  const [items, total] = await Promise.all([
    db.university.findMany({where, orderBy, include: {_count: {select: {programs: true}}}}),
    db.university.count()
  ]);
  return {items, total};
}

export async function getUniversity(slug: string) {
  return db.university.findUnique({
    where: {slug},
    include: {
      admission: true,
      reviews: {orderBy: {year: "desc"}},
      programs: {include: {direction: true, profession: true}, orderBy: {name_ru: "asc"}}
    }
  });
}

export async function getUniversityFacets() {
  const [countries, cities] = await Promise.all([
    db.university.groupBy({by: ["country"], _count: {_all: true}, orderBy: {country: "asc"}}),
    db.university.groupBy({by: ["city"], _count: {_all: true}, orderBy: {city: "asc"}})
  ]);
  return {
    countries: countries.map((entry) => ({value: entry.country, count: entry._count._all})),
    cities: cities.filter((entry) => entry.city).map((entry) => ({value: entry.city, count: entry._count._all}))
  };
}

/** True while no profession in the database carries a numeric salary. */
export async function hasNumericSalaries(): Promise<boolean> {
  return (await db.profession.count({where: {salaryAverage: {not: null}}})) > 0;
}

export async function getQuestions() {
  return db.question.findMany({orderBy: {order: "asc"}, include: {options: {orderBy: {sourceKey: "asc"}}}});
}

export async function getCatalogCounts() {
  const [directions, professions, universities] = await Promise.all([
    db.direction.count(),
    db.profession.count(),
    db.university.count()
  ]);
  return {directions, professions, universities};
}

export async function getFavourites(slugs: {professions: string[]; universities: string[]; directions: string[]}) {
  const [professions, universities, directions] = await Promise.all([
    slugs.professions.length
      ? db.profession.findMany({where: {slug: {in: slugs.professions}}, include: {direction: true}})
      : Promise.resolve([]),
    slugs.universities.length
      ? db.university.findMany({where: {slug: {in: slugs.universities}}, include: {admission: true}})
      : Promise.resolve([]),
    slugs.directions.length
      ? db.direction.findMany({where: {slug: {in: slugs.directions}}, include: {_count: {select: {professions: true}}}})
      : Promise.resolve([])
  ]);
  return {professions, universities, directions};
}

export async function getGrants() {
  return db.university.findMany({
    where: {admission: {grants: {not: null}}},
    include: {admission: true},
    orderBy: [{country: "asc"}, {name_ru: "asc"}]
  });
}

export type GlobalSearchResults = Awaited<ReturnType<typeof searchEverything>>;

export async function searchEverything(query: string) {
  const [directions, professions, universities, programs] = await Promise.all([
    db.direction.findMany({
      where: {
        OR: localisedNameFilter<Prisma.DirectionWhereInput>(query, (variant) => [
          {name_ru: nameSearch(variant)},
          {name_kk: nameSearch(variant)},
          {name_en: nameSearch(variant)},
          {description_ru: nameSearch(variant)}
        ])
      },
      orderBy: {sortOrder: "asc"},
      take: 10
    }),
    db.profession.findMany({
      where: {
        OR: localisedNameFilter<Prisma.ProfessionWhereInput>(query, (variant) => [
          {name_ru: nameSearch(variant)},
          {name_kk: nameSearch(variant)},
          {name_en: nameSearch(variant)},
          {shortDescription_ru: nameSearch(variant)}
        ])
      },
      include: {direction: true},
      orderBy: {name_ru: "asc"},
      take: 24
    }),
    db.university.findMany({
      where: {
        OR: localisedNameFilter<Prisma.UniversityWhereInput>(query, (variant) => [
          {name_ru: nameSearch(variant)},
          {name_kk: nameSearch(variant)},
          {name_en: nameSearch(variant)},
          {city: nameSearch(variant)}
        ])
      },
      orderBy: {name_ru: "asc"},
      take: 24
    }),
    db.program.findMany({
      where: {
        OR: localisedNameFilter<Prisma.ProgramWhereInput>(query, (variant) => [
          {name_ru: nameSearch(variant)},
          {name_kk: nameSearch(variant)},
          {name_en: nameSearch(variant)}
        ])
      },
      include: {university: true, direction: true},
      orderBy: {name_ru: "asc"},
      take: 24
    })
  ]);
  return {directions, professions, universities, programs};
}
