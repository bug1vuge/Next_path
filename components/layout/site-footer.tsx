import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("footer");
  return <footer className="mt-auto border-t border-border bg-surface"><div className="container-page grid gap-8 py-10 sm:grid-cols-2"><div><p className="text-xl font-extrabold">Next <span className="text-brand">Path</span></p><p className="mt-3 max-w-sm text-sm leading-6 text-muted">{t("description")}</p></div><div className="flex flex-wrap content-start gap-x-5 gap-y-3 text-sm font-semibold"><Link href="/directions">{t("directions")}</Link><Link href="/professions">{t("professions")}</Link><Link href="/universities">{t("universities")}</Link><Link href="/about">{t("about")}</Link></div></div><div className="container-page border-t border-border py-4 text-xs text-muted">© {new Date().getFullYear()} Next Path</div></footer>;
}
