import {useTranslations} from "next-intl";
import {buttonClass} from "@/components/ui/button";
import {Link} from "@/i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="container-page grid place-items-center py-24 text-center">
      <p className="text-6xl font-extrabold text-brand">404</p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="mt-3 max-w-md text-base leading-7 text-muted">{t("text")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link className={buttonClass("primary")} href="/">
          {t("home")}
        </Link>
        <Link className={buttonClass("secondary")} href="/directions">
          {t("directions")}
        </Link>
      </div>
    </div>
  );
}
