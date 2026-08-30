"use client";

import {useLocale, useTranslations} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";
import type {Locale} from "@/lib/locales";

const labels: Record<Locale, string> = {ru: "RU", kk: "ҚАЗ", en: "EN"};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("language");

  return (
    <div aria-label={t("label")} className="flex items-center rounded-full border border-border bg-surface p-1">
      {(Object.keys(labels) as Locale[]).map((nextLocale) => (
        <button
          aria-current={nextLocale === locale ? "true" : undefined}
          className={`min-h-9 rounded-full px-3 text-xs font-bold transition-colors duration-150 ${nextLocale === locale ? "bg-ink text-white" : "text-muted hover:bg-soft hover:text-ink"}`}
          key={nextLocale}
          onClick={() => router.replace(pathname, {locale: nextLocale})}
          type="button"
        >
          {labels[nextLocale]}
        </button>
      ))}
    </div>
  );
}
