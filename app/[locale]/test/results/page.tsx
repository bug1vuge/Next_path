import {getTranslations, setRequestLocale} from "next-intl/server";
import {TestResults, type ResultDirection} from "@/components/test/test-results";
import {PageHeader} from "@/components/ui/page-header";
import {db} from "@/lib/db";
import {localizedText} from "@/lib/content";
import type {Locale} from "@/lib/locales";

export default async function TestResultsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("results");

  const directions = await db.direction.findMany({
    orderBy: {sortOrder: "asc"},
    include: {
      professions: {orderBy: {name_ru: "asc"}, take: 4},
      _count: {select: {professions: true}}
    }
  });

  const items: ResultDirection[] = directions.map((direction) => ({
    slug: direction.slug,
    name: localizedText(direction, "name", locale),
    description: localizedText(direction, "description", locale),
    whoItSuits: localizedText(direction, "whoItSuits", locale),
    professionCount: direction._count.professions,
    professions: direction.professions.map((profession) => ({
      slug: profession.slug,
      name: localizedText(profession, "name", locale)
    }))
  }));

  return (
    <div className="container-page pb-16">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <TestResults directions={items} />
    </div>
  );
}
