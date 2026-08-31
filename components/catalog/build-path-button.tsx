"use client";

import {Route} from "lucide-react";
import {useTranslations} from "next-intl";
import {useTransition} from "react";
import {buttonClass} from "@/components/ui/button";
import {useRouter} from "@/i18n/navigation";
import {selectProfession} from "@/lib/user-state";

/** Remembers the profession and opens the career path built around it. */
export function BuildPathButton({slug}: {slug: string}) {
  const t = useTranslations("careerPath");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      aria-busy={isPending}
      className={buttonClass("primary")}
      disabled={isPending}
      onClick={() => {
        selectProfession(slug);
        startTransition(() => router.push(`/career-path?profession=${encodeURIComponent(slug)}`));
      }}
      type="button"
    >
      <Route aria-hidden size={18} />
      {t("build")}
    </button>
  );
}
