import { useEffect, useRef, useState } from "react";

/** Aligns sticky category strip flush under the live site header (no gap). */
export function useCategoryStripPin({ enabled = true } = {}) {
  const catstripNavRef = useRef(null);
  const [headerOffset, setHeaderOffset] = useState(120);

  useEffect(() => {
    if (!enabled) return undefined;

    const header = document.querySelector(".site-header");
    let lastValue = "";
    let rafId = 0;

    const applyOffset = (height) => {
      const next = Math.max(0, Math.round(height));
      const value = `${next}px`;
      if (value === lastValue) return;
      lastValue = value;
      setHeaderOffset(next);
      document.documentElement.style.setProperty("--home-discover-catstrip-top", value);
      document.documentElement.style.setProperty("--products-catstrip-sticky-top", value);
    };

    const measureHeader = () => {
      if (!header) {
        applyOffset(120);
        return;
      }

      // While the Track Order / Help / Cart row is collapsed, pin under the search tier only
      // so the category strip stays flush at the top without waiting for max-height animation.
      const compact = header.classList.contains("is-scrolled");
      const subActions = header.querySelector(".header-sub-actions");
      if (compact && subActions) {
        const subRect = subActions.getBoundingClientRect();
        applyOffset(subRect.bottom > 0 ? subRect.bottom : subRect.height);
        return;
      }

      const rect = header.getBoundingClientRect();
      applyOffset(rect.bottom > 0 ? rect.bottom : rect.height);
    };

    const scheduleMeasure = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        measureHeader();
      });
    };

    measureHeader();
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    window.addEventListener("scroll", scheduleMeasure, { passive: true });

    const headerObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleMeasure) : null;
    if (header) headerObserver?.observe(header);

    const classObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(scheduleMeasure)
        : null;
    if (header) {
      classObserver?.observe(header, { attributes: true, attributeFilter: ["class"] });
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure);
      headerObserver?.disconnect();
      classObserver?.disconnect();
    };
  }, [enabled]);

  return {
    catstripNavRef,
    headerOffset,
  };
}
