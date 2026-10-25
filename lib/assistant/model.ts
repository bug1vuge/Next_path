import type {ChatTurn} from "./input";

/**
 * The language model behind the assistant: Anthropic's Messages API, called
 * with `fetch` so no SDK is added to the project. The key never reaches the
 * browser — only this server module reads it.
 *
 *   ANTHROPIC_API_KEY   required; without it the assistant answers "unavailable"
 *   ASSISTANT_MODEL     optional; defaults to DEFAULT_MODEL
 *   ANTHROPIC_BASE_URL  optional; a proxy or gateway in front of the API
 */
export const DEFAULT_MODEL = "claude-haiku-5-5";

export function assistantConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export class ModelError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Streams the reply as plain UTF-8 text chunks. */
export async function streamReply({
  system,
  messages,
  signal
}: {
  system: string;
  messages: ChatTurn[];
  signal?: AbortSignal;
}): Promise<ReadableStream<Uint8Array>> {
  const baseUrl = (process.env.ANTHROPIC_BASE_URL?.trim() || "https://api.anthropic.com").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: process.env.ASSISTANT_MODEL?.trim() || DEFAULT_MODEL,
      max_tokens: 1024,
      temperature: 0.3,
      stream: true,
      // The system prompt (rules + catalogue index) is identical between
      // messages, so it is cached to make follow-up answers faster and cheaper.
      system: [{type: "text", text: system, cache_control: {type: "ephemeral"}}],
      messages
    })
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new ModelError(`Model request failed: ${response.status} ${detail.slice(0, 300)}`, response.status);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      // Server-sent events: read until at least one text delta can be emitted.
      for (;;) {
        const {done, value} = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, {stream: true});
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        let emitted = false;
        for (const event of events) {
          const data = event
            .split("\n")
            .filter((row) => row.startsWith("data:"))
            .map((row) => row.slice(5).trim())
            .join("");
          if (!data) continue;
          let parsed: {type?: string; delta?: {type?: string; text?: string}; error?: {message?: string}};
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta" && parsed.delta.text) {
            controller.enqueue(encoder.encode(parsed.delta.text));
            emitted = true;
          } else if (parsed.type === "error") {
            controller.error(new ModelError(parsed.error?.message ?? "Model stream error", 502));
            return;
          } else if (parsed.type === "message_stop") {
            controller.close();
            await reader.cancel().catch(() => undefined);
            return;
          }
        }
        if (emitted) return;
      }
    },
    async cancel() {
      await reader.cancel().catch(() => undefined);
    }
  });
}
