/**
 * Shared control styling. Every interactive surface gets a visible hover,
 * active, focus, disabled and (where relevant) pending state from here, so the
 * states are defined once instead of being re-invented per page.
 */
export type ButtonTone = "primary" | "secondary" | "ghost" | "danger";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress";

const TONES: Record<ButtonTone, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong active:bg-brand-strong disabled:hover:bg-brand",
  secondary: "border border-border bg-surface text-ink hover:bg-soft active:bg-soft disabled:hover:bg-surface",
  ghost: "text-muted hover:bg-soft hover:text-ink active:bg-soft",
  danger: "border border-border bg-surface text-danger hover:bg-danger-soft active:bg-danger-soft"
};

export function buttonClass(tone: ButtonTone = "primary", extra = ""): string {
  return `${BASE} ${TONES[tone]} ${extra}`.trim();
}

export const inputClass =
  "min-h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-ink transition-colors duration-150 placeholder:text-muted hover:border-brand-soft focus:border-brand";

export const chipClass =
  "inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-xs font-semibold text-muted";
