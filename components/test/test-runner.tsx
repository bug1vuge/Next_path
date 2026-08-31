"use client";

import {ArrowLeft, ArrowRight, Check, RotateCcw} from "lucide-react";
import {useTranslations} from "next-intl";
import {useMemo, useState, useTransition} from "react";
import {buttonClass} from "@/components/ui/button";
import {useRouter} from "@/i18n/navigation";
import {scoreAnswers, type Answer, type ScoringOption, type ScoringQuestion} from "@/lib/scoring";
import {clearTest, saveAnswers, saveResult, useUserState} from "@/lib/user-state";

export type TestOption = ScoringOption & {text: string};

export type TestQuestion = Omit<ScoringQuestion, "options"> & {
  order: number;
  block: string;
  text: string;
  options: TestOption[];
};

export function TestRunner({questions, directionSlugs}: {questions: TestQuestion[]; directionSlugs: string[]}) {
  const t = useTranslations("test");
  const router = useRouter();
  const state = useUserState();
  const [isPending, startTransition] = useTransition();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [started, setStarted] = useState(false);

  // The stored answers are adopted once, when the visitor chooses to resume.
  const storedCount = state.answers.length;
  const question = questions[Math.min(index, questions.length - 1)];
  const selected = answers.find((answer) => answer.questionId === question?.id)?.optionId ?? null;
  const answeredCount = answers.length;
  const isLast = index === questions.length - 1;

  const progress = useMemo(
    () => Math.round(((index + 1) / questions.length) * 100),
    [index, questions.length]
  );

  function choose(optionId: string) {
    setAnswers((current) => {
      const next = [...current.filter((answer) => answer.questionId !== question.id), {questionId: question.id, optionId}];
      saveAnswers(next);
      return next;
    });
  }

  function finish() {
    const scores = scoreAnswers(answers, questions, directionSlugs);
    saveResult({scores, answers, completedAt: Date.now()});
    startTransition(() => router.push("/test/results"));
  }

  function restart() {
    clearTest();
    setAnswers([]);
    setIndex(0);
    setStarted(true);
  }

  if (!started) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-10">
        <h2 className="text-2xl font-extrabold">{t("title")}</h2>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted">{t("intro", {count: questions.length})}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            className={buttonClass("primary")}
            onClick={() => {
              setAnswers([]);
              setIndex(0);
              setStarted(true);
            }}
            type="button"
          >
            {t("start")}
            <ArrowRight aria-hidden size={18} />
          </button>
          {storedCount > 0 && storedCount < questions.length ? (
            <button
              className={buttonClass("secondary")}
              onClick={() => {
                setAnswers(state.answers);
                setIndex(Math.min(storedCount, questions.length - 1));
                setStarted(true);
              }}
              type="button"
            >
              {t("resume", {number: Math.min(storedCount + 1, questions.length)})}
            </button>
          ) : null}
          {state.result ? (
            <button className={buttonClass("ghost")} onClick={() => router.push("/test/results")} type="button">
              {t("finish")}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted">{t("progress", {current: index + 1, total: questions.length})}</p>
        <p className="text-xs font-semibold text-muted">
          {t("blockLabel")}: {question.block} · {t("answered", {answered: answeredCount, total: questions.length})}
        </p>
      </div>

      <div
        aria-label={t("progress", {current: index + 1, total: questions.length})}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="mt-3 h-2 overflow-hidden rounded-full bg-soft"
        role="progressbar"
      >
        <div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{width: `${progress}%`}} />
      </div>

      <h2 className="mt-7 text-xl leading-8 font-extrabold whitespace-pre-line sm:text-2xl">{question.text}</h2>
      <p className="mt-2 text-sm text-muted">{t("chooseOption")}</p>

      <fieldset className="mt-5 grid gap-3">
        <legend className="sr-only">{question.text}</legend>
        {question.options.map((option) => {
          const isSelected = option.id === selected;
          return (
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm leading-6 transition-colors duration-150 ${
                isSelected ? "border-brand bg-brand-soft font-semibold" : "border-border bg-canvas hover:bg-soft"
              }`}
              key={option.id}
            >
              <input
                checked={isSelected}
                className="mt-1 size-4 accent-brand"
                name={question.id}
                onChange={() => choose(option.id)}
                type="radio"
                value={option.id}
              />
              <span className="whitespace-pre-line">{option.text}</span>
            </label>
          );
        })}
      </fieldset>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button
          className={buttonClass("secondary")}
          disabled={index === 0}
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          type="button"
        >
          <ArrowLeft aria-hidden size={18} />
          {t("back")}
        </button>

        {isLast ? (
          <button
            aria-busy={isPending}
            className={buttonClass("primary")}
            disabled={!selected || isPending}
            onClick={finish}
            type="button"
          >
            <Check aria-hidden size={18} />
            {isPending ? t("calculating") : t("finish")}
          </button>
        ) : (
          <button
            className={buttonClass("primary")}
            disabled={!selected}
            onClick={() => setIndex((current) => Math.min(questions.length - 1, current + 1))}
            type="button"
          >
            {t("next")}
            <ArrowRight aria-hidden size={18} />
          </button>
        )}

        <button className={buttonClass("ghost")} onClick={restart} type="button">
          <RotateCcw aria-hidden size={16} />
          {t("restart")}
        </button>
      </div>
    </div>
  );
}
