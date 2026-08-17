import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const Chevron = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function HomeHorizontalScrollRow({
  className = "",
  children,
  depKey = 0,
  showArrows = true,
}) {
  const { t } = useTranslation();
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setCanPrev(scrollLeft > 2);
    setCanNext(max > 2 && scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    if (!showArrows) return undefined;
    const el = trackRef.current;
    if (!el) return undefined;
    syncArrows();
    el.addEventListener("scroll", syncArrows, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncArrows) : null;
    ro?.observe(el);
    window.addEventListener("resize", syncArrows, { passive: true });
    return () => {
      el.removeEventListener("scroll", syncArrows);
      ro?.disconnect();
      window.removeEventListener("resize", syncArrows);
    };
  }, [syncArrows, depKey, showArrows]);

  const scrollByDir = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(220, Math.floor(el.clientWidth * 0.6));
    el.scrollBy({ left: dir === "next" ? step : -step, behavior: "smooth" });
  };

  const trackClassName = ["home_horizontal_scroll__track", className].filter(Boolean).join(" ");

  return (
    <div className={`home_horizontal_scroll__wrap${showArrows ? "" : " home_horizontal_scroll__wrap--no-arrows"}`}>
      {showArrows ? (
        <>
          <button
            type="button"
            className="home_horizontal_scroll__arrow home_horizontal_scroll__arrow--prev"
            onClick={() => scrollByDir("prev")}
            disabled={!canPrev}
            aria-label={t("home.scrollProductsLeft")}
          >
            <Chevron dir="prev" />
          </button>
          <button
            type="button"
            className="home_horizontal_scroll__arrow home_horizontal_scroll__arrow--next"
            onClick={() => scrollByDir("next")}
            disabled={!canNext}
            aria-label={t("home.scrollProductsRight")}
          >
            <Chevron dir="next" />
          </button>
        </>
      ) : null}
      <div ref={trackRef} className={trackClassName}>
        {children}
      </div>
    </div>
  );
}
