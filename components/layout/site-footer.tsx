import Image from "next/image";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-2.5">
            <Image alt="" className="h-10 w-10" height={40} src="/logo-mark.png" unoptimized width={40} />
            <p className="text-xl font-extrabold">
              Next <span className="text-brand">Path</span>
            </p>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">{t("description")}</p>
          <p className="mt-4 max-w-sm text-xs leading-5 text-muted">{t("sourceNote")}</p>
        </div>
        <nav className="flex flex-wrap content-start gap-x-5 gap-y-3 text-sm font-semibold">
          <Link className="hover:text-brand" href="/directions">
            {t("directions")}
          </Link>
          <Link className="hover:text-brand" href="/professions">
            {t("professions")}
          </Link>
          <Link className="hover:text-brand" href="/universities">
            {t("universities")}
          </Link>
          <Link className="hover:text-brand" href="/reviews">
            {t("reviews")}
          </Link>
          <Link className="hover:text-brand" href="/about">
            {t("about")}
          </Link>
        </nav>
      </div>
      <div className="container-page border-t border-border py-4 text-xs text-muted">
        © {new Date().getFullYear()} Next Path
      </div>
    </footer>
  );
}
