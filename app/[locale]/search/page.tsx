import {Search} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {buttonClass, inputClass} from "@/components/ui/button";
import {ContentNotice} from "@/components/ui/content-notice";
import {PageHeader, Section} from "@/components/ui/page-header";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {searchEverything} from "@/lib/catalog";
import {localizedText} from "@/lib/content";
import type {Locale} from "@/lib/locales";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function ResultList({items}: {items: {id: string; href: string; title: string; subtitle?: string}[]}) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-border bg-surface px-4 py-3 transition-colors duration-150 hover:bg-soft"
            href={item.href}
          >
            <span className="font-bold">{item.title}</span>
            {item.subtitle ? <span className="text-sm text-muted">{item.subtitle}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function SearchPage({
  params,
  searchParams
}: {
  params: Promise<{locale: Locale}>;
  searchParams: SearchParams;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("search");
  const query = single((await searchParams).q);

  const results = query ? await searchEverything(query) : null;
  const total = results
    ? results.directions.length + results.professions.length + results.universities.length + results.programs.length
    : 0;

  return (
    <div className="container-page pb-16">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ContentNotice locale={locale} />

      <form className="flex flex-wrap gap-3">
        <label className="min-w-60 flex-1">
          <span className="sr-only">{t("placeholder")}</span>
          <input className={inputClass} defaultValue={query} name="q" placeholder={t("placeholder")} type="search" />
        </label>
        <button className={buttonClass("primary")} type="submit">
          <Search aria-hidden size={18} />
          {t("submit")}
        </button>
      </form>

      {!results ? (
        <div className="mt-8">
          <EmptyState text={t("hintText")} title={t("hintTitle")} />
        </div>
      ) : total === 0 ? (
        <div className="mt-8">
          <EmptyState text={t("emptyText")} title={t("emptyTitle")} />
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm font-semibold text-muted">{t("found", {count: total})}</p>

          {results.directions.length > 0 ? (
            <Section title={t("groupDirections")}>
              <ResultList
                items={results.directions.map((direction) => ({
                  id: direction.id,
                  href: `/directions/${direction.slug}`,
                  title: localizedText(direction, "name", locale)
                }))}
              />
            </Section>
          ) : null}

          {results.professions.length > 0 ? (
            <Section title={t("groupProfessions")}>
              <ResultList
                items={results.professions.map((profession) => ({
                  id: profession.id,
                  href: `/professions/${profession.slug}`,
                  title: localizedText(profession, "name", locale),
                  subtitle: localizedText(profession.direction, "name", locale)
                }))}
              />
            </Section>
          ) : null}

          {results.universities.length > 0 ? (
            <Section title={t("groupUniversities")}>
              <ResultList
                items={results.universities.map((university) => ({
                  id: university.id,
                  href: `/universities/${university.slug}`,
                  title: localizedText(university, "name", locale),
                  subtitle: university.city ? `${university.country}, ${university.city}` : university.country
                }))}
              />
            </Section>
          ) : null}

          {results.programs.length > 0 ? (
            <Section title={t("groupPrograms")}>
              <ResultList
                items={results.programs.map((program) => ({
                  id: program.id,
                  href: `/universities/${program.university.slug}`,
                  title: localizedText(program, "name", locale),
                  subtitle: localizedText(program.university, "name", locale)
                }))}
              />
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}
