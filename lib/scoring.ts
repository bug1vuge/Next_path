/**
 * Test scoring. Pure: no database access, no I/O, no randomness.
 *
 * For every direction d:
 *   raw[d]     = sum over ANSWERED questions of (selected option).weights[d] ?? 0
 *   max[d]     = sum over ALL questions of max(weights[d] across that question's options)
 *   percent[d] = max[d] === 0 ? 0 : round(raw[d] / max[d] * 100)
 *
 * Every direction is returned, sorted by percent descending. Ties keep the
 * order in which the direction slugs were supplied, so identical answers always
 * produce an identical ranking.
 */
export type ScoringOption = {
  id: string;
  weights: Record<string, number>;
};

export type ScoringQuestion = {
  id: string;
  options: ScoringOption[];
};

export type Answer = {
  questionId: string;
  optionId: string;
};

export type DirectionScore = {
  directionSlug: string;
  percent: number;
};

function weightOf(option: ScoringOption, directionSlug: string): number {
  const weight = option.weights?.[directionSlug];
  return typeof weight === "number" && Number.isFinite(weight) ? weight : 0;
}

export function scoreAnswers(
  answers: Answer[],
  questions: ScoringQuestion[],
  directionSlugs: string[]
): DirectionScore[] {
  const questionById = new Map(questions.map((question) => [question.id, question]));

  // One answer per question; a later answer to the same question replaces an earlier one.
  const selected = new Map<string, ScoringOption>();
  for (const answer of answers) {
    const question = questionById.get(answer.questionId);
    if (!question) continue;
    const option = question.options.find((candidate) => candidate.id === answer.optionId);
    if (!option) continue;
    selected.set(question.id, option);
  }

  return directionSlugs
    .map((directionSlug, index) => {
      let raw = 0;
      for (const option of selected.values()) raw += weightOf(option, directionSlug);

      let max = 0;
      for (const question of questions) {
        let best = 0;
        for (const option of question.options) best = Math.max(best, weightOf(option, directionSlug));
        max += best;
      }

      return {
        directionSlug,
        percent: max === 0 ? 0 : Math.round((raw / max) * 100),
        index
      };
    })
    .sort((a, b) => b.percent - a.percent || a.index - b.index)
    .map(({directionSlug, percent}) => ({directionSlug, percent}));
}

/** Percentages for the answered questions only — used for the live progress hint. */
export function isComplete(answers: Answer[], questions: ScoringQuestion[]): boolean {
  const answered = new Set(answers.map((answer) => answer.questionId));
  return questions.length > 0 && questions.every((question) => answered.has(question.id));
}
