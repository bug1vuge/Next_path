import {Info} from "lucide-react";
import {useTranslations} from "next-intl";
import {isUntranslatedContentLocale} from "@/lib/content";
import type {Locale} from "@/lib/locales";

/**
 * Catalogue text exists in Russian only. When the interface is shown in another
 * language, say so plainly instead of pretending the content is translated.
 */
export function ContentNotice({locale}: {locale: Locale}) {
  const t = useTranslations("common");
  if (!isUntranslatedContentLocale(locale)) return null;

  return (
    <p className="mb-6 flex items-start gap-2 rounded-2xl bg-peach px-4 py-3 text-sm leading-6">
      <Info aria-hidden className="mt-0.5 shrink-0" size={18} />
      {t("contentLanguageNotice")}
    </p>
  );
}
