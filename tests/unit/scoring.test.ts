import {describe, expect, it} from "vitest";
import {isComplete, scoreAnswers, type Answer, type ScoringQuestion} from "@/lib/scoring";

const DIRECTIONS = ["it-ai", "design-creative", "medicine", "law-government"];

/**
 * Four questions, each offering one option per direction, plus a fourth
 * question whose options never mention `law-government` — so that direction can
 * never reach a non-zero maximum through it.
 */
const QUESTIONS: ScoringQuestion[] = [
  {
    id: "q1",
    options: [
      {id: "q1a", weights: {"it-ai": 1, "engineering-architecture": 0.5}},
      {id: "q1b", weights: {"design-creative": 1}},
      {id: "q1c", weights: {medicine: 1}},
      {id: "q1d", weights: {"law-government": 1}}
    ]
  },
  {
    id: "q2",
    options: [
      {id: "q2a", weights: {"it-ai": 1}},
      {id: "q2b", weights: {"design-creative": 1}},
      {id: "q2c", weights: {medicine: 1}},
      {id: "q2d", weights: {"law-government": 1}}
    ]
  },
  {
    id: "q3",
    options: [
      {id: "q3a", weights: {"it-ai": 1}},
      {id: "q3b", weights: {"design-creative": 1}},
      {id: "q3c", weights: {medicine: 1}},
      {id: "q3d", weights: {"law-government": 1}}
    ]
  },
  {
    id: "q4",
    options: [
      {id: "q4a", weights: {"it-ai": 1}},
      {id: "q4b", weights: {"design-creative": 1}},
      {id: "q4c", weights: {medicine: 1}},
      {id: "q4d", weights: {"it-ai": 0.5, "design-creative": 0.5}}
    ]
  }
];

const percentFor = (scores: {directionSlug: string; percent: number}[], slug: string) =>
  scores.find((score) => score.directionSlug === slug)?.percent;

describe("scoreAnswers", () => {
  it("gives 100% to a direction when every answer points at it", () => {
    const answers: Answer[] = [
      {questionId: "q1", optionId: "q1a"},
      {questionId: "q2", optionId: "q2a"},
      {questionId: "q3", optionId: "q3a"},
      {questionId: "q4", optionId: "q4a"}
    ];

    const scores = scoreAnswers(answers, QUESTIONS, DIRECTIONS);

    expect(scores[0]).toEqual({directionSlug: "it-ai", percent: 100});
    expect(percentFor(scores, "design-creative")).toBe(0);
    expect(percentFor(scores, "medicine")).toBe(0);
  });

  it("spreads percentages when answers are spread evenly", () => {
    const answers: Answer[] = [
      {questionId: "q1", optionId: "q1a"},
      {questionId: "q2", optionId: "q2b"},
      {questionId: "q3", optionId: "q3c"},
      {questionId: "q4", optionId: "q4d"}
    ];

    const scores = scoreAnswers(answers, QUESTIONS, DIRECTIONS);

    // it-ai: (1 + 0.5) / 4 -> 38%, design-creative: (1 + 0.5) / 4 -> 38%,
    // medicine: 1 / 4 -> 25%, law-government: 0 / 3 -> 0%.
    expect(percentFor(scores, "it-ai")).toBe(38);
    expect(percentFor(scores, "design-creative")).toBe(38);
    expect(percentFor(scores, "medicine")).toBe(25);
    expect(percentFor(scores, "law-government")).toBe(0);
  });

  it("returns 0% for a direction that carries no weight anywhere", () => {
    const answers: Answer[] = [{questionId: "q1", optionId: "q1a"}];

    const scores = scoreAnswers(answers, QUESTIONS, [...DIRECTIONS, "agriculture"]);

    expect(percentFor(scores, "agriculture")).toBe(0);
    expect(scores).toHaveLength(5);
  });

  it("scores a partially completed test against the full maximum", () => {
    const answers: Answer[] = [
      {questionId: "q1", optionId: "q1a"},
      {questionId: "q2", optionId: "q2a"}
    ];

    const scores = scoreAnswers(answers, QUESTIONS, DIRECTIONS);

    // Two of four possible it-ai points collected out of the full maximum.
    expect(percentFor(scores, "it-ai")).toBe(50);
  });

  it("returns every direction at 0% when nothing is answered", () => {
    const scores = scoreAnswers([], QUESTIONS, DIRECTIONS);

    expect(scores).toHaveLength(DIRECTIONS.length);
    expect(scores.every((score) => score.percent === 0)).toBe(true);
  });

  it("is deterministic and breaks ties by the supplied direction order", () => {
    const answers: Answer[] = [{questionId: "q4", optionId: "q4d"}];

    const first = scoreAnswers(answers, QUESTIONS, DIRECTIONS);
    const second = scoreAnswers(answers, QUESTIONS, DIRECTIONS);

    expect(first).toEqual(second);
    expect(first.map((score) => score.directionSlug)).toEqual([
      "it-ai",
      "design-creative",
      "medicine",
      "law-government"
    ]);
  });

  it("ignores answers that reference an unknown question or option", () => {
    const answers: Answer[] = [
      {questionId: "q1", optionId: "q1a"},
      {questionId: "missing", optionId: "q1a"},
      {questionId: "q2", optionId: "missing"}
    ];

    const scores = scoreAnswers(answers, QUESTIONS, DIRECTIONS);

    expect(percentFor(scores, "it-ai")).toBe(25);
  });

  it("counts only the last answer given to a question", () => {
    const answers: Answer[] = [
      {questionId: "q1", optionId: "q1a"},
      {questionId: "q1", optionId: "q1c"}
    ];

    const scores = scoreAnswers(answers, QUESTIONS, DIRECTIONS);

    expect(percentFor(scores, "it-ai")).toBe(0);
    expect(percentFor(scores, "medicine")).toBe(25);
  });

  it("sorts descending by percent", () => {
    const answers: Answer[] = [
      {questionId: "q1", optionId: "q1c"},
      {questionId: "q2", optionId: "q2c"},
      {questionId: "q3", optionId: "q3a"}
    ];

    const scores = scoreAnswers(answers, QUESTIONS, DIRECTIONS);
    const percents = scores.map((score) => score.percent);

    expect(percents).toEqual([...percents].sort((a, b) => b - a));
    expect(scores[0].directionSlug).toBe("medicine");
  });
});

describe("isComplete", () => {
  it("is false until every question has an answer", () => {
    expect(isComplete([{questionId: "q1", optionId: "q1a"}], QUESTIONS)).toBe(false);
  });

  it("is true when every question has an answer", () => {
    const answers = QUESTIONS.map((question) => ({questionId: question.id, optionId: question.options[0].id}));
    expect(isComplete(answers, QUESTIONS)).toBe(true);
  });

  it("is false when there are no questions at all", () => {
    expect(isComplete([], [])).toBe(false);
  });
});
