import {describe, expect, it} from "vitest";
import {averageRating, REVIEW_LIMITS, validateReview, withinRateLimit} from "@/lib/review-input";

describe("validateReview", () => {
  it("accepts a name, a 1–5 rating and a text, tidying the whitespace", () => {
    expect(validateReview({name: "  Айгерим  ", rating: "5", text: "Очень   помог\r\n\r\n\r\nсайт!  "})).toEqual({
      ok: true,
      review: {name: "Айгерим", rating: 5, text: "Очень помог\n\nсайт!"}
    });
  });

  it("requires every field", () => {
    expect(validateReview({name: "   ", rating: "", text: "\n"})).toEqual({
      ok: false,
      errors: {name: "nameRequired", rating: "ratingRequired", text: "textRequired"}
    });
  });

  it.each(["0", "6", "4.5", "abc", "-1"])("rejects the rating %s", (rating) => {
    const result = validateReview({name: "Dana", rating, text: "Good"});
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.rating).toBe("ratingRequired");
  });

  it("enforces the length limits in characters, not bytes", () => {
    const longName = "Ә".repeat(REVIEW_LIMITS.nameMax);
    expect(validateReview({name: longName, rating: 3, text: "ok"}).ok).toBe(true);

    const result = validateReview({name: `${longName}Ә`, rating: 3, text: "x".repeat(REVIEW_LIMITS.textMax + 1)});
    expect(result).toEqual({ok: false, errors: {name: "nameTooLong", text: "textTooLong"}});
  });

  it("keeps a name on one line", () => {
    const result = validateReview({name: "Dana\nK.", rating: 4, text: "ok"});
    expect(result.ok && result.review.name).toBe("Dana K.");
  });
});

describe("withinRateLimit", () => {
  it("allows up to the limit inside the window, then refuses", () => {
    const log = new Map<string, number[]>();
    const options = {limit: 2, windowMs: 1000};
    expect(withinRateLimit(log, "ip", 0, options)).toBe(true);
    expect(withinRateLimit(log, "ip", 100, options)).toBe(true);
    expect(withinRateLimit(log, "ip", 200, options)).toBe(false);
    // Other senders are unaffected.
    expect(withinRateLimit(log, "other", 200, options)).toBe(true);
  });

  it("frees a slot once the oldest submission leaves the window", () => {
    const log = new Map<string, number[]>();
    const options = {limit: 2, windowMs: 1000};
    withinRateLimit(log, "ip", 0, options);
    withinRateLimit(log, "ip", 500, options);
    expect(withinRateLimit(log, "ip", 999, options)).toBe(false);
    expect(withinRateLimit(log, "ip", 1000, options)).toBe(true);
  });
});

describe("averageRating", () => {
  it("rounds to one decimal and is null with no reviews", () => {
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([])).toBeNull();
  });
});
