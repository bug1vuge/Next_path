import {Check, X} from "lucide-react";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {UniversityCard, type UniversityCardData} from "@/components/catalog/cards";
import {BuildPathButton} from "@/components/catalog/build-path-button";
import {buttonClass, chipClass} from "@/components/ui/button";
import {ContentNotice} from "@/components/ui/content-notice";
import {FavouriteButton} from "@/components/ui/favourite-button";
import {DefinitionList, definitions, PageHeader, Section} from "@/components/ui/page-header";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {getProfession, getUniversitiesForProfession} from "@/lib/catalog";
import {localizedList, localizedText} from "@/lib/content";
import {formatMoneyRange, formatNumber} from "@/lib/format";
import type {Locale} from "@/lib/locales";

type CareerStep = {title_ru?: string; title_kk?: string; title_en?: string};

export default async function ProfessionPage({params}: {params: Promise<{locale: Locale; slug: string}>}) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("professions");
  const tCommon = await getTranslations("common");

  const profession = await getProfession(slug);
  if (!profession) notFound();

  const universities = await getUniversitiesForProfession(profession.id, profession.directionId);
  const name = localizedText(profession, "name", locale);
  const pros = localizedList(profession, "pros", locale);
  const cons = localizedList(profession, "cons", locale);
  const ladder = Array.isArray(profession.careerLadder) ? (profession.careerLadder as CareerStep[]) : [];

  const salaryRange = formatMoneyRange(profession.salaryMin, profession.salaryMax, "KZT", locale);
  const salaryAverage =
    profession.salaryAverage !== null ? `${formatNumber(profession.salaryAverage, locale)} ₸` : null;

  const cards: UniversityCardData[] = universities.map((university) => ({
    slug: university.slug,
    name: localizedText(university, "name", locale),
    country: university.country,
    city: university.city,
    ratingLabel: university.ratingLabel,
    tuition: formatMoneyRange(university.tuitionMin, university.tuitionMax, university.tuitionCurrency, locale),
    programCount: university.programs.length
  }));

  const facts = definitions([
    salaryRange || salaryAverage
      ? {term: t("salaryLevel"), value: salaryRange ?? salaryAverage ?? ""}
      : profession.salaryLabel
        ? {term: t("salaryLevel"), value: profession.salaryLabel}
        : null,
    profession.demandLabel ? {term: t("demand"), value: profession.demandLabel} : null,
    profession.schoolSubjects.length > 0
      ? {term: tCommon("subjects"), value: profession.schoolSubjects.join(", ")}
      : null,
    profession.specialties.length > 0 ? {term: t("specialties"), value: profession.specialties.join(", ")} : null
  ]);

  return (
    <div className="container-page pb-16">
      <PageHeader
        actions={
          <>
            <FavouriteButton kind="profession" slug={profession.slug} />
            <BuildPathButton slug={profession.slug} />
          </>
        }
        description={localizedText(profession, "shortDescription", locale)}
        eyebrow={localizedText(profession.direction, "name", locale)}
        title={name}
      />
      <ContentNotice locale={locale} />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-lg font-extrabold">{t("whatTheyDo")}</h2>
          <p className="mt-2 text-sm leading-6 whitespace-pre-line">{localizedText(profession, "whatTheyDo", locale)}</p>

          {profession.skills.length > 0 ? (
            <>
              <h3 className="mt-6 text-sm font-bold text-muted uppercase">{tCommon("skills")}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {profession.skills.map((skill) => (
                  <li className={chipClass} key={skill}>
                    {skill}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {pros.length > 0 ? (
              <div>
                <h3 className="text-sm font-bold text-muted uppercase">{t("pros")}</h3>
                <ul className="mt-2 grid gap-2 text-sm leading-6">
                  {pros.map((item) => (
                    <li className="flex gap-2" key={item}>
                      <Check aria-hidden className="mt-1 shrink-0 text-success" size={16} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {cons.length > 0 ? (
              <div>
                <h3 className="text-sm font-bold text-muted uppercase">{t("cons")}</h3>
                <ul className="mt-2 grid gap-2 text-sm leading-6">
                  {cons.map((item) => (
                    <li className="flex gap-2" key={item}>
                      <X aria-hidden className="mt-1 shrink-0 text-danger" size={16} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </article>

        <aside className="rounded-3xl bg-mint p-6">
          {facts.length > 0 ? <DefinitionList items={facts} /> : <p className="text-sm">{tCommon("notSpecified")}</p>}
          {!salaryRange && !salaryAverage ? <p className="mt-4 text-xs leading-5">{t("salaryUnknown")}</p> : null}
          <Link className={`${buttonClass("secondary")} mt-6`} href={`/directions/${profession.direction.slug}`}>
            {t("openDirection")}
          </Link>
        </aside>
      </div>

      {ladder.length > 0 ? (
        <Section title={t("careerLadder")}>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ladder.map((step, index) => (
              <li className="rounded-2xl border border-border bg-surface p-4" key={`${step.title_ru ?? index}`}>
                <span className="text-xs font-bold text-brand">{index + 1}</span>
                <p className="mt-1 font-bold">{step[`title_${locale}`] || step.title_ru}</p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      <Section title={t("universitiesTitle")}>
        {cards.length === 0 ? (
          <EmptyState
            action={
              <Link className={buttonClass("secondary")} href="/universities">
                {tCommon("universities")}
              </Link>
            }
            title={t("noPrograms")}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((university) => (
              <UniversityCard key={university.slug} university={university} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
