import {LogoMark} from "@/components/layout/logo";

/**
 * The first-visit intro: the mark draws itself, the name rises, then two
 * panels slide apart to open the page. Shown once per tab session — the inline
 * script in `app/layout.tsx` decides before the first paint — and never with
 * `prefers-reduced-motion`. It never takes clicks (`pointer-events: none`).
 */
export function Intro() {
  return (
    <div aria-hidden className="np-intro">
      <div className="np-intro__panel np-intro__panel--left" />
      <div className="np-intro__panel np-intro__panel--right" />
      <div className="np-intro__center">
        <LogoMark className="np-intro__mark" />
        <p className="np-intro__word">
          {"Next Path".split("").map((letter, index) => (
            <span key={index} style={{"--l": index} as React.CSSProperties}>
              {letter === " " ? " " : letter}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
