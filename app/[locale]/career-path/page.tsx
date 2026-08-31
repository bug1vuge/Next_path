import {ArrowRight} from "lucide-react";
import type {ReactNode} from "react";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {UniversityCard, type UniversityCardData} from "@/components/catalog/cards";
import {SelectSavedProfession} from "@/components/career/select-saved-profession";
import {buttonClass, chipClass} from "@/components/ui/button";
import {ContentNotice} from "@/components/ui/content-notice";
import {PageHeader} from "@/components/ui/page-header";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {getCareerPath, getProfessionOptions} from "@/lib/catalog";
import {localizedText} from "@/lib/content";
import {formatMoneyRange} from "@/lib/format";
import type {Locale} from "@/lib/locales";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function Step({index, title, children}: {index: number; title: string; children: ReactNode}) {
  return (
    <li className="relative rounded-3xl border border-border bg-surface p-6">
      <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
        {index}
      </span>
      <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
      <div className="mt-3 text-sm leading-6">{children}</div>
    </li>
  );
}

export default async function CareerPathPage({
  params,
  searchParams
}: {
  params: Promise<{locale: Locale}>;
  searchParams: SearchParams;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("careerPath");
  const tCommon = await getTranslations("common");
  const tPlan = await getTranslations("admissionPlan");

  const slug = single((await searchParams).profession);
  const path = slug ? await getCareerPath(slug) : null;
  const options = await getProfessionOptions();

  if (!path) {
    return (
      <div className="container-page pb-16">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <SelectSavedProfession
          options={options.map((option) => ({slug: option.slug, name: localizedText(option, "name", locale)}))}
        />
      </div>
    );
  }

  const {profession, universities} = path;
  const cards: UniversityCardData[] = universities.slice(0, 6).map((university) => ({
    slug: university.slug,
    name: localizedText(university, "name", locale),
    country: university.country,
    city: university.city,
    ratingLabel: university.ratingLabel,
    tuition: formatMoneyRange(university.tuitionMin, university.tuitionMax, university.tuitionCurrency, locale),
    programCount: university.programs.length
  }));

  return (
    <div className="container-page pb-16">
      <PageHeader
        actions={
          <Link className={buttonClass("primary")} href="/admission-plan">
            {t("openPlan")}
            <ArrowRight aria-hidden size={18} />
          </Link>
        }
        description={t("subtitle")}
        eyebrow={t("title")}
        title={localizedText(profession, "name", locale)}
      />
      <ContentNotice locale={locale} />

      <ol className="grid gap-4 lg:grid-cols-2">
        <Step index={1} title={t("stepDirection")}>
          <p className="font-bold">{localizedText(profession.direction, "name", locale)}</p>
          <p className="mt-2 text-muted">{localizedText(profession.direction, "description", locale)}</p>
          <Link className={`${buttonClass("secondary")} mt-4`} href={`/directions/${profession.direction.slug}`}>
            {tCommon("more")}
          </Link>
        </Step>

        <Step index={2} title={t("stepProfession")}>
          <p className="font-bold">{localizedText(profession, "name", locale)}</p>
          <p className="mt-2 text-muted">{localizedText(profession, "whatTheyDo", locale)}</p>
          <Link className={`${buttonClass("secondary")} mt-4`} href={`/professions/${profession.slug}`}>
            {tCommon("more")}
          </Link>
        </Step>

        <Step index={3} title={t("stepSkills")}>
          {profession.skills.length === 0 && profession.schoolSubjects.length === 0 ? (
            <p className="text-muted">{tCommon("notSpecified")}</p>
          ) : (
            <>
              <ul className="flex flex-wrap gap-2">
                {profession.skills.map((skill) => (
                  <li className={chipClass} key={skill}>
                    {skill}
                  </li>
                ))}
              </ul>
              <ul className="mt-3 flex flex-wrap gap-2">
                {profession.schoolSubjects.map((subject) => (
                  <li className={chipClass} key={subject}>
                    {subject}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Step>

        <Step index={4} title={t("stepSpecialties")}>
          {profession.specialties.length === 0 ? (
            <p className="text-muted">{tCommon("notSpecified")}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {profession.specialties.map((specialty) => (
                <li className={chipClass} key={specialty}>
                  {specialty}
                </li>
              ))}
            </ul>
          )}
        </Step>
      </ol>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold sm:text-2xl">{t("stepUniversities")}</h2>
          <Link className={buttonClass("ghost")} href={`/universities?direction=${profession.direction.slug}`}>
            {tCommon("all")}
          </Link>
        </div>
        <div className="mt-4">
          {cards.length === 0 ? (
            <EmptyState title={t("emptyText")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((university) => (
                <UniversityCard key={university.slug} university={university} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 rounded-3xl bg-mint p-6 sm:p-8">
        <h2 className="text-lg font-extrabold">{t("stepPlan")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{tPlan("subtitle")}</p>
        <Link className={`${buttonClass("primary")} mt-5`} href="/admission-plan">
          {t("openPlan")}
        </Link>
      </section>
    </div>
  );
}
