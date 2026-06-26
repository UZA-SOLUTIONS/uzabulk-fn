import { useEffect, useRef, useState } from "react";

/** Aligns sticky category strip offset with the live site header height. */
export function useCategoryStripPin({ enabled = true } = {}) {
  const catstripNavRef = useRef(null);
  const [headerOffset, setHeaderOffset] = useState(120);

  useEffect(() => {
    if (!enabled) return undefined;

    const header = document.querySelector(".site-site-header") || document.querySelector(".site-header");
    const measureHeader = () => {
      const height = Math.ceil(header?.getBoundingClientRect().height || 120);
      setHeaderOffset((prev) => (prev === height ? prev : height));
      document.documentElement.style.setProperty("--home-discover-catstrip-top", `${height}px`);
      document.documentElement.style.setProperty("--products-catstrip-sticky-top", `${height}px`);
    };

    measureHeader();
    window.addEventListener("resize", measureHeader, { passive: true });
    const headerObserver =
      header && typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureHeader) : null;
    headerObserver?.observe(header);

    return () => {
      window.removeEventListener("resize", measureHeader);
      headerObserver?.disconnect();
    };
  }, [enabled]);

  return {
    catstripNavRef,
    headerOffset,
  };
}
