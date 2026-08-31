import {getTranslations, setRequestLocale} from "next-intl/server";
import {ContentNotice} from "@/components/ui/content-notice";
import {PageHeader} from "@/components/ui/page-header";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {getGrants} from "@/lib/catalog";
import {localizedText} from "@/lib/content";
import type {Locale} from "@/lib/locales";

export default async function GrantsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("grants");

  const universities = await getGrants();

  return (
    <div className="container-page pb-16">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ContentNotice locale={locale} />

      <p className="mb-6 rounded-2xl bg-peach px-4 py-3 text-sm leading-6">{t("note")}</p>

      {universities.length === 0 ? (
        <EmptyState text={t("emptyText")} title={t("emptyTitle")} />
      ) : (
        <>
          <p className="mb-4 text-sm font-semibold text-muted">{t("found", {count: universities.length})}</p>
          <ul className="grid gap-3">
            {universities.map((university) => (
              <li className="rounded-2xl border border-border bg-surface p-5" key={university.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link className="font-extrabold hover:underline" href={`/universities/${university.slug}`}>
                    {localizedText(university, "name", locale)}
                  </Link>
                  <span className="text-sm text-muted">
                    {university.city ? `${university.country}, ${university.city}` : university.country}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 whitespace-pre-line">{university.admission?.grants}</p>
                {university.admission?.deadline ? (
                  <p className="mt-3 text-sm leading-6 text-muted">
                    <span className="font-bold">{t("deadlineColumn")}: </span>
                    {university.admission.deadline}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
