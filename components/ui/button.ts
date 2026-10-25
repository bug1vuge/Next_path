/**
 * Shared control styling. Every interactive surface gets a visible hover,
 * active, focus, disabled and (where relevant) pending state from here, so the
 * states are defined once instead of being re-invented per page.
 */
export type ButtonTone = "primary" | "secondary" | "ghost" | "danger";

// The hover fill rises from the bottom (a `::before` layer), as on the HOLZ
// redesign; a trailing icon nudges forward; a press scales the button down.
const BASE =
  "relative isolate inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-full px-5 text-sm font-bold " +
  "transition-[color,background-color,border-color,scale] duration-300 ease-[cubic-bezier(.22,.9,.25,1)] active:scale-[.97] " +
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:translate-y-full before:rounded-[inherit] before:transition-transform before:duration-500 before:ease-[cubic-bezier(.22,.9,.25,1)] hover:before:translate-y-0 " +
  "[&>svg:last-child:not(:first-child)]:transition-transform [&>svg:last-child:not(:first-child)]:duration-500 hover:[&>svg:last-child:not(:first-child)]:translate-x-0.5 " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 disabled:before:hidden aria-busy:cursor-progress";

const TONES: Record<ButtonTone, string> = {
  primary: "bg-brand text-white shadow-[0_10px_24px_-12px_var(--color-brand)] before:bg-brand-strong",
  secondary: "border border-border bg-surface text-ink before:bg-ink hover:border-ink hover:text-white disabled:hover:border-border disabled:hover:text-ink",
  ghost: "text-muted before:bg-soft hover:text-ink",
  danger: "border border-border bg-surface text-danger before:bg-danger-soft"
};

export function buttonClass(tone: ButtonTone = "primary", extra = ""): string {
  return `${BASE} ${TONES[tone]} ${extra}`.trim();
}

export const inputClass =
  "min-h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-ink transition-colors duration-150 placeholder:text-muted hover:border-brand-soft focus:border-brand";

export const chipClass =
  "inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-xs font-semibold text-muted";
