"use client";

import {useEffect, useRef, type ReactNode} from "react";

/**
 * Pulls its child slightly towards the pointer and springs back on leave —
 * the "magnetic" buttons of the HOLZ redesign. Only on precise pointers and
 * without `prefers-reduced-motion`.
 */
export function Magnetic({children, strength = 0.25}: {children: ReactNode; strength?: number}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const move = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      const dx = (event.clientX - (box.left + box.width / 2)) * strength;
      const dy = (event.clientY - (box.top + box.height / 2)) * strength;
      element.style.transition = "transform 0.2s ease-out";
      element.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    };
    const leave = () => {
      element.style.transition = "transform 0.7s cubic-bezier(.34,1.56,.64,1)";
      element.style.transform = "";
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
    };
  }, [strength]);

  return (
    <span className="inline-flex" ref={ref}>
      {children}
    </span>
  );
}
