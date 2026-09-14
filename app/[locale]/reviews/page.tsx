import {getTranslations, setRequestLocale} from "next-intl/server";
import {ReviewForm} from "@/components/reviews/review-form";
import {ReviewList} from "@/components/reviews/review-list";
import {Stars} from "@/components/reviews/stars";
import {PageHeader} from "@/components/ui/page-header";
import {EmptyState} from "@/components/ui/states";
import {formatNumber} from "@/lib/format";
import type {Locale} from "@/lib/locales";
import {getReviews, getReviewSummary} from "@/lib/reviews";

export default async function ReviewsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reviews");
  const [reviews, summary] = await Promise.all([getReviews(), getReviewSummary()]);

  return (
    <div className="container-page pb-16">
      <PageHeader description={t("subtitle")} title={t("title")} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
        <div className="lg:sticky lg:top-6">
          <ReviewForm />
        </div>

        <section aria-labelledby="reviews-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold" id="reviews-heading">
              {t("count", {count: summary.count})}
            </h2>
            {summary.average !== null ? (
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="text-muted">{t("average")}</span>
                <Stars label={t("averageValue", {average: formatNumber(summary.average, locale)})} value={summary.average} />
                <span className="tabular-nums">{formatNumber(summary.average, locale)}</span>
              </p>
            ) : null}
          </div>
          <div className="mt-4">
            {reviews.length === 0 ? (
              <EmptyState text={t("emptyText")} title={t("empty")} />
            ) : (
              <ReviewList locale={locale} reviews={reviews} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
