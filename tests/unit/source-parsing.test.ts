import {describe, expect, it} from "vitest";
import {
  inlineText,
  optionalText,
  parseDemand,
  parseSalaryAmount,
  parseSalaryLevel,
  parseTuition,
  sentenceCase
} from "../../scripts/source-parsing";

describe("optionalText", () => {
  it("treats a dash-only cell as blank", () => {
    expect(optionalText("—")).toBeNull();
    expect(optionalText(" - ")).toBeNull();
    expect(optionalText("")).toBeNull();
  });

  it("keeps real text, including text that contains a dash", () => {
    expect(optionalText("IELTS — 6.5")).toBe("IELTS — 6.5");
  });
});

describe("inlineText", () => {
  it("joins a sentence broken across lines inside a cell", () => {
    expect(inlineText("Разбор скрытых функций нового\n смартфона")).toBe("Разбор скрытых функций нового смартфона");
  });

  it("collapses doubled spaces without touching the words", () => {
    expect(inlineText("Поездка в  Токио или Сеул ")).toBe("Поездка в Токио или Сеул");
  });
});

describe("sentenceCase", () => {
  it("makes labels that differ only in casing identical", () => {
    expect(sentenceCase("Очень Высокая")).toBe("Очень высокая");
    expect(sentenceCase("Очень высокая")).toBe("Очень высокая");
    expect(sentenceCase("Very High")).toBe("Very high");
  });

  it("passes blanks through", () => {
    expect(sentenceCase(null)).toBeNull();
  });
});

describe("parseDemand", () => {
  it("ranks a level whatever its casing, and normalises the label", () => {
    expect(parseDemand("Очень Высокая")).toEqual({demand: "HIGH", label: "Очень высокая", rank: 3});
    expect(parseDemand("Высокая")).toEqual({demand: "HIGH", label: "Высокая", rank: 2});
    expect(parseDemand("Средняя")).toEqual({demand: "MEDIUM", label: "Средняя", rank: 1});
  });
});

describe("salary", () => {
  it("reads a figure the source states", () => {
    expect(parseSalaryAmount("800 000 ₸")).toBe(800000);
    expect(parseSalaryAmount("1 000 000 ₸")).toBe(1000000);
  });

  it("never derives a figure from words", () => {
    expect(parseSalaryAmount("сильно зависит от бизнеса")).toBeNull();
    expect(parseSalaryLevel("сильно зависит от бизнеса")).toEqual({label: "сильно зависит от бизнеса", rank: null});
  });
});

describe("parseTuition", () => {
  it("takes the currency from a translation when the Russian cell omits it", () => {
    expect(parseTuition("700000-1770000", ["700,000-1,770,000 KZT", "700 000-1 770 000 тг"])).toEqual({
      min: 700000,
      max: 1770000,
      currency: "KZT",
      note: "700000-1770000"
    });
  });

  it("leaves the amount unknown when no version of the cell names a currency", () => {
    expect(parseTuition("700000-1770000")).toEqual({min: null, max: null, currency: null, note: "700000-1770000"});
  });

  it("recognises Swiss francs", () => {
    expect(parseTuition("CHF 1 460")).toEqual({min: 1460, max: 1460, currency: "CHF", note: "CHF 1 460"});
  });

  it("prefers the currency the Russian cell itself states", () => {
    expect(parseTuition("$47000-$79000", ["47 000-79 000 тг"]).currency).toBe("USD");
  });
});
