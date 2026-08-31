"use client";

import {Heart} from "lucide-react";
import {useTranslations} from "next-intl";
import {buttonClass} from "@/components/ui/button";
import {useFavourite, type FavouriteKind} from "@/lib/user-state";

export function FavouriteButton({
  kind,
  slug,
  compact = false
}: {
  kind: FavouriteKind;
  slug: string;
  compact?: boolean;
}) {
  const t = useTranslations("common");
  const {isSaved, toggle} = useFavourite(kind, slug);
  const label = isSaved ? t("remove") : t("save");

  if (compact) {
    return (
      <button
        aria-label={label}
        aria-pressed={isSaved}
        className="grid min-h-11 min-w-11 place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-soft hover:text-danger aria-pressed:text-danger"
        onClick={toggle}
        title={label}
        type="button"
      >
        <Heart aria-hidden fill={isSaved ? "currentColor" : "none"} size={20} />
      </button>
    );
  }

  return (
    <button aria-pressed={isSaved} className={buttonClass(isSaved ? "danger" : "secondary")} onClick={toggle} type="button">
      <Heart aria-hidden fill={isSaved ? "currentColor" : "none"} size={18} />
      {isSaved ? t("saved") : t("save")}
    </button>
  );
}
