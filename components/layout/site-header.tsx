"use client";

import {Heart, Menu, Search, X} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {Link, usePathname} from "@/i18n/navigation";
import {LanguageSwitcher} from "./language-switcher";
import {Logo} from "./logo";

const navItems = [
  {key: "test", href: "/test"},
  {key: "directions", href: "/directions"},
  {key: "professions", href: "/professions"},
  {key: "universities", href: "/universities"},
  {key: "careerPath", href: "/career-path"},
  {key: "admissionPlan", href: "/admission-plan"},
  {key: "grants", href: "/grants"}
] as const;

const extraMobileItems = [
  {key: "favorites", href: "/favorites"},
  {key: "reviews", href: "/reviews"},
  {key: "about", href: "/about"}
] as const;

/**
 * The header stays pinned to the top. It is transparent over the top of the
 * page, turns frosted once the page scrolls, slides away while the visitor
 * scrolls down and comes back as soon as they scroll up. Its visible height is
 * published as `--header-offset`, so sticky parts of pages sit below it.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    let last = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const max = root.scrollHeight - window.innerHeight;
      header.style.setProperty("--scroll-progress", max > 0 ? String(Math.min(1, y / max)) : "0");
      setScrolled(y > 12);
      if (openRef.current || y < 320) setHidden(false);
      else if (y > last + 4) setHidden(true);
      else if (y < last - 4) setHidden(false);
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, {passive: true});
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Sticky parts of pages (the career map's progress rail, the review form) sit under the visible header.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--header-offset", hidden ? "0px" : `${header.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => observer.disconnect();
  }, [hidden, open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`np-header sticky top-0 z-40 border-b transition-[translate,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(.22,.9,.25,1)] ${
        scrolled || open ? "border-border bg-canvas/80 shadow-[0_10px_30px_-18px_rgb(28_42_57/0.35)] backdrop-blur-xl backdrop-saturate-150" : "border-transparent bg-canvas/0"
      } ${hidden ? "-translate-y-full" : "translate-y-0"}`}
      ref={headerRef}
    >
      <div className={`container-page flex items-center justify-between gap-3 transition-[min-height] duration-500 ${scrolled ? "min-h-16" : "min-h-20"}`}>
        <Logo captionFrom="header" onClick={() => setOpen(false)} />

        <nav aria-label={t("label")} className="hidden items-center xl:flex">
          {navItems.map((item) => (
            <Link
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`np-navlink relative rounded-full px-1.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200 hover:text-ink ${
                isActive(item.href) ? "text-ink" : "text-muted"
              }`}
              href={item.href}
              key={item.key}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            aria-label={t("search")}
            className="np-icon-btn grid min-h-11 min-w-11 place-items-center rounded-full text-muted transition-colors duration-200 hover:bg-soft hover:text-ink"
            href="/search"
          >
            <Search aria-hidden size={20} />
          </Link>
          <Link
            aria-label={t("favorites")}
            className="np-icon-btn grid min-h-11 min-w-11 place-items-center rounded-full text-muted transition-colors duration-200 hover:bg-soft hover:text-ink"
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
            className="grid min-h-11 min-w-11 place-items-center rounded-full transition-colors duration-200 hover:bg-soft xl:hidden"
            onClick={() => setOpen(!open)}
            type="button"
          >
            <span aria-hidden className={`np-burger ${open ? "is-open" : ""}`}>
              {open ? <X size={22} /> : <Menu size={22} />}
            </span>
          </button>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.22,.9,.25,1)] xl:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        inert={!open}
      >
        <div className="overflow-hidden">
          <nav aria-label={t("label")} className={`np-mobile-nav container-page flex flex-col gap-1 border-t border-border py-4 ${open ? "is-open" : ""}`}>
            {[...navItems, ...extraMobileItems].map((item, index) => (
              <Link
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`rounded-xl px-3 py-3 font-semibold transition-colors duration-200 hover:bg-soft ${isActive(item.href) ? "bg-brand-soft text-brand" : ""}`}
                href={item.href}
                key={item.key}
                onClick={() => setOpen(false)}
                style={{"--i": index} as React.CSSProperties}
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="px-3 pt-2 sm:hidden">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      </div>

      <span aria-hidden className="np-scroll-progress" />
    </header>
  );
}
