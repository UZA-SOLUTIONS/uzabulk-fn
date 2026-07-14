import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

/** Pull <img> tags out of product-description HTML for a horizontal gallery. */
export function splitProductDescriptionHtml(html = "") {
  if (typeof window === "undefined" || !html) {
    return { textHtml: html || "", images: [] };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="desc-root">${html}</div>`, "text/html");
    const root = doc.getElementById("desc-root");
    if (!root) return { textHtml: html, images: [] };

    const images = [];
    const seen = new Set();
    root.querySelectorAll("img").forEach((img) => {
      const src = (img.getAttribute("src") || "").trim();
      if (src && !seen.has(src)) {
        seen.add(src);
        images.push({
          src,
          alt: (img.getAttribute("alt") || "").trim(),
        });
      }
      const parent = img.parentElement;
      img.remove();
      // Drop empty wrappers left behind by image-only blocks.
      if (
        parent
        && parent !== root
        && !parent.textContent?.trim()
        && !parent.querySelector("img, table, iframe, video")
      ) {
        parent.remove();
      }
    });

    return {
      textHtml: root.innerHTML.trim(),
      images,
    };
  } catch (_) {
    return { textHtml: html, images: [] };
  }
}

export default function ProductDescriptionGallery({ images = [], ariaLabel = "Product description images" }) {
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
  }, [syncArrows, images.length]);

  const scrollByDir = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(240, Math.floor(el.clientWidth * 0.85));
    el.scrollBy({ left: dir === "next" ? step : -step, behavior: "smooth" });
  };

  const list = useMemo(() => (Array.isArray(images) ? images.filter((i) => i?.src) : []), [images]);
  if (!list.length) return null;

  return (
    <div className="product-desc-gallery" aria-label={ariaLabel}>
      {canPrev ? (
        <button
          type="button"
          className="product-desc-gallery__arrow product-desc-gallery__arrow--prev"
          aria-label="Previous images"
          onClick={() => scrollByDir("prev")}
        >
          <Chevron dir="prev" />
        </button>
      ) : null}

      <div ref={trackRef} className="product-desc-gallery__track">
        {list.map((image, idx) => (
          <figure key={`${image.src}-${idx}`} className="product-desc-gallery__slide">
            <img
              src={image.src}
              alt={image.alt || `Product image ${idx + 1}`}
              loading={idx < 2 ? "eager" : "lazy"}
              decoding="async"
            />
          </figure>
        ))}
      </div>

      {canNext ? (
        <button
          type="button"
          className="product-desc-gallery__arrow product-desc-gallery__arrow--next"
          aria-label="Next images"
          onClick={() => scrollByDir("next")}
        >
          <Chevron dir="next" />
        </button>
      ) : null}
    </div>
  );
}
