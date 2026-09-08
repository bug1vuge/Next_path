import {describe, expect, it} from "vitest";
import {
  alternativeDirections,
  blockCaptionKey,
  buildProfile,
  careerProgress,
  MILESTONE_IDS,
  type OptionMeta
} from "@/lib/career-map";

const OPTIONS: Record<string, OptionMeta> = {
  "p-analyst": {archetype: "Ученый / Аналитический", block: "Личность"},
  "p-creative": {archetype: "Интуитивный / Креативный", block: "Личность"},
  "i-it": {archetype: "Цифровые технологии / IT", block: "Интересы"},
  "i-art": {archetype: "Творчество / Искусство", block: "Интересы"},
  "c-ai": {archetype: "IT и ИИ", block: "Карьера"}
};

const BLOCKS = ["Личность", "Интересы", "Карьера"];

describe("buildProfile", () => {
  it("counts the chosen archetypes per source block", () => {
    const profile = buildProfile(
      [
        {questionId: "q1", optionId: "p-analyst"},
        {questionId: "q2", optionId: "p-analyst"},
        {questionId: "q3", optionId: "p-creative"},
        {questionId: "q4", optionId: "i-it"}
      ],
      OPTIONS,
      BLOCKS
    );

    expect(profile).toEqual([
      {
        block: "Личность",
        answered: 3,
        traits: [
          {archetype: "Ученый / Аналитический", count: 2, percent: 67},
          {archetype: "Интуитивный / Креативный", count: 1, percent: 33}
        ]
      },
      {
        block: "Интересы",
        answered: 1,
        traits: [{archetype: "Цифровые технологии / IT", count: 1, percent: 100}]
      }
    ]);
  });

  it("keeps the questionnaire's block order and omits blocks with no answers", () => {
    const profile = buildProfile(
      [
        {questionId: "q1", optionId: "c-ai"},
        {questionId: "q2", optionId: "p-analyst"}
      ],
      OPTIONS,
      BLOCKS
    );

    expect(profile.map((block) => block.block)).toEqual(["Личность", "Карьера"]);
  });

  it("counts one answer per question, keeping the last one", () => {
    const profile = buildProfile(
      [
        {questionId: "q1", optionId: "p-analyst"},
        {questionId: "q1", optionId: "p-creative"}
      ],
      OPTIONS,
      BLOCKS
    );

    expect(profile).toEqual([
      {
        block: "Личность",
        answered: 1,
        traits: [{archetype: "Интуитивный / Креативный", count: 1, percent: 100}]
      }
    ]);
  });

  it("ignores answers that reference an unknown option", () => {
    expect(buildProfile([{questionId: "q1", optionId: "gone"}], OPTIONS, BLOCKS)).toEqual([]);
  });

  it("returns nothing when the test has not been taken", () => {
    expect(buildProfile([], OPTIONS, BLOCKS)).toEqual([]);
  });

  it("still reports a block the questionnaire order does not mention", () => {
    const profile = buildProfile([{questionId: "q1", optionId: "c-ai"}], OPTIONS, ["Личность"]);
    expect(profile.map((block) => block.block)).toEqual(["Карьера"]);
  });
});

describe("blockCaptionKey", () => {
  it("captions the blocks the source sheet uses, whatever the casing", () => {
    expect(blockCaptionKey("Личность")).toBe("strengths");
    expect(blockCaptionKey("  интересы ")).toBe("interests");
    expect(blockCaptionKey("Карьера")).toBe("inclinations");
  });

  it("leaves an unknown block without a caption", () => {
    expect(blockCaptionKey("Ценности")).toBeNull();
  });
});

describe("careerProgress", () => {
  const empty = {
    hasResult: false,
    savedDirections: 0,
    hasProfession: false,
    savedUniversities: 0,
    admissionSteps: 0,
    developmentSteps: 0
  };

  it("starts at zero with every milestone open", () => {
    const progress = careerProgress(empty);
    expect(progress.percent).toBe(0);
    expect(progress.done).toBe(0);
    expect(progress.total).toBe(MILESTONE_IDS.length);
    expect(progress.next).toBe("test");
    expect(progress.milestones.every((milestone) => !milestone.done)).toBe(true);
  });

  it("counts each step the visitor actually took", () => {
    const progress = careerProgress({...empty, hasResult: true, hasProfession: true});
    expect(progress.done).toBe(2);
    expect(progress.percent).toBe(33);
    // The first unfinished milestone is the one to point at next.
    expect(progress.next).toBe("direction");
  });

  it("reaches 100% with nothing left once every step is done", () => {
    const progress = careerProgress({
      hasResult: true,
      savedDirections: 1,
      hasProfession: true,
      savedUniversities: 2,
      admissionSteps: 3,
      developmentSteps: 1
    });
    expect(progress.percent).toBe(100);
    expect(progress.next).toBeNull();
  });
});

describe("alternativeDirections", () => {
  const scores = [
    {directionSlug: "it-ai", percent: 80},
    {directionSlug: "design-creative", percent: 55},
    {directionSlug: "medicine", percent: 20},
    {directionSlug: "law-government", percent: 0}
  ];

  it("suggests the next best directions the visitor is not already following", () => {
    expect(alternativeDirections(scores, ["it-ai"])).toEqual([
      {directionSlug: "design-creative", percent: 55},
      {directionSlug: "medicine", percent: 20}
    ]);
  });

  it("never pads the list with directions that scored nothing", () => {
    expect(alternativeDirections(scores, ["it-ai", "design-creative", "medicine"])).toEqual([]);
  });

  it("respects the limit", () => {
    expect(alternativeDirections(scores, [], 1)).toEqual([{directionSlug: "it-ai", percent: 80}]);
  });

  it("returns nothing when the test has not been taken", () => {
    expect(alternativeDirections([], [])).toEqual([]);
  });
});
