import {describe, expect, it} from "vitest";
import en from "@/messages/en.json";
import kk from "@/messages/kk.json";
import ru from "@/messages/ru.json";

type Messages = Record<string, unknown>;

function flatten(value: Messages, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof entry === "object" && entry !== null ? flatten(entry as Messages, path) : [path];
  });
}

function placeholders(value: Messages, prefix = ""): Record<string, string[]> {
  return Object.entries(value).reduce<Record<string, string[]>>((accumulator, [key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof entry === "object" && entry !== null) return {...accumulator, ...placeholders(entry as Messages, path)};
    const found = [...String(entry).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    if (found.length > 0) accumulator[path] = found;
    return accumulator;
  }, {});
}

const catalogues: [string, Messages][] = [
  ["ru", ru as Messages],
  ["kk", kk as Messages],
  ["en", en as Messages]
];

describe("translation catalogues", () => {
  const reference = flatten(ru as Messages).sort();

  it.each(catalogues)("%s has exactly the same keys as the reference", (_locale, messages) => {
    expect(flatten(messages).sort()).toEqual(reference);
  });

  it.each(catalogues)("%s has no empty strings", (_locale, messages) => {
    const flat = flatten(messages);
    const values = flat.map((path) => path.split(".").reduce<unknown>((value, key) => (value as Messages)[key], messages));
    expect(values.filter((value) => typeof value !== "string" || value.trim() === "")).toEqual([]);
  });

  it.each(catalogues)("%s uses the same message placeholders", (_locale, messages) => {
    expect(placeholders(messages)).toEqual(placeholders(ru as Messages));
  });
});
