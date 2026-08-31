import {getTranslations, setRequestLocale} from "next-intl/server";
import {UniversityCard, type UniversityCardData} from "@/components/catalog/cards";
import {Field, FilterPanel, NumberField, Select, TextField} from "@/components/catalog/filter-panel";
import {buttonClass} from "@/components/ui/button";
import {ContentNotice} from "@/components/ui/content-notice";
import {PageHeader} from "@/components/ui/page-header";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {getDirections, getUniversities, getUniversityFacets} from "@/lib/catalog";
import {localizedText} from "@/lib/content";
import {formatMoneyRange} from "@/lib/format";
import type {Locale} from "@/lib/locales";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function positiveInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export default async function UniversitiesPage({
  params,
  searchParams
}: {
  params: Promise<{locale: Locale}>;
  searchParams: SearchParams;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("universities");
  const tCommon = await getTranslations("common");
  const query = await searchParams;

  const filters = {
    query: single(query.q),
    country: single(query.country),
    city: single(query.city),
    direction: single(query.direction),
    maxTuition: single(query.maxTuition),
    sort: single(query.sort) || "name"
  };

  const [facets, directions] = await Promise.all([getUniversityFacets(), getDirections()]);
  const {items} = await getUniversities({
    query: filters.query || undefined,
    country: filters.country || undefined,
    city: filters.city || undefined,
    direction: filters.direction || undefined,
    maxTuition: positiveInt(filters.maxTuition),
    sort: filters.sort
  });

  const cards: UniversityCardData[] = items.map((university) => ({
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

      <FilterPanel resetHref="/universities" summary={t("found", {count: cards.length})}>
        <Field label={tCommon("search")}>
          <TextField name="q" placeholder={t("searchPlaceholder")} value={filters.query} />
        </Field>
        <Field label={t("filterCountry")}>
          <Select
            name="country"
            options={facets.countries.map((entry) => ({value: entry.value, label: `${entry.value} (${entry.count})`}))}
            placeholder={tCommon("all")}
            value={filters.country}
          />
        </Field>
        <Field label={t("filterCity")}>
          <Select
            name="city"
            options={facets.cities.map((entry) => ({value: entry.value, label: entry.value}))}
            placeholder={tCommon("all")}
            value={filters.city}
          />
        </Field>
        <Field label={t("filterDirection")}>
          <Select
            name="direction"
            options={directions.map((direction) => ({
              value: direction.slug,
              label: localizedText(direction, "name", locale)
            }))}
            placeholder={tCommon("all")}
            value={filters.direction}
          />
        </Field>
        <Field label={t("filterMaxTuition")}>
          <NumberField name="maxTuition" placeholder="2000000" value={filters.maxTuition} />
        </Field>
        <Field label={tCommon("sort")}>
          <Select
            name="sort"
            options={[
              {value: "name", label: t("sortName")},
              {value: "tuition-asc", label: t("sortTuitionAsc")},
              {value: "tuition-desc", label: t("sortTuitionDesc")}
            ]}
            placeholder={t("sortName")}
            value={filters.sort}
          />
        </Field>
      </FilterPanel>

      <p className="mt-6 text-sm font-semibold text-muted">{t("found", {count: cards.length})}</p>
      <p className="mt-1 mb-4 text-sm text-muted">
        {t("filterTuitionHint")}
        {filters.sort.startsWith("tuition") ? ` ${t("sortTuitionHint")}` : ""}
      </p>

      {cards.length === 0 ? (
        <EmptyState
          action={
            <Link className={buttonClass("secondary")} href="/universities">
              {tCommon("reset")}
            </Link>
          }
          text={tCommon("emptyText")}
          title={tCommon("emptyTitle")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((university) => (
            <UniversityCard key={university.slug} university={university} />
          ))}
        </div>
      )}
    </div>
  );
}
