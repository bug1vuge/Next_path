import {getTranslations, setRequestLocale} from "next-intl/server";
import type {DirectionCardData, ProfessionCardData, UniversityCardData} from "@/components/catalog/cards";
import {FavouritesView} from "@/components/favorites/favourites-view";
import {PageHeader} from "@/components/ui/page-header";
import {getFavouriteIndex} from "@/lib/catalog";
import {localizedText, localizedValue, localizedValues} from "@/lib/content";
import {formatMoneyRange} from "@/lib/format";
import type {Locale} from "@/lib/locales";

export default async function FavoritesPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("favorites");

  const index = await getFavouriteIndex();

  const directions: DirectionCardData[] = index.directions.map((direction) => ({
    slug: direction.slug,
    name: localizedText(direction, "name", locale),
    description: localizedText(direction, "description", locale),
    icon: direction.icon,
    professionCount: direction._count.professions,
    skills: localizedValues(direction, "skills", locale)
  }));

  const professions: ProfessionCardData[] = index.professions.map((profession) => ({
    slug: profession.slug,
    name: localizedText(profession, "name", locale),
    description: localizedText(profession, "shortDescription", locale),
    directionSlug: profession.direction.slug,
    directionName: localizedText(profession.direction, "name", locale),
    salaryLabel: localizedValue(profession, "salaryLabel", locale),
    demandLabel: localizedValue(profession, "demandLabel", locale),
    skills: localizedValues(profession, "skills", locale)
  }));

  const universities: UniversityCardData[] = index.universities.map((university) => ({
    slug: university.slug,
    name: localizedText(university, "name", locale),
    country: localizedValue(university, "country", locale),
    city: localizedValue(university, "city", locale),
    ratingLabel: localizedValue(university, "ratingLabel", locale),
    tuition: formatMoneyRange(university.tuitionMin, university.tuitionMax, university.tuitionCurrency, locale),
    programCount: university._count.programs
  }));

  return (
    <div className="container-page pb-16">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <FavouritesView directions={directions} professions={professions} universities={universities} />
    </div>
  );
}
