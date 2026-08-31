import {getTranslations, setRequestLocale} from "next-intl/server";
import type {DirectionCardData, ProfessionCardData, UniversityCardData} from "@/components/catalog/cards";
import {FavouritesView} from "@/components/favorites/favourites-view";
import {ContentNotice} from "@/components/ui/content-notice";
import {PageHeader} from "@/components/ui/page-header";
import {getFavouriteIndex} from "@/lib/catalog";
import {localizedText} from "@/lib/content";
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
    skills: direction.skills
  }));

  const professions: ProfessionCardData[] = index.professions.map((profession) => ({
    slug: profession.slug,
    name: localizedText(profession, "name", locale),
    description: localizedText(profession, "shortDescription", locale),
    directionSlug: profession.direction.slug,
    directionName: localizedText(profession.direction, "name", locale),
    salaryLabel: profession.salaryLabel,
    demandLabel: profession.demandLabel,
    skills: profession.skills
  }));

  const universities: UniversityCardData[] = index.universities.map((university) => ({
    slug: university.slug,
    name: localizedText(university, "name", locale),
    country: university.country,
    city: university.city,
    ratingLabel: university.ratingLabel,
    tuition: formatMoneyRange(university.tuitionMin, university.tuitionMax, university.tuitionCurrency, locale),
    programCount: university._count.programs
  }));

  return (
    <div className="container-page pb-16">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ContentNotice locale={locale} />
      <FavouritesView directions={directions} professions={professions} universities={universities} />
    </div>
  );
}
