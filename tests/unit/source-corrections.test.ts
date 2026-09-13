import {describe, expect, it} from "vitest";
import {correct, TEST_CORRECTIONS, type Correction} from "../../scripts/source-corrections";

const entries: Correction[] = [
  {lang: "ru", question: 9, from: "Замйешься хобии", to: "Займешься хобби"},
  {lang: "kk", question: 9, from: "Сіз, скорее...", to: "Сіз көбіне..."}
];

describe("correct", () => {
  it("replaces a reported error and records the entry as used", () => {
    const used = new Set<Correction>();
    expect(correct("Замйешься хобии", "ru", used, entries)).toBe("Займешься хобби");
    expect(used).toEqual(new Set([entries[0]]));
  });

  it("only touches the language the entry belongs to", () => {
    const used = new Set<Correction>();
    // "скорее" is correct Russian; it is an error only inside the Kazakh sentence.
    expect(correct("В свободный вечер ты скорее", "ru", used, entries)).toBe("В свободный вечер ты скорее");
    expect(correct("Бос кеште Сіз, скорее...", "kk", used, entries)).toBe("Бос кеште Сіз көбіне...");
    expect(used).toEqual(new Set([entries[1]]));
  });

  it("leaves text the team has already fixed alone, so the entry shows up as unused", () => {
    const used = new Set<Correction>();
    expect(correct("Займешься хобби", "ru", used, entries)).toBe("Займешься хобби");
    expect(used.size).toBe(0);
  });
});

describe("TEST_CORRECTIONS", () => {
  it("never maps a fragment onto itself and lists each fragment once per language", () => {
    const keys = TEST_CORRECTIONS.map((entry) => `${entry.lang}:${entry.from}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(TEST_CORRECTIONS.filter((entry) => entry.from === entry.to)).toEqual([]);
  });
});
