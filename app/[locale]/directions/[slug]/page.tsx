import {ArrowRight} from "lucide-react";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {ProfessionCard, UniversityCard, type ProfessionCardData} from "@/components/catalog/cards";
import {buttonClass, chipClass} from "@/components/ui/button";
import {FavouriteButton} from "@/components/ui/favourite-button";
import {PageHeader, Section} from "@/components/ui/page-header";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {getDirection} from "@/lib/catalog";
import {localizedText, localizedValue, localizedValues} from "@/lib/content";
import {formatMoneyRange} from "@/lib/format";
import type {Locale} from "@/lib/locales";

export default async function DirectionPage({params}: {params: Promise<{locale: Locale; slug: string}>}) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("directions");
  const tCommon = await getTranslations("common");
  const tHome = await getTranslations("home");

  const direction = await getDirection(slug);
  if (!direction) notFound();

  const name = localizedText(direction, "name", locale);
  const description = localizedText(direction, "description", locale);
  const whoItSuits = localizedText(direction, "whoItSuits", locale);
  const skills = localizedValues(direction, "skills", locale);
  const subjects = localizedValues(direction, "schoolSubjects", locale);

  const professions: ProfessionCardData[] = direction.professions.map((profession) => ({
    slug: profession.slug,
    name: localizedText(profession, "name", locale),
    description: localizedText(profession, "shortDescription", locale),
    directionSlug: direction.slug,
    directionName: name,
    salaryLabel: localizedValue(profession, "salaryLabel", locale),
    demandLabel: localizedValue(profession, "demandLabel", locale),
    skills: localizedValues(profession, "skills", locale)
  }));

  // One card per university, from the Program rows of this direction.
  const universities = new Map<string, {slug: string; name: string; country: string; city: string; ratingLabel: string | null; tuition: string | null; programCount: number}>();
  for (const program of direction.programs) {
    const existing = universities.get(program.university.slug);
    if (existing) {
      existing.programCount += 1;
      continue;
    }
    universities.set(program.university.slug, {
      slug: program.university.slug,
      name: localizedText(program.university, "name", locale),
      country: localizedValue(program.university, "country", locale),
      city: localizedValue(program.university, "city", locale),
      ratingLabel: localizedValue(program.university, "ratingLabel", locale),
      tuition: formatMoneyRange(
        program.university.tuitionMin,
        program.university.tuitionMax,
        program.university.tuitionCurrency,
        locale
      ),
      programCount: 1
    });
  }

  return (
    <div className="container-page pb-16">
      <PageHeader
        actions={
          <>
            <FavouriteButton kind="direction" slug={direction.slug} />
            <Link className={buttonClass("primary")} href="/test">
              {tHome("startTest")}
              <ArrowRight aria-hidden size={18} />
            </Link>
          </>
        }
        eyebrow={t("title")}
        title={name}
        description={description}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {whoItSuits ? (
          <article className="rounded-3xl bg-lilac p-6 lg:col-span-2">
            <h2 className="text-lg font-extrabold">{t("whoItSuits")}</h2>
            <p className="mt-2 text-sm leading-6">{whoItSuits}</p>
          </article>
        ) : null}
        <article className="rounded-3xl border border-border bg-surface p-6">
          {skills.length > 0 ? (
            <>
              <h2 className="text-sm font-bold text-muted uppercase">{tCommon("skills")}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <li className={chipClass} key={skill}>
                    {skill}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {subjects.length > 0 ? (
            <>
              <h2 className="mt-5 text-sm font-bold text-muted uppercase">{tCommon("subjects")}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <li className={chipClass} key={subject}>
                    {subject}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {skills.length === 0 && subjects.length === 0 ? (
            <p className="text-sm text-muted">{tCommon("notSpecified")}</p>
          ) : null}
        </article>
      </div>

      <Section
        action={
          <Link className={buttonClass("ghost")} href={`/professions?direction=${direction.slug}`}>
            {tCommon("all")}
          </Link>
        }
        title={t("professionsTitle")}
      >
        {professions.length === 0 ? (
          <EmptyState title={t("noProfessions")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {professions.slice(0, 9).map((profession) => (
              <ProfessionCard key={profession.slug} profession={profession} />
            ))}
          </div>
        )}
      </Section>

      <Section
        action={
          <Link className={buttonClass("ghost")} href={`/universities?direction=${direction.slug}`}>
            {tCommon("all")}
          </Link>
        }
        title={t("universitiesTitle")}
      >
        {universities.size === 0 ? (
          <EmptyState title={t("noUniversities")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...universities.values()].slice(0, 6).map((university) => (
              <UniversityCard key={university.slug} university={university} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
