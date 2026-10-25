import {db} from "@/lib/db";
import type {KnowledgeBase, Localised, LocalisedList} from "./knowledge";

/**
 * Reads the catalogue the site already shows into the assistant's knowledge
 * base. Nothing is copied or duplicated: the database stays the only source,
 * and this module keeps a short-lived in-memory snapshot so that a chat does
 * not query every table on every message. A re-import is picked up within
 * `TTL_MS`.
 */
const TTL_MS = 5 * 60 * 1000;

let snapshot: {base: KnowledgeBase; loadedAt: number} | null = null;
let pending: Promise<KnowledgeBase> | null = null;

const text = (ru: string | null | undefined, kk: string | null | undefined, en: string | null | undefined): Localised => ({
  ru: ru ?? "",
  kk: kk ?? "",
  en: en ?? ""
});

const list = (ru: string[] | null | undefined, kk: string[] | null | undefined, en: string[] | null | undefined): LocalisedList => ({
  ru: ru ?? [],
  kk: kk ?? [],
  en: en ?? []
});

async function load(): Promise<KnowledgeBase> {
  const [directions, professions, universities] = await Promise.all([
    db.direction.findMany({orderBy: {sortOrder: "asc"}}),
    db.profession.findMany({orderBy: {name_ru: "asc"}, include: {direction: {select: {slug: true}}}}),
    db.university.findMany({
      orderBy: {name_ru: "asc"},
      include: {
        admission: true,
        programs: {
          select: {name_ru: true, direction: {select: {slug: true}}, profession: {select: {slug: true}}}
        }
      }
    })
  ]);

  return {
    directions: directions.map((direction) => ({
      slug: direction.slug,
      name: text(direction.name_ru, direction.name_kk, direction.name_en),
      description: text(direction.description_ru, direction.description_kk, direction.description_en),
      whoItSuits: text(direction.whoItSuits_ru, direction.whoItSuits_kk, direction.whoItSuits_en),
      skills: list(direction.skills, direction.skills_kk, direction.skills_en),
      schoolSubjects: list(direction.schoolSubjects, direction.schoolSubjects_kk, direction.schoolSubjects_en)
    })),
    professions: professions.map((profession) => ({
      slug: profession.slug,
      directionSlug: profession.direction.slug,
      name: text(profession.name_ru, profession.name_kk, profession.name_en),
      shortDescription: text(profession.shortDescription_ru, profession.shortDescription_kk, profession.shortDescription_en),
      whatTheyDo: text(profession.whatTheyDo_ru, profession.whatTheyDo_kk, profession.whatTheyDo_en),
      salaryLabel: text(profession.salaryLabel, profession.salaryLabel_kk, profession.salaryLabel_en),
      demandLabel: text(profession.demandLabel, profession.demandLabel_kk, profession.demandLabel_en),
      specialties: profession.specialties,
      pros: list(profession.pros_ru, profession.pros_kk, profession.pros_en),
      cons: list(profession.cons_ru, profession.cons_kk, profession.cons_en),
      skills: list(profession.skills, profession.skills_kk, profession.skills_en),
      schoolSubjects: list(profession.schoolSubjects, profession.schoolSubjects_kk, profession.schoolSubjects_en)
    })),
    universities: universities.map((university) => ({
      slug: university.slug,
      name: text(university.name_ru, university.name_kk, university.name_en),
      country: text(university.country, university.country_kk, university.country_en),
      city: text(university.city, university.city_kk, university.city_en),
      description: text(university.description_ru, university.description_kk, university.description_en),
      ratingLabel: text(university.ratingLabel, university.ratingLabel_kk, university.ratingLabel_en),
      tuitionNote: text(university.tuitionNote, university.tuitionNote_kk, university.tuitionNote_en),
      website: university.website,
      email: university.email,
      phone: university.phone,
      address: university.address,
      admission: university.admission
        ? {
            exams: text(university.admission.exams, university.admission.exams_kk, university.admission.exams_en),
            ielts: university.admission.ielts ?? "",
            sat: university.admission.sat ?? "",
            grants: university.admission.grants ?? "",
            deadline: university.admission.deadline ?? ""
          }
        : null,
      directionSlugs: [...new Set(university.programs.map((program) => program.direction.slug))],
      professionSlugs: [
        ...new Set(university.programs.map((program) => program.profession?.slug).filter((slug): slug is string => Boolean(slug)))
      ],
      programNames: [...new Set(university.programs.map((program) => program.name_ru).filter(Boolean))]
    }))
  };
}

export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  if (snapshot && Date.now() - snapshot.loadedAt < TTL_MS) return snapshot.base;
  pending ??= load()
    .then((base) => {
      snapshot = {base, loadedAt: Date.now()};
      return base;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}
