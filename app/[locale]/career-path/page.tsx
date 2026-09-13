import {getTranslations, setRequestLocale} from "next-intl/server";
import {CareerMap, type MapSelection} from "@/components/career/career-map";
import {PageHeader} from "@/components/ui/page-header";
import {getCareerMapIndex, getCareerPath} from "@/lib/catalog";
import {localizedList, localizedText, localizedValue, localizedValues} from "@/lib/content";
import {formatMoneyRange} from "@/lib/format";
import type {Locale} from "@/lib/locales";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type CareerStep = {title_ru?: string; title_kk?: string; title_en?: string};

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/**
 * The career map: one page that answers the journey's questions in order.
 *
 * Everything that does not depend on the visitor is rendered here and handed to
 * the client as one compact, already-localised index; the profile, the saved
 * items and the progress come from `localStorage` inside `CareerMap`. The
 * profession the map is built around travels in the URL, so a map is shareable
 * and its university and admission data can be fetched on the server.
 */
export default async function CareerMapPage({
  params,
  searchParams
}: {
  params: Promise<{locale: Locale}>;
  searchParams: SearchParams;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("careerPath");

  const slug = single((await searchParams).profession);
  const [index, path] = await Promise.all([getCareerMapIndex(), slug ? getCareerPath(slug) : Promise.resolve(null)]);

  const directions = index.directions.map((direction) => ({
    slug: direction.slug,
    name: localizedText(direction, "name", locale),
    description: localizedText(direction, "description", locale),
    whoItSuits: localizedText(direction, "whoItSuits", locale),
    skills: localizedValues(direction, "skills", locale),
    schoolSubjects: localizedValues(direction, "schoolSubjects", locale),
    professionCount: direction._count.professions
  }));

  // Profile labels: the Russian block/archetype is the key, its translation the text shown.
  const labels = Object.fromEntries(
    Object.entries(index.labels).map(([key, translation]) => [
      key,
      locale === "ru" ? key : translation[locale] || key
    ])
  );

  const directionNames = new Map(directions.map((direction) => [direction.slug, direction.name]));

  const professions = index.professions.map((profession) => ({
    slug: profession.slug,
    name: localizedText(profession, "name", locale),
    shortDescription: localizedText(profession, "shortDescription", locale),
    directionSlug: profession.direction.slug,
    directionName: directionNames.get(profession.direction.slug) ?? "",
    salaryLabel: localizedValue(profession, "salaryLabel", locale),
    demandLabel: localizedValue(profession, "demandLabel", locale),
    skills: localizedValues(profession, "skills", locale),
    schoolSubjects: localizedValues(profession, "schoolSubjects", locale)
  }));

  const selection: MapSelection | null = path
    ? {
        profession: {
          slug: path.profession.slug,
          name: localizedText(path.profession, "name", locale),
          whatTheyDo: localizedText(path.profession, "whatTheyDo", locale),
          skills: localizedValues(path.profession, "skills", locale),
          schoolSubjects: localizedValues(path.profession, "schoolSubjects", locale),
          specialties: path.profession.specialties,
          pros: localizedList(path.profession, "pros", locale),
          cons: localizedList(path.profession, "cons", locale),
          salaryLabel: localizedValue(path.profession, "salaryLabel", locale),
          demandLabel: localizedValue(path.profession, "demandLabel", locale),
          // Empty until the source provides career-ladder content.
          ladder: (Array.isArray(path.profession.careerLadder) ? (path.profession.careerLadder as CareerStep[]) : [])
            .map((step) => step[`title_${locale}`] || step.title_ru || "")
            .filter((title) => title.length > 0),
          directionSlug: path.profession.direction.slug,
          directionName: localizedText(path.profession.direction, "name", locale)
        },
        universities: path.universities.map((university) => ({
          slug: university.slug,
          name: localizedText(university, "name", locale),
          country: localizedValue(university, "country", locale),
          city: localizedValue(university, "city", locale),
          ratingLabel: localizedValue(university, "ratingLabel", locale),
          tuition: formatMoneyRange(university.tuitionMin, university.tuitionMax, university.tuitionCurrency, locale),
          programCount: university.programs.length,
          exams: university.admission ? localizedValue(university.admission, "exams", locale) : null,
          ielts: university.admission?.ielts ?? null,
          sat: university.admission?.sat ?? null,
          grants: university.admission?.grants ?? null,
          deadline: university.admission?.deadline ?? null
        }))
      }
    : null;

  return (
    <div className="container-page pb-16">
      <PageHeader
        description={t("subtitle")}
        eyebrow={selection ? t("title") : undefined}
        title={selection ? selection.profession.name : t("title")}
      />
      <CareerMap
        blocks={index.blocks}
        directions={directions}
        labels={labels}
        optionMeta={index.optionMeta}
        professions={professions}
        selection={selection}
      />
    </div>
  );
}
