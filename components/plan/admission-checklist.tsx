"use client";

import {Check} from "lucide-react";
import {useTranslations} from "next-intl";
import {buttonClass} from "@/components/ui/button";
import {DefinitionList, definitions} from "@/components/ui/page-header";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {toggleAdmissionStep, updateState, useUserState} from "@/lib/user-state";

export type AdmissionUniversity = {
  slug: string;
  name: string;
  place: string;
  exams: string | null;
  ielts: string | null;
  sat: string | null;
  grants: string | null;
  deadline: string | null;
};

const STEPS = [
  {id: "test", labelKey: "stepTest", href: "/test"},
  {id: "direction", labelKey: "stepDirection", href: "/directions"},
  {id: "profession", labelKey: "stepProfession", href: "/professions"},
  {id: "subjects", labelKey: "stepSubjects", href: "/professions"},
  {id: "universities", labelKey: "stepUniversities", href: "/universities"},
  {id: "requirements", labelKey: "stepRequirements", href: "/universities"},
  {id: "grants", labelKey: "stepGrants", href: "/grants"},
  {id: "documents", labelKey: "stepDocuments", href: "/favorites"}
] as const;

export function AdmissionChecklist({universities}: {universities: AdmissionUniversity[]}) {
  const t = useTranslations("admissionPlan");
  const tUni = useTranslations("universities");
  const tCommon = useTranslations("common");
  const state = useUserState();

  const done = new Set(state.admissionPlanDone);
  const savedSlugs = new Set(
    state.favourites.filter((favourite) => favourite.kind === "university").map((favourite) => favourite.slug)
  );
  const saved = universities.filter((university) => savedSlugs.has(university.slug));

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr]">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted">{t("done", {done: done.size, total: STEPS.length})}</p>
          {done.size > 0 ? (
            <button
              className={buttonClass("ghost")}
              onClick={() => updateState((current) => ({...current, admissionPlanDone: []}))}
              type="button"
            >
              {t("reset")}
            </button>
          ) : null}
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-2">
          {STEPS.map((step) => {
            const isDone = done.has(step.id);
            return (
              <li className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4" key={step.id}>
                <button
                  aria-pressed={isDone}
                  className={`grid size-8 shrink-0 place-items-center rounded-full border transition-colors duration-150 ${
                    isDone ? "border-brand bg-brand text-white" : "border-border bg-canvas text-muted hover:bg-soft"
                  }`}
                  onClick={() => toggleAdmissionStep(step.id)}
                  type="button"
                >
                  <Check aria-hidden size={16} />
                  <span className="sr-only">{t(step.labelKey)}</span>
                </button>
                <span className={`min-w-0 flex-1 text-sm font-semibold break-words hyphens-auto ${isDone ? "text-muted line-through" : ""}`}>
                  {t(step.labelKey)}
                </span>
                <Link className="text-sm font-bold text-brand hover:underline" href={step.href}>
                  {tCommon("more")}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">{t("yourUniversities")}</h2>
        <div className="mt-4">
          {saved.length === 0 ? (
            <EmptyState
              action={
                <Link className={buttonClass("secondary")} href="/universities">
                  {tCommon("universities")}
                </Link>
              }
              title={t("noUniversities")}
            />
          ) : (
            <ul className="grid gap-3">
              {saved.map((university) => {
                const facts = definitions([
                  university.exams ? {term: tUni("exams"), value: university.exams} : null,
                  university.ielts ? {term: tUni("ielts"), value: university.ielts} : null,
                  university.sat ? {term: tUni("sat"), value: university.sat} : null,
                  university.grants ? {term: tUni("grants"), value: university.grants} : null,
                  university.deadline ? {term: tUni("deadline"), value: university.deadline} : null
                ]);
                return (
                  <li className="rounded-2xl border border-border bg-surface p-5" key={university.slug}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link className="font-extrabold hover:underline" href={`/universities/${university.slug}`}>
                        {university.name}
                      </Link>
                      <span className="text-sm text-muted">{university.place}</span>
                    </div>
                    <div className="mt-3">
                      {facts.length > 0 ? (
                        <DefinitionList items={facts} />
                      ) : (
                        <p className="text-sm text-muted">{tUni("admissionEmpty")}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
