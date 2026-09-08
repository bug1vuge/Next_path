"use client";

import {Check} from "lucide-react";
import {useTranslations} from "next-intl";
import type {CareerProgress, MilestoneId} from "@/lib/career-map";

/**
 * The visitor's position on the map, as a slider they can also navigate with.
 *
 * It sticks to the top of the viewport so the answer to "how far along am I?"
 * stays visible while scrolling, and each milestone jumps to the section that
 * completes it. On narrow screens the milestones scroll sideways inside their
 * own track rather than widening the page.
 */
const SECTION_OF: Record<MilestoneId, string> = {
  test: "map-profile",
  direction: "map-directions",
  profession: "map-choice",
  university: "map-universities",
  admission: "map-admission",
  development: "map-development"
};

export function ProgressRail({progress}: {progress: CareerProgress}) {
  const t = useTranslations("careerPath");

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-canvas/95 py-3 backdrop-blur">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-extrabold">{t("progressTitle")}</p>
        <p className="text-sm font-semibold text-muted">
          {t("progressCount", {done: progress.done, total: progress.total})}
        </p>
      </div>

      <div
        aria-label={t("progressTitle")}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress.percent}
        aria-valuetext={t("progressCount", {done: progress.done, total: progress.total})}
        className="relative mt-2.5 h-2 rounded-full bg-soft"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500"
          style={{width: `${progress.percent}%`}}
        />
        <span
          aria-hidden
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-brand bg-surface shadow-sm transition-[left] duration-500"
          style={{left: `${progress.percent}%`}}
        />
      </div>

      <ol className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {progress.milestones.map((milestone, index) => (
          <li className="shrink-0" key={milestone.id}>
            <a
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors duration-150 ${
                milestone.done
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border bg-surface text-muted hover:bg-soft hover:text-ink"
              }`}
              href={`#${SECTION_OF[milestone.id]}`}
            >
              <span
                aria-hidden
                className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] ${
                  milestone.done ? "bg-brand text-white" : "bg-soft text-muted"
                }`}
              >
                {milestone.done ? <Check size={12} /> : index + 1}
              </span>
              {t(`milestone.${milestone.id}`)}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
