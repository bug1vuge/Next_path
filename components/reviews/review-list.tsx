import {useTranslations} from "next-intl";
import {formatDate} from "@/lib/format";
import type {Locale} from "@/lib/locales";
import type {SiteReviewItem} from "@/lib/reviews";
import {Stars} from "./stars";

export function ReviewList({
  reviews,
  locale,
  className = "grid gap-4"
}: {
  reviews: SiteReviewItem[];
  locale: Locale;
  className?: string;
}) {
  const t = useTranslations("reviews");

  return (
    <ul className={className}>
      {reviews.map((review) => (
        <li className="flex flex-col rounded-3xl border border-border bg-surface p-5 transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(.22,.9,.25,1)] hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgb(28_42_57/0.22)]" data-reveal key={review.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Visitors type these: long unbroken words must wrap instead of widening the page. */}
            <p className="min-w-0 font-extrabold [overflow-wrap:anywhere]">{review.name}</p>
            <Stars label={t("ratingValue", {rating: review.rating})} value={review.rating} />
          </div>
          <p className="mt-3 flex-1 text-sm leading-6 whitespace-pre-line [overflow-wrap:anywhere]">{review.text}</p>
          <p className="mt-3 text-xs text-muted">{formatDate(review.createdAt, locale)}</p>
        </li>
      ))}
    </ul>
  );
}
