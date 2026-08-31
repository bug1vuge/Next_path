/**
 * The only place that touches `localStorage`.
 *
 * Anonymous state — favourites, the answers in progress and the last test
 * result — lives in the browser. Components read it through the hooks below, so
 * swapping the store for a server-side one later means changing this file only.
 *
 * Every read is defensive: storage can be unavailable (private mode, disabled
 * site data) or hold data written by an older version. On any problem the
 * module behaves as if nothing was stored.
 */
"use client";

import {useCallback, useSyncExternalStore} from "react";
import type {Answer, DirectionScore} from "./scoring";

const STORAGE_KEY = "next-path:v1";

export type FavouriteKind = "profession" | "university" | "direction";

export type Favourite = {
  kind: FavouriteKind;
  slug: string;
  addedAt: number;
};

export type TestResult = {
  scores: DirectionScore[];
  answers: Answer[];
  completedAt: number;
};

export type UserState = {
  favourites: Favourite[];
  answers: Answer[];
  result: TestResult | null;
  selectedProfession: string | null;
  admissionPlanDone: string[];
};

const EMPTY: UserState = {
  favourites: [],
  answers: [],
  result: null,
  selectedProfession: null,
  admissionPlanDone: []
};

const listeners = new Set<() => void>();
let cache: UserState = EMPTY;
let cacheRaw: string | null = null;

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isFavourite(value: unknown): value is Favourite {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Favourite>;
  return (
    (candidate.kind === "profession" || candidate.kind === "university" || candidate.kind === "direction") &&
    typeof candidate.slug === "string" &&
    typeof candidate.addedAt === "number"
  );
}

function isAnswer(value: unknown): value is Answer {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Answer>;
  return typeof candidate.questionId === "string" && typeof candidate.optionId === "string";
}

function isResult(value: unknown): value is TestResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<TestResult>;
  return (
    Array.isArray(candidate.scores) &&
    candidate.scores.every(
      (score) =>
        typeof score === "object" &&
        score !== null &&
        typeof (score as DirectionScore).directionSlug === "string" &&
        typeof (score as DirectionScore).percent === "number"
    ) &&
    typeof candidate.completedAt === "number"
  );
}

function parse(raw: string | null): UserState {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY;
    const value = parsed as Partial<UserState>;
    return {
      favourites: Array.isArray(value.favourites) ? value.favourites.filter(isFavourite) : [],
      answers: Array.isArray(value.answers) ? value.answers.filter(isAnswer) : [],
      result: isResult(value.result) ? {...value.result, answers: (value.result.answers ?? []).filter(isAnswer)} : null,
      selectedProfession: typeof value.selectedProfession === "string" ? value.selectedProfession : null,
      admissionPlanDone: Array.isArray(value.admissionPlanDone)
        ? value.admissionPlanDone.filter((step): step is string => typeof step === "string")
        : []
    };
  } catch {
    return EMPTY;
  }
}

export function readState(): UserState {
  const raw = storage()?.getItem(STORAGE_KEY) ?? null;
  // useSyncExternalStore compares snapshots by identity, so reuse the object
  // while the serialised value has not changed.
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = parse(raw);
  }
  return cache;
}

function write(next: UserState) {
  const store = storage();
  if (store) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage full or blocked: keep the in-memory value for this session.
    }
  }
  cacheRaw = JSON.stringify(next);
  cache = next;
  for (const listener of listeners) listener();
}

export function updateState(update: (state: UserState) => UserState) {
  write(update(readState()));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Server render and first client render agree on the empty state. */
function serverSnapshot(): UserState {
  return EMPTY;
}

export function useUserState(): UserState {
  return useSyncExternalStore(subscribe, readState, serverSnapshot);
}

export function useFavourite(kind: FavouriteKind, slug: string) {
  const state = useUserState();
  const isSaved = state.favourites.some((favourite) => favourite.kind === kind && favourite.slug === slug);

  const toggle = useCallback(() => {
    updateState((current) => {
      const exists = current.favourites.some((favourite) => favourite.kind === kind && favourite.slug === slug);
      return {
        ...current,
        favourites: exists
          ? current.favourites.filter((favourite) => !(favourite.kind === kind && favourite.slug === slug))
          : [...current.favourites, {kind, slug, addedAt: Date.now()}]
      };
    });
  }, [kind, slug]);

  return {isSaved, toggle};
}

export function saveAnswers(answers: Answer[]) {
  updateState((current) => ({...current, answers}));
}

export function saveResult(result: TestResult) {
  updateState((current) => ({...current, answers: result.answers, result}));
}

export function clearTest() {
  updateState((current) => ({...current, answers: [], result: null}));
}

export function selectProfession(slug: string | null) {
  updateState((current) => ({...current, selectedProfession: slug}));
}

export function toggleAdmissionStep(step: string) {
  updateState((current) => ({
    ...current,
    admissionPlanDone: current.admissionPlanDone.includes(step)
      ? current.admissionPlanDone.filter((value) => value !== step)
      : [...current.admissionPlanDone, step]
  }));
}

/** Exported for tests: resets the module cache so a fresh storage is read. */
export function resetCacheForTests() {
  cacheRaw = null;
  cache = EMPTY;
}
