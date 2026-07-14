import React, { useEffect, useState } from "react";

/**
 * Rotating search placeholder: fade + slide up through saved/often-searched terms.
 */
export default function AnimatedSearchPlaceholder({
  terms = [],
  fallback = "Search products…",
  intervalMs = 3200,
  className = "",
}) {
  const slides = terms.length ? terms : [fallback];
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("in"); // in | out

  useEffect(() => {
    setIndex(0);
    setPhase("in");
  }, [slides.join("|")]);

  useEffect(() => {
    if (slides.length < 2) return undefined;

    const outTimer = window.setTimeout(() => setPhase("out"), intervalMs - 450);
    const nextTimer = window.setTimeout(() => {
      setIndex((prev) => (prev + 1) % slides.length);
      setPhase("in");
    }, intervalMs);

    return () => {
      window.clearTimeout(outTimer);
      window.clearTimeout(nextTimer);
    };
  }, [index, intervalMs, slides.length]);

  const label = slides[index] || fallback;

  return (
    <span
      className={`animated-search-placeholder ${className}`.trim()}
      aria-hidden="true"
    >
      <span
        key={`${index}-${label}`}
        className={`animated-search-placeholder__slide is-${phase}`}
      >
        {label}
      </span>
    </span>
  );
}
