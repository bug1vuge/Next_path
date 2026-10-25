import {headers} from "next/headers";
import {NextResponse} from "next/server";
import {getKnowledgeBase} from "@/lib/assistant/catalogue";
import {validateAssistantRequest, retrievalQuery} from "@/lib/assistant/input";
import {buildReference, catalogueIndex, type KnowledgeBase} from "@/lib/assistant/knowledge";
import {localReply, streamText} from "@/lib/assistant/local";
import {assistantConfigured, ModelError, streamReply} from "@/lib/assistant/model";
import {buildSystemPrompt, wrapQuestion} from "@/lib/assistant/prompt";
import {withinRateLimit} from "@/lib/review-input";

/**
 * POST /api/assistant — one chat turn of the site assistant.
 *
 * Body: {locale, pathname, messages: [{role, content}], profile}. The reply is
 * streamed back as plain text. Errors answer with JSON `{error}` whose value is
 * a key the widget translates: `unavailable`, `tooMany`, `tooLong`, `invalid`,
 * `failed`.
 *
 * With `ANTHROPIC_API_KEY` set the reply comes from the language model;
 * without it, from the free rule-based engine in `lib/assistant/local.ts`,
 * which answers from the same catalogue and site guide.
 */
export const dynamic = "force-dynamic";

// Per-process memory, like the reviews limit: enough for a single Railway instance.
const requests = new Map<string, number[]>();
const RATE = {limit: 20, windowMs: 10 * 60 * 1000};

const EMPTY_BASE: KnowledgeBase = {directions: [], professions: [], universities: []};

function failure(error: string, status: number) {
  return NextResponse.json({error}, {status});
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("invalid", 400);
  }
  const validation = validateAssistantRequest(body);
  if (!validation.ok) return failure(validation.error, 400);
  const {locale, pathname, messages, profile} = validation.request;

  const requestHeaders = await headers();
  const sender = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "local";
  if (!withinRateLimit(requests, sender, Date.now(), RATE)) return failure("tooMany", 429);

  // Without the catalogue the assistant can still explain the site itself; the
  // empty index tells it there is no catalogue data to quote.
  let base = EMPTY_BASE;
  try {
    base = await getKnowledgeBase();
  } catch (error) {
    console.error("Assistant: failed to load the catalogue", error);
  }

  const textHeaders = {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-accel-buffering": "no"
  };

  if (!assistantConfigured()) {
    const reply = localReply({base, locale, messages, pathname, profile});
    return new Response(streamText(reply, request.signal), {headers: {...textHeaders, "x-assistant-mode": "local"}});
  }

  const question = messages[messages.length - 1].content;
  const reference = buildReference({base, locale, question: retrievalQuery(messages), pathname, profile});
  const conversation = [...messages.slice(0, -1), {role: "user" as const, content: wrapQuestion(question, reference)}];

  try {
    const stream = await streamReply({
      system: buildSystemPrompt(locale, catalogueIndex(base, locale)),
      messages: conversation,
      signal: request.signal
    });
    return new Response(stream, {headers: textHeaders});
  } catch (error) {
    if (request.signal.aborted) return new Response(null, {status: 499});
    console.error("Assistant: model request failed", error);
    if (error instanceof ModelError && error.status === 429) return failure("tooMany", 429);
    return failure("failed", 502);
  }
}
