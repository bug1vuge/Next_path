/**
 * Career-map logic. Pure: no database access, no I/O, no randomness.
 *
 * The map answers the journey's questions in order — "who am I?" → "what suits
 * me?" → "who can I become?" → "where do I study?" → "what do I do now?" — so
 * everything here derives one of those answers from data that already exists:
 * the stored test answers, the source archetypes and the visitor's own saved
 * items. Nothing is invented; where the source is silent the helper returns an
 * empty result and the interface hides the block.
 */
import type {Answer, DirectionScore} from "./scoring";

/** What the source sheet records about one answer option. */
export type OptionMeta = {
  /** Raw archetype label from the sheet, e.g. "Ученый / Аналитический". */
  archetype: string;
  /** Source block the question belongs to: "Личность", "Интересы", "Карьера". */
  block: string;
};

export type ProfileTrait = {
  archetype: string;
  count: number;
  /** Share of the block's answered questions, 0…100. */
  percent: number;
};

export type ProfileBlock = {
  block: string;
  answered: number;
  traits: ProfileTrait[];
};

/**
 * The visitor's profile, straight from their own answers.
 *
 * Each answered question contributes its option's archetype to that question's
 * block, so a block reads as "of the questions you answered here, this is what
 * you chose most often". Blocks keep the questionnaire's own order and only
 * appear once at least one of their questions is answered.
 */
export function buildProfile(
  answers: Answer[],
  options: Record<string, OptionMeta>,
  blockOrder: string[]
): ProfileBlock[] {
  // One answer per question; a later answer to the same question replaces an earlier one.
  const chosen = new Map<string, OptionMeta>();
  for (const answer of answers) {
    const meta = options[answer.optionId];
    if (meta) chosen.set(answer.questionId, meta);
  }

  const counts = new Map<string, Map<string, number>>();
  for (const meta of chosen.values()) {
    const block = counts.get(meta.block) ?? new Map<string, number>();
    block.set(meta.archetype, (block.get(meta.archetype) ?? 0) + 1);
    counts.set(meta.block, block);
  }

  const order = blockOrder.length > 0 ? blockOrder : [...counts.keys()];
  const seen = new Set(order);
  const blocks = [...order, ...[...counts.keys()].filter((block) => !seen.has(block))];

  return blocks
    .filter((block) => counts.has(block))
    .map((block) => {
      const tally = counts.get(block) as Map<string, number>;
      const answered = [...tally.values()].reduce((total, count) => total + count, 0);
      return {
        block,
        answered,
        traits: [...tally.entries()]
          .map(([archetype, count]) => ({
            archetype,
            count,
            percent: answered === 0 ? 0 : Math.round((count / answered) * 100)
          }))
          // Strongest first; equal counts keep a stable alphabetical order.
          .sort((a, b) => b.count - a.count || a.archetype.localeCompare(b.archetype))
      };
    });
}

/**
 * Plain-language caption for a source block, so "Личность" can be introduced as
 * "your strengths and abilities" in the interface.
 *
 * Like the archetype table in `test-mapping.ts` this is a **product decision,
 * not source data**: it maps the three blocks the sheet currently uses onto
 * translation keys. A block the sheet adds later is shown under its own label
 * with no caption, so an unknown block degrades quietly instead of breaking.
 */
const BLOCK_CAPTIONS: Record<string, string> = {
  личность: "strengths",
  интересы: "interests",
  карьера: "inclinations"
};

export function blockCaptionKey(block: string): string | null {
  return BLOCK_CAPTIONS[block.trim().toLowerCase()] ?? null;
}

/**
 * The development plan answers "what do I do now?". The source sheet has no
 * courses, contests or portfolio content, so these are action prompts filled in
 * with the profession's own skills and school subjects — never a named course,
 * competition or deadline the source did not provide.
 */
export const DEVELOPMENT_STEPS = ["skills", "subjects", "courses", "projects", "contests", "portfolio"] as const;

export type DevelopmentStep = (typeof DEVELOPMENT_STEPS)[number];

export const MILESTONE_IDS = [
  "test",
  "direction",
  "profession",
  "university",
  "admission",
  "development"
] as const;

export type MilestoneId = (typeof MILESTONE_IDS)[number];

/** Only what the progress depends on, so the calculation stays testable. */
export type ProgressInput = {
  hasResult: boolean;
  savedDirections: number;
  hasProfession: boolean;
  savedUniversities: number;
  admissionSteps: number;
  developmentSteps: number;
};

export type Milestone = {id: MilestoneId; done: boolean};

export type CareerProgress = {
  milestones: Milestone[];
  done: number;
  total: number;
  /** 0…100, for the progress slider. */
  percent: number;
  /** First unfinished milestone, or null once every one is done. */
  next: MilestoneId | null;
};

/**
 * How far along the map the visitor is. A milestone counts as done only when
 * they have actually taken the step — the test is finished, an item is saved,
 * a checklist has been started — never merely because a page was opened.
 */
export function careerProgress(input: ProgressInput): CareerProgress {
  const done: Record<MilestoneId, boolean> = {
    test: input.hasResult,
    direction: input.savedDirections > 0,
    profession: input.hasProfession,
    university: input.savedUniversities > 0,
    admission: input.admissionSteps > 0,
    development: input.developmentSteps > 0
  };

  const milestones = MILESTONE_IDS.map((id) => ({id, done: done[id]}));
  const completed = milestones.filter((milestone) => milestone.done).length;

  return {
    milestones,
    done: completed,
    total: milestones.length,
    percent: Math.round((completed / milestones.length) * 100),
    next: milestones.find((milestone) => !milestone.done)?.id ?? null
  };
}

/**
 * Close-by directions to fall back on — the ones the test also scored, minus
 * the ones already being followed. Directions that scored nothing are left out
 * rather than padded in to reach the limit.
 */
export function alternativeDirections(
  scores: DirectionScore[],
  exclude: string[],
  limit = 3
): DirectionScore[] {
  const excluded = new Set(exclude);
  return scores.filter((score) => !excluded.has(score.directionSlug) && score.percent > 0).slice(0, limit);
}
