import {getTranslations, setRequestLocale} from "next-intl/server";
import {buttonClass} from "@/components/ui/button";
import {PageHeader} from "@/components/ui/page-header";
import {Link} from "@/i18n/navigation";
import {getCatalogCounts} from "@/lib/catalog";
import type {Locale} from "@/lib/locales";

export default async function AboutPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const tHome = await getTranslations("home");

  const counts = await getCatalogCounts();

  const sections = [
    {title: t("problemTitle"), text: t("problemText")},
    {title: t("dataTitle"), text: t("dataText")},
    {title: t("languageTitle"), text: t("languageText")},
    {title: t("privacyTitle"), text: t("privacyText")}
  ];

  return (
    <div className="container-page pb-16">
      <PageHeader
        actions={
          <Link className={buttonClass("primary")} href="/test">
            {tHome("startTest")}
          </Link>
        }
        title={t("title")}
        description={t("subtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <p className="rounded-3xl bg-lilac p-6 text-lg font-extrabold">
          {tHome("cardDirectionsTitle", {count: counts.directions})}
        </p>
        <p className="rounded-3xl bg-peach p-6 text-lg font-extrabold">
          {tHome("cardProfessionsTitle", {count: counts.professions})}
        </p>
        <p className="rounded-3xl bg-mint p-6 text-lg font-extrabold">
          {tHome("cardUniversitiesTitle", {count: counts.universities})}
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <article className="rounded-3xl border border-border bg-surface p-6" key={section.title}>
            <h2 className="text-lg font-extrabold">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{section.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
