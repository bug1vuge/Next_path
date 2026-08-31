"use client";

import {SlidersHorizontal} from "lucide-react";
import {useTranslations} from "next-intl";
import {useRef, type ReactNode} from "react";
import {buttonClass, inputClass} from "@/components/ui/button";
import {Link} from "@/i18n/navigation";

/**
 * Filters live in the URL query string: the panel is a plain GET form, so a
 * filtered list is shareable, survives reload and works before hydration.
 * Selects submit as soon as they change; text fields submit on Enter or with
 * the explicit button.
 */
export function FilterPanel({
  children,
  resetHref,
  summary
}: {
  children: ReactNode;
  resetHref: string;
  summary: string;
}) {
  const t = useTranslations("common");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <details className="rounded-3xl border border-border bg-surface open:pb-2 sm:open:pb-0" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-5 py-4 font-bold hover:bg-soft">
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal aria-hidden size={18} />
          {t("filters")}
        </span>
        <span className="text-sm font-semibold text-muted">{summary}</span>
      </summary>
      <form
        className="grid gap-4 px-5 pt-1 pb-5 sm:grid-cols-2 lg:grid-cols-4"
        onChange={(event) => {
          if ((event.target as HTMLElement).tagName === "SELECT") formRef.current?.requestSubmit();
        }}
        ref={formRef}
      >
        {children}
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button className={buttonClass("primary")} type="submit">
            {t("apply")}
          </button>
          <Link className={buttonClass("ghost")} href={resetHref}>
            {t("reset")}
          </Link>
        </div>
      </form>
    </details>
  );
}

export function Field({label, children}: {label: string; children: ReactNode}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

export function Select({
  name,
  value,
  options,
  placeholder
}: {
  name: string;
  value: string;
  options: {value: string; label: string}[];
  placeholder: string;
}) {
  return (
    <select className={inputClass} defaultValue={value} name={name}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function TextField({name, value, placeholder}: {name: string; value: string; placeholder: string}) {
  return <input className={inputClass} defaultValue={value} name={name} placeholder={placeholder} type="search" />;
}

export function NumberField({name, value, placeholder}: {name: string; value: string; placeholder: string}) {
  return (
    <input className={inputClass} defaultValue={value} inputMode="numeric" min={0} name={name} placeholder={placeholder} type="number" />
  );
}
