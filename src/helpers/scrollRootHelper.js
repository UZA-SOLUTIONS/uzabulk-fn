/** Scroll + layout helpers when the buyer assistant is docked on desktop. */

export function isAssistantSideDock() {
  return typeof document !== "undefined" && document.body?.classList?.contains("assistant-side-dock");
}

export function getAppScrollRoot() {
  if (typeof document === "undefined") return null;
  return document.scrollingElement || document.documentElement;
}

export function readScrollY() {
  if (typeof window === "undefined") return 0;
  return window.scrollY ?? document.documentElement.scrollTop ?? 0;
}

export function writeScrollY(y, { behavior = "auto" } = {}) {
  const top = Math.max(0, Number(y) || 0);
  if (typeof window === "undefined") return;
  window.scrollTo({ top, behavior });
}

export function getMainContentWidth() {
  return getMainContentBounds().width;
}

/** Left edge + width of the scrollable main column (narrows when assistant is docked). */
export function getMainContentBounds() {
  if (typeof window === "undefined") {
    return { left: 0, width: 1200 };
  }
  const shell = document.querySelector(".app-layout-shell");
  if (isAssistantSideDock() && shell) {
    const rect = shell.getBoundingClientRect();
    return {
      left: Math.max(0, Math.round(rect.left)),
      width: Math.max(0, Math.round(shell.clientWidth || rect.width)),
    };
  }
  return { left: 0, width: window.innerWidth };
}

export function onAppScroll(handler, options = { passive: true }) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("scroll", handler, options);
  return () => window.removeEventListener("scroll", handler);
}
