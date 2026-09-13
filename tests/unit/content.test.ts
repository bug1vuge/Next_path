import {describe, expect, it} from "vitest";
import {localizedPlace, localizedValue, localizedValues} from "@/lib/content";

const university = {
  country: "Казахстан",
  country_kk: "Қазақстан",
  country_en: "Kazakhstan",
  city: "Алматы",
  city_kk: "Алматы",
  city_en: "",
  ratingLabel: "топ-3" as string | null,
  ratingLabel_kk: null as string | null,
  ratingLabel_en: "Top-3" as string | null
};

describe("localizedValue", () => {
  it("returns the translation for the reader's language", () => {
    expect(localizedValue(university, "country", "kk")).toBe("Қазақстан");
    expect(localizedValue(university, "country", "en")).toBe("Kazakhstan");
  });

  it("uses the Russian source value in Russian", () => {
    expect(localizedValue(university, "country", "ru")).toBe("Казахстан");
  });

  it("falls back to the Russian value when a translation is blank or missing", () => {
    expect(localizedValue(university, "city", "en")).toBe("Алматы");
    expect(localizedValue(university, "ratingLabel", "kk")).toBe("топ-3");
    expect(localizedValue(university, "ratingLabel", "en")).toBe("Top-3");
  });

  it("keeps an absent value absent", () => {
    expect(localizedValue({exams: null, exams_kk: null, exams_en: null}, "exams", "en")).toBeNull();
  });
});

describe("localizedValues", () => {
  const profession = {skills: ["Логика"], skills_kk: ["Логика", "Талдау"], skills_en: [] as string[]};

  it("returns the translated list, or the Russian list when the translation is empty", () => {
    expect(localizedValues(profession, "skills", "kk")).toEqual(["Логика", "Талдау"]);
    expect(localizedValues(profession, "skills", "en")).toEqual(["Логика"]);
  });
});

describe("localizedPlace", () => {
  it("joins country and city in the reader's language", () => {
    expect(localizedPlace(university, "kk")).toBe("Қазақстан, Алматы");
  });

  it("shows only the country when the source gives no city", () => {
    expect(localizedPlace({...university, city: "", city_kk: "", city_en: ""}, "en")).toBe("Kazakhstan");
  });
});
