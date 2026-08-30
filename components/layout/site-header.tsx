"use client";

import {Menu, Search, X} from "lucide-react";
import {useState} from "react";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";
import {LanguageSwitcher} from "./language-switcher";

const navItems = ["test", "directions", "professions", "universities", "careerPath"] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("navigation");

  return (
    <header className="border-b border-border bg-canvas/90 backdrop-blur">
      <div className="container-page flex min-h-18 items-center justify-between gap-4">
        <Link aria-label="Next Path" className="shrink-0 text-xl font-extrabold tracking-tight text-ink" href="/">Next <span className="text-brand">Path</span></Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label={t("label")}>
          {navItems.map((item) => <Link className="text-sm font-semibold text-muted transition-colors hover:text-ink" href={`/${item === "careerPath" ? "career-path" : item}`} key={item}>{t(item)}</Link>)}
        </nav>
        <div className="flex items-center gap-2"><Link aria-label={t("search")} className="grid min-h-11 min-w-11 place-items-center rounded-full text-muted hover:bg-soft hover:text-ink" href="/search"><Search size={20} /></Link><div className="hidden sm:block"><LanguageSwitcher /></div><button aria-expanded={open} aria-label={open ? t("closeMenu") : t("openMenu")} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-soft lg:hidden" onClick={() => setOpen(!open)} type="button">{open ? <X /> : <Menu />}</button></div>
      </div>
      {open && <nav aria-label={t("label")} className="container-page flex flex-col gap-1 border-t border-border py-4 lg:hidden">{navItems.map((item) => <Link className="rounded-xl px-3 py-3 font-semibold hover:bg-soft" href={`/${item === "careerPath" ? "career-path" : item}`} key={item} onClick={() => setOpen(false)}>{t(item)}</Link>)}<div className="px-3 pt-2 sm:hidden"><LanguageSwitcher /></div></nav>}
    </header>
  );
}
