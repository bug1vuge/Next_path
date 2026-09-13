"use client";

import {ArrowRight, Check, RotateCcw} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import type {ReactNode} from "react";
import {ProfessionCard, UniversityCard, type ProfessionCardData} from "@/components/catalog/cards";
import {BuildPathButton} from "@/components/catalog/build-path-button";
import {SelectSavedProfession} from "@/components/career/select-saved-profession";
import {buttonClass, chipClass} from "@/components/ui/button";
import {DefinitionList, definitions} from "@/components/ui/page-header";
import {FavouriteButton} from "@/components/ui/favourite-button";
import {EmptyState} from "@/components/ui/states";
import {Link} from "@/i18n/navigation";
import {
  alternativeDirections,
  blockCaptionKey,
  buildProfile,
  careerProgress,
  DEVELOPMENT_STEPS,
  type OptionMeta
} from "@/lib/career-map";
import {formatDate} from "@/lib/format";
import type {Locale} from "@/lib/locales";
import {toggleDevelopmentStep, updateState, useUserState} from "@/lib/user-state";
import {ProgressRail} from "./progress-rail";

export type MapDirection = {
  slug: string;
  name: string;
  description: string;
  whoItSuits: string;
  skills: string[];
  schoolSubjects: string[];
  professionCount: number;
};

export type MapProfession = {
  slug: string;
  name: string;
  shortDescription: string;
  directionSlug: string;
  directionName: string;
  salaryLabel: string | null;
  demandLabel: string | null;
  skills: string[];
  schoolSubjects: string[];
};

export type MapUniversity = {
  slug: string;
  name: string;
  country: string;
  city: string;
  ratingLabel: string | null;
  tuition: string | null;
  programCount: number;
  exams: string | null;
  ielts: string | null;
  sat: string | null;
  grants: string | null;
  deadline: string | null;
};

export type MapSelection = {
  profession: {
    slug: string;
    name: string;
    whatTheyDo: string;
    skills: string[];
    schoolSubjects: string[];
    specialties: string[];
    pros: string[];
    cons: string[];
    salaryLabel: string | null;
    demandLabel: string | null;
    ladder: string[];
    directionSlug: string;
    directionName: string;
  };
  universities: MapUniversity[];
};

/** One numbered station of the map. `scroll-mt` clears the sticky progress rail. */
function MapSection({
  id,
  index,
  title,
  description,
  action,
  children
}: {
  id: string;
  index: number;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-12 scroll-mt-44 sm:scroll-mt-40" id={id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-brand">{String(index).padStart(2, "0")}</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Bar({percent, tone = "brand"}: {percent: number; tone?: "brand" | "muted"}) {
  return (
    <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-soft">
      <div
        className={`h-full rounded-full ${tone === "brand" ? "bg-brand" : "bg-muted"}`}
        style={{width: `${percent}%`}}
      />
    </div>
  );
}

function Chips({items, limit}: {items: string[]; limit?: number}) {
  const shown = limit ? items.slice(0, limit) : items;
  if (shown.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {shown.map((item) => (
        <li className={chipClass} key={item}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CareerMap({
  directions,
  professions,
  blocks,
  optionMeta,
  labels,
  selection
}: {
  directions: MapDirection[];
  professions: MapProfession[];
  blocks: string[];
  optionMeta: Record<string, OptionMeta>;
  /** Source block / archetype → the label shown in the current language. */
  labels: Record<string, string>;
  selection: MapSelection | null;
}) {
  const t = useTranslations("careerPath");
  const tCommon = useTranslations("common");
  const tResults = useTranslations("results");
  const tUni = useTranslations("universities");
  const tProf = useTranslations("professions");
  const locale = useLocale() as Locale;
  const state = useUserState();

  const directionBySlug = new Map(directions.map((direction) => [direction.slug, direction]));
  const result = state.result;

  const ranked = (result?.scores ?? [])
    .map((score) => ({score, direction: directionBySlug.get(score.directionSlug)}))
    .filter((entry): entry is {score: {directionSlug: string; percent: number}; direction: MapDirection} =>
      entry.direction !== undefined
    );
  const topDirections = ranked.slice(0, 3);

  const savedOf = (kind: "profession" | "university" | "direction") =>
    state.favourites.filter((favourite) => favourite.kind === kind).map((favourite) => favourite.slug);
  const savedProfessionSlugs = savedOf("profession");
  const savedProfessions = professions.filter((profession) => savedProfessionSlugs.includes(profession.slug));

  // The profession the map is built around belongs in the comparison even when
  // it was never added to favourites, so the section never claims that nothing
  // has been chosen while the map above it is built for something.
  const compared = (() => {
    const current = selection ? professions.find((entry) => entry.slug === selection.profession.slug) : undefined;
    return current && !savedProfessionSlugs.includes(current.slug) ? [current, ...savedProfessions] : savedProfessions;
  })();

  const progress = careerProgress({
    hasResult: Boolean(result),
    savedDirections: savedOf("direction").length,
    hasProfession: Boolean(selection) || savedProfessions.length > 0 || Boolean(state.selectedProfession),
    savedUniversities: savedOf("university").length,
    admissionSteps: state.admissionPlanDone.length,
    developmentSteps: state.developmentPlanDone.length
  });

  const profile = buildProfile(result?.answers ?? state.answers, optionMeta, blocks);

  // The map keeps its focus on the chosen profession; when none is chosen yet it
  // falls back to the strongest direction from the test.
  const focusDirection = selection
    ? directionBySlug.get(selection.profession.directionSlug)
    : topDirections[0]?.direction;

  const subjects = selection?.profession.schoolSubjects.length
    ? selection.profession.schoolSubjects
    : (focusDirection?.schoolSubjects ?? []);
  const skills = selection?.profession.skills.length
    ? selection.profession.skills
    : (focusDirection?.skills ?? []);

  const alternatives = alternativeDirections(
    result?.scores ?? [],
    [...topDirections.map((entry) => entry.direction.slug), focusDirection?.slug ?? ""]
  );

  const toCard = (profession: MapProfession): ProfessionCardData => ({
    slug: profession.slug,
    name: profession.name,
    description: profession.shortDescription,
    directionSlug: profession.directionSlug,
    directionName: profession.directionName,
    salaryLabel: profession.salaryLabel,
    demandLabel: profession.demandLabel,
    skills: profession.skills
  });

  const savedUniversitySlugs = savedOf("university");
  const admissionUniversities = (selection?.universities ?? []).filter(
    (university) =>
      savedUniversitySlugs.includes(university.slug) &&
      (university.exams || university.ielts || university.sat || university.grants || university.deadline)
  );

  return (
    <div>
      <ProgressRail progress={progress} />

      {/* 1 — Who am I? */}
      <MapSection
        action={
          result ? (
            <Link className={buttonClass("secondary")} href="/test">
              <RotateCcw aria-hidden size={16} />
              {tResults("retake")}
            </Link>
          ) : null
        }
        description={t("profileText")}
        id="map-profile"
        index={1}
        title={t("profileTitle")}
      >
        {profile.length === 0 ? (
          <EmptyState
            action={
              <Link className={buttonClass("primary")} href="/test">
                {tResults("startTest")}
              </Link>
            }
            text={t("needTest")}
            title={tResults("emptyTitle")}
          />
        ) : (
          <>
            {result ? (
              <p className="text-sm text-muted">
                {tResults("completedAt", {date: formatDate(result.completedAt, locale)})}
              </p>
            ) : null}
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {profile.map((block) => {
                const caption = blockCaptionKey(block.block);
                return (
                  <article className="rounded-3xl border border-border bg-surface p-5" key={block.block}>
                    <p className="text-xs font-bold text-brand uppercase">
                      {caption ? t(`blockCaption.${caption}`) : t("blockCaptionFallback")}
                    </p>
                    <h3 className="mt-1 font-extrabold">{labels[block.block] ?? block.block}</h3>
                    <ul className="mt-4 grid gap-3">
                      {block.traits.slice(0, 3).map((trait) => (
                        <li key={trait.archetype}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-semibold">{labels[trait.archetype] ?? trait.archetype}</span>
                            <span className="text-sm font-bold tabular-nums text-muted">{trait.percent}%</span>
                          </div>
                          <Bar percent={trait.percent} />
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-xs text-muted">{t("blockAnswered", {count: block.answered})}</p>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </MapSection>

      {/* 2 — What suits me? */}
      <MapSection
        action={
          result ? (
            <Link className={buttonClass("ghost")} href="/test/results">
              {tCommon("more")}
            </Link>
          ) : null
        }
        description={t("directionsText")}
        id="map-directions"
        index={2}
        title={t("directionsTitle")}
      >
        {topDirections.length === 0 ? (
          <EmptyState
            action={
              <Link className={buttonClass("primary")} href="/test">
                {tResults("startTest")}
              </Link>
            }
            text={t("needTest")}
            title={tResults("emptyTitle")}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {topDirections.map((entry, index) => (
              <article className="flex flex-col rounded-3xl border border-border bg-surface p-6" key={entry.direction.slug}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold text-brand">{tResults("place", {place: index + 1})}</p>
                  <FavouriteButton compact kind="direction" slug={entry.direction.slug} />
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-extrabold">{entry.direction.name}</h3>
                  <p className="text-2xl font-extrabold tabular-nums">{entry.score.percent}%</p>
                </div>
                <Bar percent={entry.score.percent} />
                {entry.direction.whoItSuits ? (
                  <>
                    <p className="mt-5 text-xs font-bold text-muted uppercase">{tResults("whyFits")}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{entry.direction.whoItSuits}</p>
                  </>
                ) : null}
                <Link
                  className={`${buttonClass("secondary")} mt-5 self-start`}
                  href={`/directions/${entry.direction.slug}`}
                >
                  {tCommon("more")}
                </Link>
              </article>
            ))}
          </div>
        )}
      </MapSection>

      {/* 3 — Who can I become? */}
      <MapSection description={t("professionsText")} id="map-professions" index={3} title={t("professionsTitle")}>
        {topDirections.length === 0 ? (
          <p className="text-sm text-muted">{t("needTest")}</p>
        ) : (
          <div className="grid gap-8">
            {topDirections.map((entry) => {
              const matching = professions
                .filter((profession) => profession.directionSlug === entry.direction.slug)
                .slice(0, 3);
              if (matching.length === 0) return null;
              return (
                <div key={entry.direction.slug}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-extrabold">
                      {entry.direction.name}
                      <span className="ml-2 text-sm font-semibold text-muted tabular-nums">{entry.score.percent}%</span>
                    </h3>
                    <Link
                      className={buttonClass("ghost")}
                      href={`/professions?direction=${encodeURIComponent(entry.direction.slug)}`}
                    >
                      {tCommon("all")}
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {matching.map((profession) => (
                      <ProfessionCard key={profession.slug} profession={toCard(profession)} match={entry.score.percent} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </MapSection>

      {/* 4 — Choosing between them. */}
      <MapSection
        action={
          <Link className={buttonClass("ghost")} href="/professions">
            {tCommon("professions")}
          </Link>
        }
        description={t("choiceText")}
        id="map-choice"
        index={4}
        title={t("choiceTitle")}
      >
        {compared.length === 0 ? (
          <SelectSavedProfession
            options={professions.map((profession) => ({slug: profession.slug, name: profession.name}))}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-bold text-muted uppercase">
                  <th className="py-3 pr-4">{t("compareProfession")}</th>
                  <th className="py-3 pr-4">{tCommon("direction")}</th>
                  <th className="py-3 pr-4">{tProf("salaryLevel")}</th>
                  <th className="py-3 pr-4">{tProf("demand")}</th>
                  <th className="py-3">{tCommon("skills")}</th>
                </tr>
              </thead>
              <tbody>
                {compared.map((profession) => (
                  <tr className="border-b border-border last:border-0" key={profession.slug}>
                    <td className="py-4 pr-4 align-top">
                      <Link className="font-bold hover:underline" href={`/professions/${profession.slug}`}>
                        {profession.name}
                      </Link>
                      {selection?.profession.slug === profession.slug ? (
                        <span className="mt-1 block text-xs font-bold text-brand">{t("currentChoice")}</span>
                      ) : (
                        <span className="mt-2 block">
                          <BuildPathButton slug={profession.slug} />
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-4 align-top text-muted">{profession.directionName}</td>
                    <td className="py-4 pr-4 align-top">{profession.salaryLabel ?? tCommon("notSpecified")}</td>
                    <td className="py-4 pr-4 align-top">{profession.demandLabel ?? tCommon("notSpecified")}</td>
                    <td className="py-4 align-top">
                      <Chips items={profession.skills} limit={3} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {compared.length === 1 ? <p className="mt-4 text-sm text-muted">{t("compareHint")}</p> : null}
          </div>
        )}
      </MapSection>

      {/* 5 — Where do I study? */}
      <MapSection
        action={
          focusDirection ? (
            <Link
              className={buttonClass("ghost")}
              href={`/universities?direction=${encodeURIComponent(focusDirection.slug)}`}
            >
              {tCommon("all")}
            </Link>
          ) : null
        }
        description={t("universitiesText")}
        id="map-universities"
        index={5}
        title={t("universitiesTitle")}
      >
        {!selection ? (
          <p className="text-sm text-muted">{t("needProfession")}</p>
        ) : selection.universities.length === 0 ? (
          <EmptyState title={t("noUniversities")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selection.universities.slice(0, 6).map((university) => (
              <UniversityCard key={university.slug} university={university} />
            ))}
          </div>
        )}
      </MapSection>

      {/* 6 — The admission plan. */}
      <MapSection
        action={
          <Link className={buttonClass("primary")} href="/admission-plan">
            {t("openPlan")}
            <ArrowRight aria-hidden size={18} />
          </Link>
        }
        description={t("admissionText")}
        id="map-admission"
        index={6}
        title={t("admissionTitle")}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-surface p-6">
            <h3 className="font-extrabold">{t("subjectsToStudy")}</h3>
            <div className="mt-3">
              {subjects.length > 0 ? <Chips items={subjects} /> : <p className="text-sm text-muted">{t("needProfession")}</p>}
            </div>
            <p className="mt-5 text-sm font-semibold text-muted">
              {t("planProgress", {done: state.admissionPlanDone.length})}
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6">
            <h3 className="font-extrabold">{tUni("admissionTitle")}</h3>
            <div className="mt-3">
              {admissionUniversities.length === 0 ? (
                <p className="text-sm text-muted">{t("needUniversities")}</p>
              ) : (
                <ul className="grid gap-4">
                  {admissionUniversities.slice(0, 3).map((university) => (
                    <li key={university.slug}>
                      <Link className="font-bold hover:underline" href={`/universities/${university.slug}`}>
                        {university.name}
                      </Link>
                      <div className="mt-2">
                        <DefinitionList
                          items={definitions([
                            university.exams ? {term: tUni("exams"), value: university.exams} : null,
                            university.ielts ? {term: tUni("ielts"), value: university.ielts} : null,
                            university.sat ? {term: tUni("sat"), value: university.sat} : null,
                            university.deadline ? {term: tUni("deadline"), value: university.deadline} : null
                          ])}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </MapSection>

      {/* 7 — What do I do now? */}
      <MapSection
        action={
          state.developmentPlanDone.length > 0 ? (
            <button
              className={buttonClass("ghost")}
              onClick={() => updateState((current) => ({...current, developmentPlanDone: []}))}
              type="button"
            >
              {tCommon("reset")}
            </button>
          ) : null
        }
        description={t("developmentText")}
        id="map-development"
        index={7}
        title={t("developmentTitle")}
      >
        <ul className="grid gap-2">
          {DEVELOPMENT_STEPS.map((step) => {
            const isDone = state.developmentPlanDone.includes(step);
            const extra = step === "skills" ? skills : step === "subjects" ? subjects : [];
            return (
              <li className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4" key={step}>
                <button
                  aria-pressed={isDone}
                  className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border transition-colors duration-150 ${
                    isDone ? "border-brand bg-brand text-white" : "border-border bg-canvas text-muted hover:bg-soft"
                  }`}
                  onClick={() => toggleDevelopmentStep(step)}
                  type="button"
                >
                  <Check aria-hidden size={16} />
                  <span className="sr-only">{t(`development.${step}`)}</span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${isDone ? "text-muted line-through" : ""}`}>
                    {t(`development.${step}`)}
                  </p>
                  {extra.length > 0 ? (
                    <div className="mt-2">
                      <Chips items={extra} limit={6} />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs leading-5 text-muted">{t("developmentNote")}</p>
      </MapSection>

      {/* 8 — How do I get there? */}
      <MapSection description={t("pathText")} id="map-path" index={8} title={t("pathTitle")}>
        <ol className="flex snap-x gap-3 overflow-x-auto pb-2">
          {[
            {key: "student", detail: [] as string[]},
            {key: "subjects", detail: subjects.slice(0, 4)},
            {key: "skills", detail: skills.slice(0, 4)},
            {key: "projects", detail: []},
            {
              key: "university",
              detail: selection ? selection.universities.slice(0, 2).map((university) => university.name) : []
            },
            {key: "firstJob", detail: selection ? [selection.profession.name] : []},
            {key: "growth", detail: selection?.profession.ladder ?? []}
          ].map((stage, index, stages) => (
            <li className="w-56 shrink-0 snap-start" key={stage.key}>
              <div className="flex h-full flex-col rounded-3xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                    {index + 1}
                  </span>
                  {index < stages.length - 1 ? <ArrowRight aria-hidden className="text-muted" size={14} /> : null}
                </div>
                <p className="mt-3 text-sm font-extrabold">{t(`chain.${stage.key}`)}</p>
                {stage.detail.length > 0 ? (
                  <ul className="mt-2 grid gap-1 text-xs leading-5 text-muted">
                    {stage.detail.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {stage.key === "growth" && (selection?.profession.ladder.length ?? 0) === 0 ? (
                  <p className="mt-2 text-xs leading-5 text-muted">{t("ladderEmpty")}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </MapSection>

      {/* 9 — And if it does not fit. */}
      <MapSection description={t("alternativesText")} id="map-alternatives" index={9} title={t("alternativesTitle")}>
        {alternatives.length === 0 ? (
          <p className="text-sm text-muted">{t("needTest")}</p>
        ) : (
          <ul className="grid gap-3">
            {alternatives.map((score) => {
              const direction = directionBySlug.get(score.directionSlug);
              if (!direction) return null;
              const sample = professions
                .filter((profession) => profession.directionSlug === direction.slug)
                .slice(0, 4);
              return (
                <li className="rounded-3xl border border-border bg-surface p-5" key={direction.slug}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="font-extrabold">{direction.name}</p>
                    <span className="text-lg font-extrabold tabular-nums">{score.percent}%</span>
                  </div>
                  <Bar percent={score.percent} tone="muted" />
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{direction.description}</p>
                  {sample.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {sample.map((profession) => (
                        <li key={profession.slug}>
                          <Link className={chipClass} href={`/professions/${profession.slug}`}>
                            {profession.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Link className={`${buttonClass("secondary")} mt-4 self-start`} href={`/directions/${direction.slug}`}>
                    {tCommon("more")}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </MapSection>
    </div>
  );
}
