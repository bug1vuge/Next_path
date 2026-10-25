import {Link} from "@/i18n/navigation";

/**
 * The Next Path mark, drawn as SVG so it can move: the sun rises over the
 * horizon and the road towards it draws itself. Hovering the logo replays it
 * (styles in `app/globals.css`, `.np-logo`). It keeps the idea of the old
 * raster mark — a sunrise and a winding path — in the site's own colours.
 */
export function LogoMark({className = ""}: {className?: string}) {
  return (
    <svg aria-hidden className={`np-mark ${className}`} fill="none" viewBox="0 0 40 40">
      <circle className="np-mark__badge" cx="20" cy="20" r="19" />
      <g className="np-mark__rays">
        <line x1="20" x2="20" y1="8.2" y2="10.6" />
        <line x1="12.4" x2="13.9" y1="11.3" y2="13" />
        <line x1="27.6" x2="26.1" y1="11.3" y2="13" />
        <line x1="8.4" x2="10.6" y1="17.6" y2="18.4" />
        <line x1="31.6" x2="29.4" y1="17.6" y2="18.4" />
      </g>
      <path className="np-mark__sun" d="M13.4 22.2a6.6 6.6 0 0 1 13.2 0z" />
      <line className="np-mark__horizon" x1="7.5" x2="32.5" y1="22.2" y2="22.2" />
      <path className="np-mark__road" d="M11 33.4c6.2-.6 11.6-2.6 9.6-5.2-1.3-1.7-3.4-2.6-.6-5.4" pathLength={1} />
    </svg>
  );
}

/**
 * The logo as a link home: mark, word and a small two-line caption. The caption
 * shows from small screens up; in the header (`"header"`) it gives way to the
 * full menu on wide screens.
 */
export function Logo({
  captionFrom = "sm",
  className = "",
  onClick
}: {
  captionFrom?: "sm" | "header";
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link aria-label="Next Path" className={`np-logo group inline-flex shrink-0 items-center gap-2.5 ${className}`} href="/" onClick={onClick}>
      <LogoMark className="size-10 sm:size-11" />
      <span className="np-logo__word text-xl font-extrabold tracking-tight text-ink sm:text-[1.4rem]">
        Next <span className="text-brand">Path</span>
      </span>
      <span
        aria-hidden
        className={`np-logo__caption hidden border-l border-border pl-2.5 text-[9px] leading-[1.15] font-bold tracking-[0.2em] text-muted uppercase ${
          captionFrom === "header" ? "sm:block xl:hidden" : "sm:block"
        }`}
      >
        career
        <br />
        navigator
      </span>
    </Link>
  );
}
