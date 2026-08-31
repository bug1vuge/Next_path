import type {Demand} from "@prisma/client";
import {getTranslations, setRequestLocale} from "next-intl/server";
import type {ProfessionCardData} from "@/components/catalog/cards";
import {Field, FilterPanel, NumberField, Select, TextField} from "@/components/catalog/filter-panel";
import {ProfessionResults} from "@/components/catalog/profession-results";
import {ContentNotice} from "@/components/ui/content-notice";
import {PageHeader} from "@/components/ui/page-header";
import {DEMAND_VALUES, getDirections, getProfessionFacets, getProfessions, hasNumericSalaries} from "@/lib/catalog";
import {localizedText} from "@/lib/content";
import type {Locale} from "@/lib/locales";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function positiveInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export default async function ProfessionsPage({
  params,
  searchParams
}: {
  params: Promise<{locale: Locale}>;
  searchParams: SearchParams;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("professions");
  const tCommon = await getTranslations("common");
  const query = await searchParams;

  const filters = {
    query: single(query.q),
    direction: single(query.direction),
    demand: single(query.demand),
    salaryLevel: single(query.salary),
    minSalary: single(query.minSalary),
    sort: single(query.sort) || "name"
  };

  const [directions, facets, showNumericSalary] = await Promise.all([
    getDirections(),
    getProfessionFacets(),
    hasNumericSalaries()
  ]);
  const {items} = await getProfessions({
    query: filters.query || undefined,
    direction: filters.direction || undefined,
    demand: (DEMAND_VALUES as readonly string[]).includes(filters.demand) ? (filters.demand as Demand) : undefined,
    salaryLevel: positiveInt(filters.salaryLevel),
    minSalary: showNumericSalary ? positiveInt(filters.minSalary) : undefined,
    sort: filters.sort
  });

  const cards: ProfessionCardData[] = items.map((profession) => ({
    slug: profession.slug,
    name: localizedText(profession, "name", locale),
    description: localizedText(profession, "shortDescription", locale),
    directionSlug: profession.direction.slug,
    directionName: localizedText(profession.direction, "name", locale),
    salaryLabel: profession.salaryLabel,
    demandLabel: profession.demandLabel,
    skills: profession.skills
  }));

  return (
    <div className="container-page pb-16">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ContentNotice locale={locale} />

      <FilterPanel resetHref="/professions" summary={t("found", {count: cards.length})}>
        <Field label={tCommon("search")}>
          <TextField name="q" placeholder={t("searchPlaceholder")} value={filters.query} />
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
        <Field label={t("filterDemand")}>
          <Select
            name="demand"
            options={facets.demands.map((entry) => ({value: entry.value, label: entry.label}))}
            placeholder={tCommon("all")}
            value={filters.demand}
          />
        </Field>
        <Field label={t("filterSalaryLevel")}>
          <Select
            name="salary"
            options={facets.salaryLevels.map((entry) => ({value: entry.value, label: entry.label}))}
            placeholder={tCommon("all")}
            value={filters.salaryLevel}
          />
        </Field>
        {showNumericSalary ? (
          <Field label={t("filterMinSalary")}>
            <NumberField name="minSalary" placeholder="0" value={filters.minSalary} />
          </Field>
        ) : null}
        <Field label={tCommon("sort")}>
          <Select
            name="sort"
            options={[
              {value: "name", label: t("sortName")},
              {value: "salary-desc", label: t("sortSalaryDesc")},
              {value: "salary-asc", label: t("sortSalaryAsc")},
              {value: "demand", label: t("sortDemand")},
              {value: "match", label: t("sortMatch")}
            ]}
            placeholder={t("sortName")}
            value={filters.sort}
          />
        </Field>
      </FilterPanel>

      <p className="mt-6 mb-4 text-sm font-semibold text-muted">{t("found", {count: cards.length})}</p>
      {!showNumericSalary ? <p className="mb-4 text-sm text-muted">{t("salaryUnknown")}</p> : null}

      <ProfessionResults professions={cards} resetHref="/professions" sort={filters.sort} />
    </div>
  );
}
