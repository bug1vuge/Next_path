/**
 * Validation for site reviews. Pure: no database, no request, no clock of its own,
 * so the rules the form and the server action share can be tested directly.
 */
export const REVIEW_LIMITS = {nameMax: 60, textMax: 1000, ratingMin: 1, ratingMax: 5} as const;

export type ReviewInput = {name: string; rating: number; text: string};

export type ReviewField = "name" | "rating" | "text";

/** Message keys under `reviews.errors`; the interface translates them. */
export type ReviewErrorKey = "nameRequired" | "nameTooLong" | "ratingRequired" | "textRequired" | "textTooLong";

export type ReviewValidation =
  | {ok: true; review: ReviewInput}
  | {ok: false; errors: Partial<Record<ReviewField, ReviewErrorKey>>};

/** Collapses runs of spaces and trims, keeping the line breaks a review may use. */
function tidy(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function validateReview(raw: {name: unknown; rating: unknown; text: unknown}): ReviewValidation {
  const name = tidy(raw.name).replace(/\n/g, " ");
  const text = tidy(raw.text);
  const rating = Number(raw.rating);
  const errors: Partial<Record<ReviewField, ReviewErrorKey>> = {};

  if (!name) errors.name = "nameRequired";
  else if ([...name].length > REVIEW_LIMITS.nameMax) errors.name = "nameTooLong";

  if (!Number.isInteger(rating) || rating < REVIEW_LIMITS.ratingMin || rating > REVIEW_LIMITS.ratingMax) {
    errors.rating = "ratingRequired";
  }

  if (!text) errors.text = "textRequired";
  else if ([...text].length > REVIEW_LIMITS.textMax) errors.text = "textTooLong";

  return Object.keys(errors).length > 0 ? {ok: false, errors} : {ok: true, review: {name, rating, text}};
}

/**
 * A sliding-window limit per sender, so one visitor cannot flood the public page.
 * `log` holds recent submission times per key and is pruned as it is read.
 */
export function withinRateLimit(
  log: Map<string, number[]>,
  key: string,
  now: number,
  {limit = 3, windowMs = 10 * 60 * 1000}: {limit?: number; windowMs?: number} = {}
): boolean {
  const recent = (log.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    log.set(key, recent);
    return false;
  }
  log.set(key, [...recent, now]);
  return true;
}

/** Average rating rounded to one decimal, or null when there are no reviews. */
export function averageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
}
