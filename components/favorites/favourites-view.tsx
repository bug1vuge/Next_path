"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {
  DirectionCard,
  ProfessionCard,
  UniversityCard,
  type DirectionCardData,
  type ProfessionCardData,
  type UniversityCardData
} from "@/components/catalog/cards";
import {buttonClass} from "@/components/ui/button";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {useUserState} from "@/lib/user-state";

type Tab = "all" | "professions" | "universities" | "directions";

const TABS: Tab[] = ["all", "professions", "universities", "directions"];

export function FavouritesView({
  directions,
  professions,
  universities
}: {
  directions: DirectionCardData[];
  professions: ProfessionCardData[];
  universities: UniversityCardData[];
}) {
  const t = useTranslations("favorites");
  const [tab, setTab] = useState<Tab>("all");
  const state = useUserState();

  const saved = {
    profession: new Set(state.favourites.filter((item) => item.kind === "profession").map((item) => item.slug)),
    university: new Set(state.favourites.filter((item) => item.kind === "university").map((item) => item.slug)),
    direction: new Set(state.favourites.filter((item) => item.kind === "direction").map((item) => item.slug))
  };

  const savedProfessions = professions.filter((item) => saved.profession.has(item.slug));
  const savedUniversities = universities.filter((item) => saved.university.has(item.slug));
  const savedDirections = directions.filter((item) => saved.direction.has(item.slug));
  const total = savedProfessions.length + savedUniversities.length + savedDirections.length;

  const showProfessions = tab === "all" || tab === "professions";
  const showUniversities = tab === "all" || tab === "universities";
  const showDirections = tab === "all" || tab === "directions";

  const visible =
    (showProfessions ? savedProfessions.length : 0) +
    (showUniversities ? savedUniversities.length : 0) +
    (showDirections ? savedDirections.length : 0);

  const labels: Record<Tab, string> = {
    all: t("tabAll"),
    professions: t("tabProfessions"),
    universities: t("tabUniversities"),
    directions: t("tabDirections")
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist">
          {TABS.map((value) => (
            <button
              aria-selected={tab === value}
              className={`min-h-11 rounded-full px-4 text-sm font-bold transition-colors duration-150 ${
                tab === value ? "bg-ink text-white" : "bg-surface text-muted hover:bg-soft hover:text-ink"
              }`}
              key={value}
              onClick={() => setTab(value)}
              role="tab"
              type="button"
            >
              {labels[value]}
            </button>
          ))}
        </div>
        <p className="text-sm font-semibold text-muted">{t("count", {count: total})}</p>
      </div>

      <div className="mt-6">
        {visible === 0 ? (
          <EmptyState
            action={
              <Link className={buttonClass("primary")} href="/directions">
                {t("browse")}
              </Link>
            }
            text={t("emptyText")}
            title={t("emptyTitle")}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showProfessions
              ? savedProfessions.map((profession) => <ProfessionCard key={profession.slug} profession={profession} />)
              : null}
            {showUniversities
              ? savedUniversities.map((university) => <UniversityCard key={university.slug} university={university} />)
              : null}
            {showDirections
              ? savedDirections.map((direction) => <DirectionCard direction={direction} key={direction.slug} />)
              : null}
          </div>
        )}
      </div>
    </div>
  );
}
