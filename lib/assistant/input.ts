import {locales, type Locale} from "@/lib/locales";
import {EMPTY_PROFILE, type VisitorProfile} from "./knowledge";

/**
 * Validation of what the chat widget posts to `/api/assistant`. Shared by the
 * route and the widget (for the length limit), and unit-tested. The server
 * re-checks everything regardless of what the browser sends.
 */
export const ASSISTANT_LIMITS = {
  /** Characters in one visitor message. */
  questionMax: 800,
  /** Characters of one earlier assistant reply that is sent back as history. */
  replyMax: 4000,
  /** How many earlier messages travel with a question. */
  historyMax: 12
} as const;

export type ChatTurn = {role: "user" | "assistant"; content: string};

export type AssistantRequest = {
  locale: Locale;
  pathname: string;
  messages: ChatTurn[];
  profile: VisitorProfile;
};

const SLUG = /^[\p{L}\p{N}_-]{1,120}$/u;

function slugs(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && SLUG.test(item)).slice(0, max);
}

function readProfile(value: unknown): VisitorProfile {
  if (typeof value !== "object" || value === null) return EMPTY_PROFILE;
  const raw = value as Record<string, unknown>;
  const topDirections = Array.isArray(raw.topDirections)
    ? raw.topDirections
        .filter(
          (item): item is {slug: string; percent: number} =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as {slug?: unknown}).slug === "string" &&
            SLUG.test((item as {slug: string}).slug) &&
            typeof (item as {percent?: unknown}).percent === "number" &&
            Number.isFinite((item as {percent: number}).percent)
        )
        .slice(0, 5)
        .map((item) => ({slug: item.slug, percent: Math.max(0, Math.min(100, item.percent))}))
    : [];
  return {
    topDirections,
    favouriteDirections: slugs(raw.favouriteDirections),
    favouriteProfessions: slugs(raw.favouriteProfessions),
    favouriteUniversities: slugs(raw.favouriteUniversities),
    selectedProfession: typeof raw.selectedProfession === "string" && SLUG.test(raw.selectedProfession) ? raw.selectedProfession : null
  };
}

export type AssistantValidation = {ok: true; request: AssistantRequest} | {ok: false; error: "invalid" | "tooLong"};

export function validateAssistantRequest(body: unknown): AssistantValidation {
  if (typeof body !== "object" || body === null) return {ok: false, error: "invalid"};
  const raw = body as Record<string, unknown>;

  const locale = locales.includes(raw.locale as Locale) ? (raw.locale as Locale) : "ru";
  const pathname = typeof raw.pathname === "string" ? raw.pathname.slice(0, 200) : "/";

  if (!Array.isArray(raw.messages) || raw.messages.length === 0) return {ok: false, error: "invalid"};
  const turns: ChatTurn[] = [];
  for (const item of raw.messages) {
    if (typeof item !== "object" || item === null) return {ok: false, error: "invalid"};
    const {role, content} = item as {role?: unknown; content?: unknown};
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return {ok: false, error: "invalid"};
    turns.push({role, content: content.trim()});
  }

  const last = turns[turns.length - 1];
  if (last.role !== "user" || last.content.length === 0) return {ok: false, error: "invalid"};
  if (last.content.length > ASSISTANT_LIMITS.questionMax) return {ok: false, error: "tooLong"};

  // Keep the recent history only, starting with a visitor message, with no
  // empty turns and the roles strictly alternating (the model API requires it).
  const recent = turns
    .slice(-ASSISTANT_LIMITS.historyMax)
    .filter((turn) => turn.content.length > 0)
    .map((turn) => ({
      role: turn.role,
      content: turn.content.slice(0, turn.role === "user" ? ASSISTANT_LIMITS.questionMax : ASSISTANT_LIMITS.replyMax)
    }));
  const alternating = recent.reduce<ChatTurn[]>((result, turn) => {
    const previous = result[result.length - 1];
    if (previous && previous.role === turn.role) {
      result[result.length - 1] = {role: turn.role, content: `${previous.content}\n\n${turn.content}`};
    } else {
      result.push(turn);
    }
    return result;
  }, []);
  while (alternating.length > 0 && alternating[0].role !== "user") alternating.shift();
  if (alternating.length === 0) return {ok: false, error: "invalid"};

  return {ok: true, request: {locale, pathname, messages: alternating, profile: readProfile(raw.profile)}};
}

/**
 * The text used to find catalogue records: the latest question, the question
 * before it and the start of the last reply, so a follow-up such as "а сколько
 * там учиться?" still finds the university the conversation is about.
 */
export function retrievalQuery(messages: ChatTurn[]): string {
  const questions = messages.filter((turn) => turn.role === "user").slice(-2).map((turn) => turn.content);
  const lastReply = [...messages].reverse().find((turn) => turn.role === "assistant")?.content.slice(0, 600) ?? "";
  return [...questions, lastReply].filter(Boolean).join("\n");
}
