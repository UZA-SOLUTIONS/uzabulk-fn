import { useEffect, useRef, useState } from "react";

/** Aligns sticky category strip flush under the live site header (no gap). */
export function useCategoryStripPin({ enabled = true } = {}) {
  const catstripNavRef = useRef(null);
  const [headerOffset, setHeaderOffset] = useState(120);

  useEffect(() => {
    if (!enabled) return undefined;

    const header = document.querySelector(".site-header");
    let lastValue = "";

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

      // Bottom edge while sticky so the strip touches the header with no gap.
      const rect = header.getBoundingClientRect();
      applyOffset(rect.bottom > 0 ? rect.bottom : rect.height);
    };

    measureHeader();
    window.addEventListener("resize", measureHeader, { passive: true });
    window.addEventListener("scroll", measureHeader, { passive: true });
    const headerObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureHeader) : null;
    headerObserver?.observe(header);

    return () => {
      window.removeEventListener("resize", measureHeader);
      window.removeEventListener("scroll", measureHeader);
      headerObserver?.disconnect();
    };
  }, [enabled]);

  return {
    catstripNavRef,
    headerOffset,
  };
}
