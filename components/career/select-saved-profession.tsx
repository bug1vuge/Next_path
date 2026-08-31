"use client";

import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {Field} from "@/components/catalog/filter-panel";
import {buttonClass} from "@/components/ui/button";
import {EmptyState} from "@/components/ui/states";
import {Link, useRouter} from "@/i18n/navigation";
import {useUserState} from "@/lib/user-state";

/**
 * The career path is built for one profession. The chosen profession travels in
 * the URL so the page is shareable and server-rendered; when the visitor has
 * already picked one in this browser, that choice is applied automatically.
 */
export function SelectSavedProfession({options}: {options: {slug: string; name: string}[]}) {
  const t = useTranslations("careerPath");
  const router = useRouter();
  const state = useUserState();
  const [choice, setChoice] = useState("");
  const stored = state.selectedProfession;

  useEffect(() => {
    if (stored) router.replace(`/career-path?profession=${encodeURIComponent(stored)}`);
  }, [router, stored]);

  return (
    <div className="grid gap-6">
      <EmptyState
        action={
          <Link className={buttonClass("secondary")} href="/professions">
            {t("chooseProfession")}
          </Link>
        }
        text={stored ? t("chooseHint") : t("emptyText")}
        title={t("emptyTitle")}
      />

      <form
        className="rounded-3xl border border-border bg-surface p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (choice) router.push(`/career-path?profession=${encodeURIComponent(choice)}`);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label={t("chooseProfession")}>
            <select
              className="min-h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm transition-colors duration-150 hover:border-brand-soft focus:border-brand"
              onChange={(event) => setChoice(event.target.value)}
              value={choice}
            >
              <option value="">{t("chooseProfession")}</option>
              {options.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>
          <button className={buttonClass("primary")} disabled={!choice} type="submit">
            {t("build")}
          </button>
        </div>
      </form>
    </div>
  );
}
