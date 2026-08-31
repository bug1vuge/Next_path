"use client";

import {useTranslations} from "next-intl";
import {ProfessionCard, type ProfessionCardData} from "@/components/catalog/cards";
import {buttonClass} from "@/components/ui/button";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {useUserState} from "@/lib/user-state";

/**
 * Sorting by match needs the test result, which lives in the browser, so that
 * one ordering is applied here. Every other sort is already done by the
 * database query that produced `professions`.
 */
export function ProfessionResults({
  professions,
  sort,
  resetHref
}: {
  professions: ProfessionCardData[];
  sort: string;
  resetHref: string;
}) {
  const t = useTranslations("professions");
  const tCommon = useTranslations("common");
  const state = useUserState();

  const percentByDirection = new Map(
    (state.result?.scores ?? []).map((score) => [score.directionSlug, score.percent])
  );
  const useMatch = sort === "match" && percentByDirection.size > 0;

  const items = useMatch
    ? [...professions].sort(
        (a, b) => (percentByDirection.get(b.directionSlug) ?? 0) - (percentByDirection.get(a.directionSlug) ?? 0)
      )
    : professions;

  if (items.length === 0) {
    return (
      <EmptyState
        action={
          <Link className={buttonClass("secondary")} href={resetHref}>
            {tCommon("reset")}
          </Link>
        }
        text={tCommon("emptyText")}
        title={tCommon("emptyTitle")}
      />
    );
  }

  return (
    <>
      {sort === "match" && !useMatch ? (
        <p className="mb-4 rounded-2xl bg-peach px-4 py-3 text-sm font-semibold">{t("sortMatchHint")}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((profession) => (
          <ProfessionCard
            key={profession.slug}
            match={useMatch ? percentByDirection.get(profession.directionSlug) : undefined}
            profession={profession}
          />
        ))}
      </div>
    </>
  );
}
