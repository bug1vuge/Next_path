"use client";

import {Heart, Menu, Search, X} from "lucide-react";
import Image from "next/image";
import {useState} from "react";
import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";
import {LanguageSwitcher} from "./language-switcher";

const navItems = [
  {key: "test", href: "/test"},
  {key: "directions", href: "/directions"},
  {key: "professions", href: "/professions"},
  {key: "universities", href: "/universities"},
  {key: "careerPath", href: "/career-path"},
  {key: "admissionPlan", href: "/admission-plan"},
  {key: "grants", href: "/grants"}
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("navigation");

  return (
    <header className="border-b border-border bg-canvas/90 backdrop-blur">
      <div className="container-page flex min-h-18 items-center justify-between gap-4 py-2">
        <Link aria-label="Next Path" className="flex shrink-0 items-center gap-2.5" href="/">
          <Image
            alt=""
            className="h-9 w-9 sm:h-10 sm:w-10"
            height={40}
            priority
            src="/logo-mark.png"
            unoptimized
            width={40}
          />
          <span className="text-xl font-extrabold tracking-tight text-ink">
            Next <span className="text-brand">Path</span>
          </span>
        </Link>

        <nav aria-label={t("label")} className="hidden items-center gap-5 xl:flex">
          {navItems.map((item) => (
            <Link className="text-sm font-semibold text-muted transition-colors duration-150 hover:text-ink" href={item.href} key={item.key}>
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            aria-label={t("search")}
            className="grid min-h-11 min-w-11 place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-soft hover:text-ink"
            href="/search"
          >
            <Search aria-hidden size={20} />
          </Link>
          <Link
            aria-label={t("favorites")}
            className="grid min-h-11 min-w-11 place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-soft hover:text-ink"
            href="/favorites"
          >
            <Heart aria-hidden size={20} />
          </Link>
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <button
            aria-expanded={open}
            aria-label={open ? t("closeMenu") : t("openMenu")}
            className="grid min-h-11 min-w-11 place-items-center rounded-full transition-colors duration-150 hover:bg-soft xl:hidden"
            onClick={() => setOpen(!open)}
            type="button"
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <nav aria-label={t("label")} className="container-page flex flex-col gap-1 border-t border-border py-4 xl:hidden">
          {navItems.map((item) => (
            <Link
              className="rounded-xl px-3 py-3 font-semibold transition-colors duration-150 hover:bg-soft"
              href={item.href}
              key={item.key}
              onClick={() => setOpen(false)}
            >
              {t(item.key)}
            </Link>
          ))}
          <Link
            className="rounded-xl px-3 py-3 font-semibold transition-colors duration-150 hover:bg-soft"
            href="/favorites"
            onClick={() => setOpen(false)}
          >
            {t("favorites")}
          </Link>
          <Link
            className="rounded-xl px-3 py-3 font-semibold transition-colors duration-150 hover:bg-soft"
            href="/reviews"
            onClick={() => setOpen(false)}
          >
            {t("reviews")}
          </Link>
          <Link
            className="rounded-xl px-3 py-3 font-semibold transition-colors duration-150 hover:bg-soft"
            href="/about"
            onClick={() => setOpen(false)}
          >
            {t("about")}
          </Link>
          <div className="px-3 pt-2 sm:hidden">
            <LanguageSwitcher />
          </div>
        </nav>
      ) : null}
    </header>
  );
}
