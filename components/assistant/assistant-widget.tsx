"use client";

import {ArrowLeft, ArrowUp, BriefcaseBusiness, Compass, GraduationCap, MessageCircle, RotateCcw, Square, X} from "lucide-react";
import Image from "next/image";
import {usePathname} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent} from "react";
import {ASSISTANT_LIMITS} from "@/lib/assistant/input";
import {useUserState} from "@/lib/user-state";
import {ChatText} from "./chat-text";

/**
 * The site assistant: a button pinned to the bottom-right corner of every page
 * that opens a chat panel. Questions go to `/api/assistant`, which answers from
 * the platform's own catalogue; the reply streams in as it is written.
 *
 * The conversation is kept in `sessionStorage`, so it survives moving between
 * pages and switching language, and is forgotten when the tab is closed.
 */

type ErrorKey = "unavailable" | "tooMany" | "tooLong" | "failed" | "offline";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "done" | "streaming" | "stopped" | "error";
  error?: ErrorKey;
};

type TopicKey = "platform" | "career" | "education";

const TOPICS: {key: TopicKey; icon: typeof Compass; tone: string}[] = [
  {key: "platform", icon: Compass, tone: "bg-mint"},
  {key: "career", icon: BriefcaseBusiness, tone: "bg-peach"},
  {key: "education", icon: GraduationCap, tone: "bg-lilac"}
];

const QUESTION_KEYS = ["q1", "q2", "q3"] as const;
const STORAGE_KEY = "next-path:assistant:v1";
const ERROR_KEYS: ErrorKey[] = ["unavailable", "tooMany", "tooLong", "failed", "offline"];

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadConversation(): Message[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Message =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        (item.status === "done" || item.status === "stopped")
    );
  } catch {
    return [];
  }
}

function saveConversation(messages: Message[]) {
  try {
    const finished = messages.filter((message) => message.status === "done" || message.status === "stopped");
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(finished.slice(-40)));
  } catch {
    // Storage unavailable (private mode, blocked site data): the chat still works for this page.
  }
}

export function AssistantWidget() {
  const t = useTranslations("assistant");
  const locale = useLocale();
  const pathname = usePathname();
  const user = useUserState();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState<TopicKey | null>(null);
  const [restored, setRestored] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const titleId = useId();

  const pending = messages.some((message) => message.status === "streaming");

  // What the assistant may know about the visitor: test percentages and saved slugs, nothing personal.
  const profile = useMemo(
    () => ({
      topDirections: [...(user.result?.scores ?? [])]
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 3)
        .map((score) => ({slug: score.directionSlug, percent: score.percent})),
      favouriteDirections: user.favourites.filter((item) => item.kind === "direction").map((item) => item.slug),
      favouriteProfessions: user.favourites.filter((item) => item.kind === "profession").map((item) => item.slug),
      favouriteUniversities: user.favourites.filter((item) => item.kind === "university").map((item) => item.slug),
      selectedProfession: user.selectedProfession
    }),
    [user]
  );

  useEffect(() => {
    setMessages(loadConversation());
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored && !pending) saveConversation(messages);
  }, [messages, pending, restored]);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  // Focus the question field on open; Escape closes; on phones the page behind the sheet does not scroll.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus({preventScroll: true}));
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const phone = window.matchMedia("(max-width: 639px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (phone) document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      if (phone) document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  // Follow the reply as it streams, unless the visitor has scrolled up to read.
  useEffect(() => {
    const log = logRef.current;
    if (open && log && stickToBottom.current) log.scrollTop = log.scrollHeight;
  }, [messages, open, topic]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateMessage = useCallback((id: string, change: (message: Message) => Partial<Message>) => {
    setMessages((current) => current.map((message) => (message.id === id ? {...message, ...change(message)} : message)));
  }, []);

  const ask = useCallback(
    async (question: string, history: Message[]) => {
      const text = question.trim();
      if (!text || pending) return;

      const userMessage: Message = {id: newId(), role: "user", content: text, status: "done"};
      const reply: Message = {id: newId(), role: "assistant", content: "", status: "streaming"};
      const conversation = [...history, userMessage];
      setMessages([...conversation, reply]);
      setInput("");
      setTopic(null);
      stickToBottom.current = true;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: {"content-type": "application/json"},
          signal: controller.signal,
          body: JSON.stringify({
            locale,
            pathname,
            profile,
            messages: conversation
              .filter((message) => message.status === "done" || message.status === "stopped")
              .filter((message) => message.content.trim().length > 0)
              .map((message) => ({role: message.role, content: message.content}))
          })
        });

        if (!response.ok || !response.body) {
          const payload = (await response.json().catch(() => null)) as {error?: string} | null;
          const key = ERROR_KEYS.includes(payload?.error as ErrorKey) ? (payload!.error as ErrorKey) : "failed";
          updateMessage(reply.id, () => ({status: "error", error: key}));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const {done, value} = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, {stream: true});
          if (chunk) updateMessage(reply.id, (message) => ({content: message.content + chunk}));
        }
        updateMessage(reply.id, (message) =>
          message.content.trim() ? {status: "done"} : {status: "error", error: "failed"}
        );
      } catch (error) {
        if (controller.signal.aborted) {
          updateMessage(reply.id, () => ({status: "stopped"}));
        } else {
          const offline = typeof navigator !== "undefined" && !navigator.onLine;
          updateMessage(reply.id, () => ({status: "error", error: offline ? "offline" : "failed"}));
          console.error("Assistant request failed", error);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [locale, pathname, pending, profile, updateMessage]
  );

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (input.trim().length > ASSISTANT_LIMITS.questionMax) return;
    void ask(input, messages);
  };

  const onInputKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  /** Re-asks the question an error answered, dropping the failed pair. */
  const retry = (failedId: string) => {
    const index = messages.findIndex((message) => message.id === failedId);
    const question = messages[index - 1];
    if (index < 1 || question?.role !== "user") return;
    void ask(question.content, messages.slice(0, index - 1));
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setTopic(null);
    setInput("");
    inputRef.current?.focus();
  };

  /** On phones the chat covers the page, so following a link closes it. */
  const onInternalLink = () => {
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
  };

  const remaining = ASSISTANT_LIMITS.questionMax - input.length;
  const activeTopic = TOPICS.find((item) => item.key === topic);

  return (
    <>
      {open ? (
        <section
          aria-labelledby={titleId}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl shadow-ink/20 sm:inset-x-auto sm:right-5 sm:bottom-24 sm:h-[min(40rem,calc(100dvh-8rem))] sm:w-[25rem] sm:rounded-3xl"
          role="dialog"
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft">
              <Image alt="" className="size-7" height={28} src="/logo-mark.png" unoptimized width={28} />
              <span aria-hidden className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-surface bg-success" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-extrabold" id={titleId}>
                {t("title")}
              </h2>
              <p className="truncate text-xs text-muted">{t("subtitle")}</p>
            </div>
            {messages.length > 0 ? (
              <button
                aria-label={t("reset")}
                className="grid size-10 place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-soft hover:text-ink"
                onClick={reset}
                title={t("reset")}
                type="button"
              >
                <RotateCcw aria-hidden size={18} />
              </button>
            ) : null}
            <button
              aria-label={t("close")}
              className="grid size-10 place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-soft hover:text-ink"
              onClick={close}
              title={t("close")}
              type="button"
            >
              <X aria-hidden size={20} />
            </button>
          </header>

          <div
            aria-busy={pending}
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 text-sm leading-6"
            onScroll={(event) => {
              const element = event.currentTarget;
              stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
            }}
            ref={logRef}
            role="log"
          >
            <AssistantBubble label={t("assistant")}>
              <p>{t("greeting")}</p>
            </AssistantBubble>

            {messages.length === 0 ? (
              <div className="space-y-2 pt-1">
                {activeTopic ? (
                  <>
                    <button
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-muted transition-colors duration-150 hover:bg-soft hover:text-ink"
                      onClick={() => setTopic(null)}
                      type="button"
                    >
                      <ArrowLeft aria-hidden size={14} />
                      {t("backToTopics")}
                    </button>
                    <p className="px-1 font-extrabold">{t(`topics.${activeTopic.key}.title`)}</p>
                    <ul className="space-y-2">
                      {QUESTION_KEYS.map((key) => (
                        <li key={key}>
                          <button
                            className={`w-full rounded-2xl ${activeTopic.tone} px-4 py-3 text-left font-semibold transition-transform duration-150 hover:-translate-y-0.5`}
                            onClick={() => void ask(t(`topics.${activeTopic.key}.${key}`), messages)}
                            type="button"
                          >
                            {t(`topics.${activeTopic.key}.${key}`)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="px-1 text-xs font-bold text-muted">{t("chooseTopic")}</p>
                    <ul className="space-y-2">
                      {TOPICS.map(({key, icon: Icon, tone}) => (
                        <li key={key}>
                          <button
                            className={`flex w-full items-center gap-3 rounded-2xl ${tone} p-3 text-left transition-transform duration-150 hover:-translate-y-0.5`}
                            onClick={() => setTopic(key)}
                            type="button"
                          >
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-brand">
                              <Icon aria-hidden size={20} />
                            </span>
                            <span className="min-w-0">
                              <span className="block font-extrabold">{t(`topics.${key}.title`)}</span>
                              <span className="block text-xs leading-5 text-muted">{t(`topics.${key}.description`)}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : null}

            {messages.map((message) =>
              message.role === "user" ? (
                <div className="flex justify-end" key={message.id}>
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 whitespace-pre-wrap text-white">
                    <span className="sr-only">{t("you")}: </span>
                    {message.content}
                  </p>
                </div>
              ) : (
                <AssistantBubble key={message.id} label={t("assistant")} tone={message.status === "error" ? "error" : "default"}>
                  {message.status === "error" ? (
                    <div className="space-y-2">
                      <p>{t(`errors.${message.error ?? "failed"}`)}</p>
                      {message.error !== "unavailable" && message.error !== "tooLong" ? (
                        <button
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-ink transition-colors duration-150 hover:bg-soft"
                          onClick={() => retry(message.id)}
                          type="button"
                        >
                          <RotateCcw aria-hidden size={13} />
                          {t("retry")}
                        </button>
                      ) : null}
                    </div>
                  ) : message.content ? (
                    <>
                      <ChatText onInternalLink={onInternalLink} text={message.content} />
                      {message.status === "stopped" ? <p className="mt-2 text-xs text-muted">{t("stopped")}</p> : null}
                    </>
                  ) : message.status === "stopped" ? (
                    <p className="text-xs text-muted">{t("stopped")}</p>
                  ) : (
                    <span className="flex items-center gap-1 py-1.5" role="status">
                      <span className="sr-only">{t("thinking")}</span>
                      <span aria-hidden className="size-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                      <span aria-hidden className="size-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                      <span aria-hidden className="size-2 animate-bounce rounded-full bg-muted" />
                    </span>
                  )}
                </AssistantBubble>
              )
            )}
          </div>

          <form className="border-t border-border px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" onSubmit={submit}>
            <div className="flex items-end gap-2 rounded-3xl border border-border bg-canvas p-1.5 pl-4 transition-[border-color,box-shadow] duration-150 focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)]">
              <label className="sr-only" htmlFor={`${titleId}-input`}>
                {t("inputLabel")}
              </label>
              <textarea
                className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 text-ink [field-sizing:content] placeholder:text-muted focus:outline-none"
                id={`${titleId}-input`}
                maxLength={ASSISTANT_LIMITS.questionMax + 200}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onInputKey}
                placeholder={t("placeholder")}
                ref={inputRef}
                rows={1}
                // The global :focus-visible outline would draw a square inside the
                // rounded field; the field's wrapper shows focus instead.
                style={{outline: "none"}}
                value={input}
              />
              {pending ? (
                <button
                  aria-label={t("stop")}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white transition-colors duration-150 hover:bg-ink/80"
                  onClick={() => abortRef.current?.abort()}
                  title={t("stop")}
                  type="button"
                >
                  <Square aria-hidden fill="currentColor" size={12} />
                </button>
              ) : (
                <button
                  aria-label={t("send")}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors duration-150 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand"
                  disabled={input.trim().length === 0 || remaining < 0}
                  title={t("send")}
                  type="submit"
                >
                  <ArrowUp aria-hidden size={18} />
                </button>
              )}
            </div>
            {remaining < 100 ? (
              <p className={`mt-1.5 px-2 text-xs ${remaining < 0 ? "font-bold text-danger" : "text-muted"}`}>
                {t("charsLeft", {count: remaining})}
              </p>
            ) : null}
            <p className="mt-2 px-2 text-center text-[11px] leading-4 text-muted">{t("disclaimer")}</p>
          </form>
        </section>
      ) : null}

      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? t("close") : t("open")}
        className={`fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 size-14 place-items-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition-[background-color,transform] duration-150 hover:scale-105 hover:bg-brand-strong active:scale-95 ${open ? "hidden sm:grid" : "grid"}`}
        onClick={() => (open ? close() : setOpen(true))}
        ref={launcherRef}
        title={open ? t("close") : t("open")}
        type="button"
      >
        {open ? <X aria-hidden size={24} /> : <MessageCircle aria-hidden size={26} />}
      </button>
    </>
  );
}

function AssistantBubble({
  children,
  label,
  tone = "default"
}: {
  children: React.ReactNode;
  label: string;
  tone?: "default" | "error";
}) {
  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[90%] rounded-2xl rounded-bl-md px-4 py-2.5 ${tone === "error" ? "bg-danger-soft text-danger" : "bg-soft text-ink"}`}
      >
        <span className="sr-only">{label}: </span>
        {children}
      </div>
    </div>
  );
}
