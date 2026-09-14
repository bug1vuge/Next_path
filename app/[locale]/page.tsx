import {ArrowRight, Compass, GraduationCap, Sparkles} from "lucide-react";
import {getTranslations, setRequestLocale} from "next-intl/server";
import {DirectionCard, type DirectionCardData} from "@/components/catalog/cards";
import {ReviewList} from "@/components/reviews/review-list";
import {Stars} from "@/components/reviews/stars";
import {buttonClass} from "@/components/ui/button";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {getCatalogCounts, getDirections} from "@/lib/catalog";
import {localizedText, localizedValues} from "@/lib/content";
import {formatNumber} from "@/lib/format";
import type {Locale} from "@/lib/locales";
import {getReviews, getReviewSummary} from "@/lib/reviews";

export default async function HomePage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tReviews = await getTranslations("reviews");

  const [counts, directions, reviews, reviewSummary] = await Promise.all([
    getCatalogCounts(),
    getDirections(),
    getReviews(3),
    getReviewSummary()
  ]);
  const cards: DirectionCardData[] = directions.slice(0, 6).map((direction) => ({
    slug: direction.slug,
    name: localizedText(direction, "name", locale),
    description: localizedText(direction, "description", locale),
    icon: direction.icon,
    professionCount: direction._count.professions,
    skills: localizedValues(direction, "skills", locale)
  }));

  return (
    <>
      <section className="container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-sm font-bold text-brand">
            <Sparkles aria-hidden size={16} />
            {t("eyebrow")}
          </p>
          <h1 className="mt-6 max-w-xl text-4xl font-extrabold tracking-tight sm:text-6xl">{t("title")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">{t("description")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className={buttonClass("primary", "min-h-12 px-6")} href="/test">
              {t("startTest")}
              <ArrowRight aria-hidden size={18} />
            </Link>
            <Link className={buttonClass("secondary", "min-h-12 px-6")} href="/directions">
              {t("explore")}
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] bg-mint p-7 sm:p-10">
          <p className="text-sm font-bold text-muted">{t("journeyLabel")}</p>
          <ol className="mt-5 space-y-3">
            {["journeyOne", "journeyTwo", "journeyThree", "journeyFour"].map((key, index) => (
              <li className="flex items-center gap-4 rounded-2xl bg-surface p-4 font-bold shadow-sm" key={key}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-sm text-brand">
                  {index + 1}
                </span>
                {t(key)}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="container-page grid gap-5 py-12 sm:grid-cols-3">
          <Link className="rounded-3xl bg-lilac p-6 transition-transform duration-150 hover:-translate-y-0.5" href="/directions">
            <Compass aria-hidden className="text-brand" />
            <h2 className="mt-5 text-xl font-extrabold">{t("cardDirectionsTitle", {count: counts.directions})}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{t("cardDirectionsText")}</p>
          </Link>
          <Link className="rounded-3xl bg-peach p-6 transition-transform duration-150 hover:-translate-y-0.5" href="/professions">
            <Sparkles aria-hidden className="text-brand" />
            <h2 className="mt-5 text-xl font-extrabold">{t("cardProfessionsTitle", {count: counts.professions})}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{t("cardProfessionsText")}</p>
          </Link>
          <Link className="rounded-3xl bg-mint p-6 transition-transform duration-150 hover:-translate-y-0.5" href="/universities">
            <GraduationCap aria-hidden className="text-brand" />
            <h2 className="mt-5 text-xl font-extrabold">{t("cardUniversitiesTitle", {count: counts.universities})}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{t("cardUniversitiesText")}</p>
          </Link>
        </div>
      </section>

      {cards.length > 0 ? (
        <section className="container-page py-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight">{t("directionsTitle")}</h2>
            <Link className={buttonClass("ghost")} href="/directions">
              {t("directionsLink")}
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((direction) => (
              <DirectionCard direction={direction} key={direction.slug} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-t border-border bg-surface">
        <div className="container-page py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">{tReviews("homeTitle")}</h2>
              {reviewSummary.average !== null ? (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <Stars
                    label={tReviews("averageValue", {average: formatNumber(reviewSummary.average, locale)})}
                    value={reviewSummary.average}
                  />
                  <span className="tabular-nums">{formatNumber(reviewSummary.average, locale)}</span>
                  <span className="text-muted">· {tReviews("count", {count: reviewSummary.count})}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {reviews.length > 0 ? (
                <Link className={buttonClass("ghost")} href="/reviews">
                  {tReviews("all")}
                </Link>
              ) : null}
              <Link className={buttonClass("primary")} href="/reviews#review-form">
                {tReviews("leave")}
              </Link>
            </div>
          </div>
          <div className="mt-6">
            {reviews.length === 0 ? (
              <EmptyState text={tReviews("emptyText")} title={tReviews("empty")} />
            ) : (
              <ReviewList className="grid gap-4 md:grid-cols-3" locale={locale} reviews={reviews} />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
