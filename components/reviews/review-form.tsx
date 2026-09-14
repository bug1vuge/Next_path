"use client";

import {Star} from "lucide-react";
import {useTranslations} from "next-intl";
import {useActionState, useState} from "react";
import {publishReview, type ReviewFormState} from "@/app/[locale]/reviews/actions";
import {buttonClass, inputClass} from "@/components/ui/button";
import {REVIEW_LIMITS} from "@/lib/review-input";

const INITIAL: ReviewFormState = {
  status: "idle",
  attempt: 0,
  errors: {},
  formError: null,
  values: {name: "", rating: "", text: ""}
};

export function ReviewForm() {
  const t = useTranslations("reviews");
  const [state, action, pending] = useActionState(publishReview, INITIAL);

  return (
    <form action={action} className="scroll-mt-6 rounded-3xl border border-border bg-surface p-6" id="review-form" noValidate>
      <h2 className="text-xl font-extrabold">{t("formTitle")}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{t("publicNote")}</p>

      {/* Remounted per submission: React resets a form after its action, so what was typed is re-applied on an error. */}
      <ReviewFields key={state.attempt} state={state} />

      {/* Hidden from people and assistive tech; only bots fill it in. */}
      <div aria-hidden className="hidden">
        <label>
          Website
          <input autoComplete="off" name="website" tabIndex={-1} type="text" />
        </label>
      </div>

      {state.formError ? (
        <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {t(`errors.${state.formError}`)}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p className="mt-4 rounded-2xl bg-mint px-4 py-3 text-sm font-semibold text-success" role="status">
          {t("success")}
        </p>
      ) : null}

      <button aria-busy={pending} className={buttonClass("primary", "mt-5 w-full sm:w-auto")} disabled={pending} type="submit">
        {pending ? t("publishing") : t("publish")}
      </button>
    </form>
  );
}

function ReviewFields({state}: {state: ReviewFormState}) {
  const t = useTranslations("reviews");
  const [rating, setRating] = useState(Number(state.values.rating) || 0);
  const [hovered, setHovered] = useState(0);
  const [length, setLength] = useState([...state.values.text].length);
  const shown = hovered || rating;
  const {errors} = state;

  return (
    <div className="mt-5 grid gap-5">
      <div>
        <label className="text-sm font-bold" htmlFor="review-name">
          {t("name")}
        </label>
        <input
          aria-describedby={errors.name ? "review-name-error" : undefined}
          aria-invalid={Boolean(errors.name)}
          autoComplete="given-name"
          className={`${inputClass} mt-2`}
          defaultValue={state.values.name}
          id="review-name"
          maxLength={REVIEW_LIMITS.nameMax}
          name="name"
          placeholder={t("namePlaceholder")}
          type="text"
        />
        {errors.name ? (
          <p className="mt-1.5 text-sm text-danger" id="review-name-error">
            {t(`errors.${errors.name}`, {max: REVIEW_LIMITS.nameMax})}
          </p>
        ) : null}
      </div>

      <fieldset aria-describedby={errors.rating ? "review-rating-error" : undefined}>
        <legend className="text-sm font-bold">{t("rating")}</legend>
        <div className="mt-1 flex flex-wrap items-center gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              className="cursor-pointer rounded-full p-1.5 transition-colors duration-150 hover:bg-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
              key={value}
              onMouseEnter={() => setHovered(value)}
            >
              <input
                className="sr-only"
                defaultChecked={rating === value}
                name="rating"
                onChange={() => setRating(value)}
                type="radio"
                value={value}
              />
              <Star
                aria-hidden
                className={value <= shown ? "fill-amber-400 text-amber-400" : "text-border"}
                size={32}
              />
              <span className="sr-only">{t("ratingValue", {rating: value})}</span>
            </label>
          ))}
          {rating > 0 ? <span className="ml-2 text-sm font-semibold text-muted">{t("ratingValue", {rating})}</span> : null}
        </div>
        {errors.rating ? (
          <p className="mt-1.5 text-sm text-danger" id="review-rating-error">
            {t(`errors.${errors.rating}`)}
          </p>
        ) : null}
      </fieldset>

      <div>
        <label className="text-sm font-bold" htmlFor="review-text">
          {t("text")}
        </label>
        <textarea
          aria-describedby={errors.text ? "review-text-error" : undefined}
          aria-invalid={Boolean(errors.text)}
          className={`${inputClass} mt-2 min-h-32 py-3 leading-6`}
          defaultValue={state.values.text}
          id="review-text"
          maxLength={REVIEW_LIMITS.textMax}
          name="text"
          onChange={(event) => setLength([...event.target.value].length)}
          placeholder={t("textPlaceholder")}
          rows={5}
        />
        <div className="mt-1.5 flex items-start justify-between gap-3">
          {errors.text ? (
            <p className="text-sm text-danger" id="review-text-error">
              {t(`errors.${errors.text}`, {max: REVIEW_LIMITS.textMax})}
            </p>
          ) : (
            <span />
          )}
          <span className="shrink-0 text-xs text-muted tabular-nums">
            {t("characters", {count: length, max: REVIEW_LIMITS.textMax})}
          </span>
        </div>
      </div>
    </div>
  );
}
