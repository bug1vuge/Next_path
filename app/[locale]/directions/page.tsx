import {getTranslations, setRequestLocale} from "next-intl/server";
import {DirectionCard, type DirectionCardData} from "@/components/catalog/cards";
import {PageHeader} from "@/components/ui/page-header";
import {EmptyState} from "@/components/ui/states";
import {getDirections} from "@/lib/catalog";
import {localizedText, localizedValues} from "@/lib/content";
import type {Locale} from "@/lib/locales";

export default async function DirectionsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("directions");

  const directions = await getDirections();
  const items: DirectionCardData[] = directions.map((direction) => ({
    slug: direction.slug,
    name: localizedText(direction, "name", locale),
    description: localizedText(direction, "description", locale),
    icon: direction.icon,
    professionCount: direction._count.professions,
    skills: localizedValues(direction, "skills", locale)
  }));

  return (
    <div className="container-page pb-16">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {items.length === 0 ? (
        <EmptyState text={t("emptyText")} title={t("emptyTitle")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((direction) => (
            <DirectionCard direction={direction} key={direction.slug} />
          ))}
        </div>
      )}
    </div>
  );
}
