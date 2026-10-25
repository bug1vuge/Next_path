"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import {useEffect} from "react";

/**
 * Site-wide motion, modelled on the HOLZ redesign:
 *
 * - smooth wheel scrolling (Lenis) — never inside dialogs, fields or nested
 *   scroll areas, so the assistant's chat and the filters scroll as before;
 * - `[data-reveal]` elements rise into view as they enter the screen; those
 *   entering together are staggered. Elements added later (navigation, client
 *   rendering) are picked up automatically;
 * - a soft cursor ring on devices with a precise pointer.
 *
 * Everything is skipped with `prefers-reduced-motion`. Content is only hidden
 * while the inline script in `app/layout.tsx` has marked the page as animated,
 * and CSS reveals it anyway if this component never runs.
 */
export function MotionProvider() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("motion-ready");
    if (reduced) return;

    // ---- smooth scrolling
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.12,
      anchors: {offset: -80},
      allowNestedScroll: true,
      prevent: (node) => Boolean(node.closest?.('[role="dialog"], [data-lenis-prevent], textarea, select'))
    });

    // ---- reveal on scroll
    // Elements are animated with the Web Animations API and tracked in memory:
    // no attribute is written to them, so markup that React has not hydrated
    // yet stays exactly as the server sent it.
    const easing = "cubic-bezier(.22,.9,.25,1)";
    const seen = new WeakSet<Element>();
    let batch: HTMLElement[] = [];
    let flush = 0;
    const reveal = (element: HTMLElement, delay: number) => {
      if (element.dataset.reveal === "split") {
        element.querySelectorAll<HTMLElement>(".np-word > span").forEach((word, index) => {
          word.animate([{transform: "translateY(115%) rotate(4deg)"}, {transform: "none"}], {
            duration: 1000,
            easing,
            delay: delay + index * 55,
            fill: "both"
          });
        });
        return;
      }
      element.animate([{opacity: 0, transform: "translateY(36px)"}, {opacity: 1, transform: "none"}], {
        duration: 950,
        easing,
        delay,
        fill: "both"
      });
    };
    const show = () => {
      flush = 0;
      batch.forEach((element, index) => reveal(element, Math.min(index, 8) * 80));
      batch = [];
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          batch.push(entry.target as HTMLElement);
        }
        if (batch.length > 0 && !flush) flush = requestAnimationFrame(show);
      },
      {rootMargin: "0px 0px -8% 0px", threshold: 0.08}
    );
    const watch = (scope: ParentNode) => {
      const found = scope instanceof HTMLElement && scope.matches("[data-reveal]") ? [scope] : [];
      found.push(...scope.querySelectorAll<HTMLElement>("[data-reveal]"));
      for (const element of found) {
        if (seen.has(element)) continue;
        seen.add(element);
        observer.observe(element);
      }
    };
    // The first-visit intro covers the page for a moment; the hero starts rising as it opens.
    const introDelay = root.classList.contains("intro") ? 1150 : 0;
    const start = window.setTimeout(() => watch(document), introDelay);
    const introEnd = window.setTimeout(() => root.classList.remove("intro"), introDelay ? 2300 : 0);
    const mutations = new MutationObserver((records) => {
      if (root.classList.contains("intro")) return;
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) watch(node);
        });
      }
    });
    mutations.observe(document.body, {childList: true, subtree: true});

    // ---- cursor ring
    let cursorCleanup = () => {};
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const ring = document.createElement("div");
      ring.className = "np-cursor";
      ring.setAttribute("aria-hidden", "true");
      document.body.appendChild(ring);
      let x = -100;
      let y = -100;
      let rx = x;
      let ry = y;
      let raf = 0;
      const loop = () => {
        rx += (x - rx) * 0.2;
        ry += (y - ry) * 0.2;
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.1 ? requestAnimationFrame(loop) : 0;
      };
      const move = (event: PointerEvent) => {
        x = event.clientX;
        y = event.clientY;
        ring.classList.add("is-visible");
        if (!raf) raf = requestAnimationFrame(loop);
      };
      const over = (event: PointerEvent) => {
        const target = event.target as HTMLElement | null;
        const field = target?.closest("input, textarea, select, [contenteditable]");
        const interactive = target?.closest("a, button, label, summary, [role='button']");
        ring.classList.toggle("is-hover", Boolean(interactive) && !field);
        ring.classList.toggle("is-field", Boolean(field));
      };
      const leave = () => ring.classList.remove("is-visible");
      const down = () => ring.classList.add("is-down");
      const up = () => ring.classList.remove("is-down");
      window.addEventListener("pointermove", move, {passive: true});
      window.addEventListener("pointerover", over, {passive: true});
      window.addEventListener("pointerdown", down, {passive: true});
      window.addEventListener("pointerup", up, {passive: true});
      root.addEventListener("pointerleave", leave);
      cursorCleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerover", over);
        window.removeEventListener("pointerdown", down);
        window.removeEventListener("pointerup", up);
        root.removeEventListener("pointerleave", leave);
        ring.remove();
      };
    }

    return () => {
      window.clearTimeout(start);
      window.clearTimeout(introEnd);
      cancelAnimationFrame(flush);
      observer.disconnect();
      mutations.disconnect();
      cursorCleanup();
      lenis.destroy();
    };
  }, []);

  return null;
}
