import {ExternalLink, Mail, MapPin, Phone} from "lucide-react";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {buttonClass} from "@/components/ui/button";
import {ContentNotice} from "@/components/ui/content-notice";
import {FavouriteButton} from "@/components/ui/favourite-button";
import {DefinitionList, definitions, PageHeader, Section} from "@/components/ui/page-header";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {getUniversity} from "@/lib/catalog";
import {localizedText} from "@/lib/content";
import {formatMoneyRange} from "@/lib/format";
import type {Locale} from "@/lib/locales";

export default async function UniversityPage({params}: {params: Promise<{locale: Locale; slug: string}>}) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("universities");
  const tCommon = await getTranslations("common");
  const tPlan = await getTranslations("admissionPlan");

  const university = await getUniversity(slug);
  if (!university) notFound();

  const name = localizedText(university, "name", locale);
  const tuition = formatMoneyRange(university.tuitionMin, university.tuitionMax, university.tuitionCurrency, locale);
  const description = localizedText(university, "description", locale);

  const facts = definitions([
    university.ratingLabel ? {term: t("rating"), value: `${university.ratingLabel} — ${t("ratingHint")}`} : null,
    tuition ? {term: t("tuition"), value: university.tuitionNote ? `${tuition}\n${university.tuitionNote}` : tuition} : null,
    !tuition && university.tuitionNote ? {term: t("tuition"), value: university.tuitionNote} : null
  ]);

  const admission = university.admission;
  const admissionFacts = definitions([
    admission?.exams ? {term: t("exams"), value: admission.exams} : null,
    admission?.ielts ? {term: t("ielts"), value: admission.ielts} : null,
    admission?.sat ? {term: t("sat"), value: admission.sat} : null,
    admission?.grants ? {term: t("grants"), value: admission.grants} : null,
    admission?.deadline ? {term: t("deadline"), value: admission.deadline} : null
  ]);

  const contacts = definitions([
    university.website
      ? {
          term: t("website"),
          value: (
            <a className="inline-flex items-center gap-1 font-semibold text-brand hover:underline" href={university.website} rel="noreferrer noopener" target="_blank">
              {university.website}
              <ExternalLink aria-hidden size={14} />
            </a>
          )
        }
      : null,
    university.email
      ? {
          term: t("email"),
          value: (
            <a className="inline-flex items-center gap-1 font-semibold text-brand hover:underline" href={`mailto:${university.email}`}>
              <Mail aria-hidden size={14} />
              {university.email}
            </a>
          )
        }
      : null,
    university.phone
      ? {
          term: t("phone"),
          value: (
            <a className="inline-flex items-center gap-1 font-semibold text-brand hover:underline" href={`tel:${university.phone.replace(/[^\d+]/g, "")}`}>
              <Phone aria-hidden size={14} />
              {university.phone}
            </a>
          )
        }
      : null,
    university.address ? {term: tCommon("address"), value: university.address} : null
  ]);

  return (
    <div className="container-page pb-16">
      <PageHeader
        actions={
          <>
            <FavouriteButton kind="university" slug={university.slug} />
            <Link className={buttonClass("secondary")} href="/admission-plan">
              {tPlan("title")}
            </Link>
          </>
        }
        eyebrow={
          university.city ? `${university.country}, ${university.city}` : university.country
        }
        title={name}
        description={description || undefined}
      />
      <ContentNotice locale={locale} />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-lg font-extrabold">{t("admissionTitle")}</h2>
          <div className="mt-4">
            {admissionFacts.length > 0 ? (
              <DefinitionList items={admissionFacts} />
            ) : (
              <p className="text-sm text-muted">{t("admissionEmpty")}</p>
            )}
          </div>
        </article>

        <aside className="grid gap-4">
          {facts.length > 0 ? (
            <div className="rounded-3xl bg-mint p-6">
              <DefinitionList items={facts} />
            </div>
          ) : null}
          <div className="rounded-3xl border border-border bg-surface p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold text-muted uppercase">
              <MapPin aria-hidden size={16} />
              {t("contacts")}
            </h2>
            <div className="mt-4">
              {contacts.length > 0 ? (
                <DefinitionList items={contacts} />
              ) : (
                <p className="text-sm text-muted">{tCommon("notSpecified")}</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <Section title={t("programsTitle")}>
        {university.programs.length === 0 ? (
          <EmptyState title={t("noPrograms")} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {university.programs.map((program) => (
              <li className="rounded-2xl border border-border bg-surface p-5" key={program.id}>
                <p className="text-xs font-bold text-brand">{localizedText(program.direction, "name", locale)}</p>
                <p className="mt-1 font-extrabold">{localizedText(program, "name", locale)}</p>
                {program.profession ? (
                  <Link className="mt-2 inline-block text-sm font-semibold text-brand hover:underline" href={`/professions/${program.profession.slug}`}>
                    {localizedText(program.profession, "name", locale)}
                  </Link>
                ) : null}
                <Link
                  className="mt-3 block text-sm font-semibold text-muted hover:text-ink"
                  href={`/professions?direction=${program.direction.slug}`}
                >
                  {tCommon("professions")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("reviewsTitle")}>
        {university.reviews.length === 0 ? (
          <EmptyState title={t("reviewsEmpty")} />
        ) : (
          <ul className="grid gap-3">
            {university.reviews.map((review) => (
              <li className="rounded-2xl border border-border bg-surface p-5" key={review.id}>
                <p className="text-sm font-bold">
                  {review.author} · {review.year}
                </p>
                <p className="mt-2 text-sm leading-6">{review.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
