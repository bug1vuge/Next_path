import {beforeEach, describe, expect, it} from "vitest";
import {
  clearTest,
  readState,
  resetCacheForTests,
  saveAnswers,
  saveResult,
  selectProfession,
  toggleAdmissionStep,
  toggleDevelopmentStep,
  updateState
} from "@/lib/user-state";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

function installStorage(storage: Storage | null) {
  const value = storage === null ? undefined : {localStorage: storage};
  Object.defineProperty(globalThis, "window", {value, configurable: true, writable: true});
  resetCacheForTests();
}

describe("user-state", () => {
  beforeEach(() => {
    installStorage(new MemoryStorage());
  });

  it("starts empty", () => {
    expect(readState()).toEqual({
      favourites: [],
      answers: [],
      result: null,
      selectedProfession: null,
      admissionPlanDone: [],
      developmentPlanDone: []
    });
  });

  it("persists favourites and reads them back", () => {
    updateState((state) => ({
      ...state,
      favourites: [{kind: "university", slug: "nu", addedAt: 1}]
    }));

    expect(readState().favourites).toEqual([{kind: "university", slug: "nu", addedAt: 1}]);
  });

  it("stores the test result together with the answers that produced it", () => {
    saveResult({
      scores: [{directionSlug: "it-ai", percent: 87}],
      answers: [{questionId: "q1", optionId: "q1a"}],
      completedAt: 1_700_000_000_000
    });

    const state = readState();
    expect(state.result?.scores[0]).toEqual({directionSlug: "it-ai", percent: 87});
    expect(state.answers).toEqual([{questionId: "q1", optionId: "q1a"}]);
  });

  it("clears the test without touching favourites", () => {
    updateState((state) => ({...state, favourites: [{kind: "profession", slug: "surgeon", addedAt: 2}]}));
    saveAnswers([{questionId: "q1", optionId: "q1a"}]);

    clearTest();

    expect(readState().answers).toEqual([]);
    expect(readState().result).toBeNull();
    expect(readState().favourites).toHaveLength(1);
  });

  it("toggles admission-plan steps", () => {
    toggleAdmissionStep("documents");
    expect(readState().admissionPlanDone).toEqual(["documents"]);

    toggleAdmissionStep("documents");
    expect(readState().admissionPlanDone).toEqual([]);
  });

  it("toggles development-plan steps independently of the admission plan", () => {
    toggleAdmissionStep("documents");
    toggleDevelopmentStep("portfolio");
    expect(readState().developmentPlanDone).toEqual(["portfolio"]);
    expect(readState().admissionPlanDone).toEqual(["documents"]);

    toggleDevelopmentStep("portfolio");
    expect(readState().developmentPlanDone).toEqual([]);
    expect(readState().admissionPlanDone).toEqual(["documents"]);
  });

  it("reads state written before the development plan existed", () => {
    const storage = new MemoryStorage();
    storage.setItem("next-path:v1", JSON.stringify({favourites: [], admissionPlanDone: ["test"]}));
    installStorage(storage);

    expect(readState().developmentPlanDone).toEqual([]);
    expect(readState().admissionPlanDone).toEqual(["test"]);
  });

  it("remembers the selected profession", () => {
    selectProfession("software-engineer");
    expect(readState().selectedProfession).toBe("software-engineer");

    selectProfession(null);
    expect(readState().selectedProfession).toBeNull();
  });

  it("ignores stored data that does not match the expected shape", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "next-path:v1",
      JSON.stringify({favourites: [{kind: "planet", slug: 4}, {kind: "direction", slug: "it-ai", addedAt: 3}], answers: "nope"})
    );
    installStorage(storage);

    const state = readState();
    expect(state.favourites).toEqual([{kind: "direction", slug: "it-ai", addedAt: 3}]);
    expect(state.answers).toEqual([]);
  });

  it("survives unreadable storage", () => {
    installStorage(null);
    expect(readState().favourites).toEqual([]);
    expect(() => selectProfession("surgeon")).not.toThrow();
  });
});
