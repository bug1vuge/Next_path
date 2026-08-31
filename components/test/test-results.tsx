"use client";

import {ArrowRight, RotateCcw} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {buttonClass, chipClass} from "@/components/ui/button";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {formatDate} from "@/lib/format";
import type {Locale} from "@/lib/locales";
import {useUserState} from "@/lib/user-state";

export type ResultDirection = {
  slug: string;
  name: string;
  description: string;
  whoItSuits: string;
  professions: {slug: string; name: string}[];
  professionCount: number;
};

function MatchBar({percent}: {percent: number}) {
  return (
    <div aria-hidden className="mt-4 h-2 overflow-hidden rounded-full bg-soft">
      <div className="h-full rounded-full bg-brand" style={{width: `${percent}%`}} />
    </div>
  );
}

export function TestResults({directions}: {directions: ResultDirection[]}) {
  const t = useTranslations("results");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const state = useUserState();

  if (!state.result || state.result.scores.length === 0) {
    return (
      <EmptyState
        action={
          <Link className={buttonClass("primary")} href="/test">
            {t("startTest")}
          </Link>
        }
        text={t("emptyText")}
        title={t("emptyTitle")}
      />
    );
  }

  const byslug = new Map(directions.map((direction) => [direction.slug, direction]));
  const ranked = state.result.scores
    .map((score) => ({score, direction: byslug.get(score.directionSlug)}))
    .filter((entry): entry is {score: (typeof state.result.scores)[number]; direction: ResultDirection} =>
      entry.direction !== undefined
    );

  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{t("completedAt", {date: formatDate(state.result.completedAt, locale)})}</p>
        <Link className={buttonClass("secondary")} href="/test">
          <RotateCcw aria-hidden size={16} />
          {t("retake")}
        </Link>
      </div>

      <h2 className="mt-8 text-xl font-extrabold sm:text-2xl">{t("top")}</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {top.map((entry, index) => (
          <article className="flex flex-col rounded-3xl border border-border bg-surface p-6" key={entry.direction.slug}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-bold text-brand">{t("place", {place: index + 1})}</p>
              <p className="text-3xl font-extrabold tabular-nums">{entry.score.percent}%</p>
            </div>
            <h3 className="mt-2 text-lg font-extrabold">{entry.direction.name}</h3>
            <MatchBar percent={entry.score.percent} />
            {entry.direction.whoItSuits ? (
              <>
                <p className="mt-5 text-xs font-bold text-muted uppercase">{t("whyFits")}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{entry.direction.whoItSuits}</p>
              </>
            ) : null}
            {entry.direction.professions.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-bold text-muted uppercase">{t("professionsPreview")}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {entry.direction.professions.map((profession) => (
                    <li key={profession.slug}>
                      <Link className={chipClass} href={`/professions/${profession.slug}`}>
                        {profession.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Link className={`${buttonClass("primary")} mt-6 self-start`} href={`/directions/${entry.direction.slug}`}>
              {t("exploreDirection")}
              <ArrowRight aria-hidden size={18} />
            </Link>
          </article>
        ))}
      </div>

      {rest.length > 0 ? (
        <>
          <h2 className="mt-12 text-xl font-extrabold sm:text-2xl">{t("others")}</h2>
          <ul className="mt-4 grid gap-3">
            {rest.map((entry) => (
              <li
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4"
                key={entry.direction.slug}
              >
                <div className="min-w-52 flex-1">
                  <p className="font-extrabold">{entry.direction.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{entry.direction.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-extrabold tabular-nums">{entry.score.percent}%</span>
                  <Link className={buttonClass("secondary")} href={`/directions/${entry.direction.slug}`}>
                    {tCommon("more")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <section className="mt-12 rounded-3xl bg-mint p-6 sm:p-8">
        <h2 className="text-lg font-extrabold">{t("howTitle")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{t("howText")}</p>
      </section>
    </div>
  );
}
