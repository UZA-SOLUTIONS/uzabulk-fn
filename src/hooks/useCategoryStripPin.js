import { useEffect, useRef, useState } from "react";
import { getMainContentBounds, onAppScroll } from "../helpers/scrollRootHelper";

/** Pins a category nav bar flush under the site header while scrolling. */
export function useCategoryStripPin({
  enabled = true,
  bodyClass = "home-catstrip-pinned",
  rootSelector = ".home_discover_browse_outer",
} = {}) {
  const catstripSentinelRef = useRef(null);
  const catstripNavRef = useRef(null);
  const catstripPinnedRef = useRef(false);
  const [catstripPinned, setCatstripPinned] = useState(false);
  const [catstripSpacerHeight, setCatstripSpacerHeight] = useState(0);
  const [headerOffset, setHeaderOffset] = useState(120);

  useEffect(() => {
    const header = document.querySelector(".site-header");
    const measureHeader = () => {
      const height = Math.ceil(header?.getBoundingClientRect().height || 120);
      setHeaderOffset(height);
      document.documentElement.style.setProperty("--home-discover-catstrip-top", `${height}px`);
      document.documentElement.style.setProperty("--products-catstrip-sticky-top", `${height}px`);
    };
    measureHeader();
    window.addEventListener("resize", measureHeader);
    const headerObserver =
      header && typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureHeader) : null;
    headerObserver?.observe(header);
    return () => {
      window.removeEventListener("resize", measureHeader);
      headerObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const sentinel = catstripSentinelRef.current;
    const nav = catstripNavRef.current;
    if (!sentinel || !nav) return undefined;

    const clearFixedLayout = () => {
      nav.style.position = "";
      nav.style.top = "";
      nav.style.left = "";
      nav.style.right = "";
      nav.style.width = "";
      nav.style.maxWidth = "";
      nav.style.zIndex = "";
      nav.style.borderRadius = "";
      nav.style.marginLeft = "";
      nav.style.marginRight = "";
      nav.style.background = "";
      nav.style.boxShadow = "";
      nav.style.border = "";
      nav.style.filter = "";
      document.body.classList.remove(bodyClass);
    };

    const applyFixedLayout = () => {
      const { left, width } = getMainContentBounds();

      nav.style.position = "fixed";
      nav.style.top = `${headerOffset}px`;
      nav.style.left = `${left}px`;
      nav.style.right = "auto";
      nav.style.width = `${width}px`;
      nav.style.maxWidth = `${width}px`;
      nav.style.marginLeft = "0";
      nav.style.marginRight = "0";
      nav.style.borderRadius = "0";
      nav.style.zIndex = "1100";
      nav.style.background = "#fff";
      nav.style.boxShadow = "none";
      nav.style.border = "none";
      nav.style.filter = "none";
      document.body.classList.add(bodyClass);
    };

    const getSectionRoot = () =>
      nav.closest(rootSelector) || sentinel.closest(rootSelector) || sentinel.parentElement;

    const updatePin = () => {
      const sentinelTop = sentinel.getBoundingClientRect().top;
      const sectionRoot = getSectionRoot();
      const sectionBottom = sectionRoot?.getBoundingClientRect().bottom ?? 0;

      const shouldEnterPin = sentinelTop <= headerOffset;
      const shouldLeavePin = sectionBottom <= headerOffset;

      if (!catstripPinnedRef.current) {
        if (!shouldEnterPin) return;
        catstripPinnedRef.current = true;
        setCatstripSpacerHeight(nav.offsetHeight);
        setCatstripPinned(true);
        applyFixedLayout();
        return;
      }

      if (shouldLeavePin) {
        catstripPinnedRef.current = false;
        clearFixedLayout();
        setCatstripSpacerHeight(0);
        setCatstripPinned(false);
        return;
      }

      applyFixedLayout();
    };

    const refreshPinnedLayout = () => {
      updatePin();
    };

    const cleanupScroll = onAppScroll(updatePin, { passive: true });
    window.addEventListener("resize", refreshPinnedLayout, { passive: true });

    const shell = document.querySelector(".app-layout-shell");
    const shellObserver =
      shell && typeof ResizeObserver !== "undefined" ? new ResizeObserver(refreshPinnedLayout) : null;
    shellObserver?.observe(shell);

    const sectionRoot = getSectionRoot();
    const sectionObserver =
      sectionRoot && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(refreshPinnedLayout)
        : null;
    sectionObserver?.observe(sectionRoot);

    const bodyObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(refreshPinnedLayout)
        : null;
    bodyObserver?.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    const shellTransitionHandler = (event) => {
      if (event.propertyName === "width" || event.propertyName === "max-width") {
        refreshPinnedLayout();
      }
    };
    shell?.addEventListener("transitionend", shellTransitionHandler);

    updatePin();

    return () => {
      cleanupScroll();
      window.removeEventListener("resize", refreshPinnedLayout);
      shellObserver?.disconnect();
      sectionObserver?.disconnect();
      bodyObserver?.disconnect();
      shell?.removeEventListener("transitionend", shellTransitionHandler);
      catstripPinnedRef.current = false;
      clearFixedLayout();
      document.body.classList.remove(bodyClass);
    };
  }, [enabled, headerOffset, bodyClass, rootSelector]);

  return {
    catstripSentinelRef,
    catstripNavRef,
    catstripPinned,
    catstripSpacerHeight,
    headerOffset,
  };
}
