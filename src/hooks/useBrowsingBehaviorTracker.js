import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import {
  buildRegionContext,
  flushOnPageLeave,
  resetPageEngagement,
  resolvePageName,
  trackPageView,
} from "../helpers/browsingBehaviorHelper";

/**
 * Global route + scroll engagement tracker for the recommendation engine.
 */
export default function useBrowsingBehaviorTracker() {
  const location = useLocation();
  const shippingAddress = useSelector((s) => s.address.shippingAddress.detail);
  const pageRef = useRef("");
  const regionRef = useRef({});

  useEffect(() => {
    regionRef.current = buildRegionContext(shippingAddress);
  }, [shippingAddress]);

  useEffect(() => {
    const page = resolvePageName(location.pathname);
    const previousPage = pageRef.current;
    pageRef.current = page;

    if (previousPage && previousPage !== page) {
      flushOnPageLeave({ page: previousPage, region: regionRef.current });
    }

    resetPageEngagement();
    trackPageView({ page, region: regionRef.current });

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushOnPageLeave({ page: pageRef.current, region: regionRef.current });
      }
    };

    const onBeforeUnload = () => {
      flushOnPageLeave({ page: pageRef.current, region: regionRef.current });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onBeforeUnload);
      flushOnPageLeave({ page: pageRef.current, region: regionRef.current });
    };
  }, [location.pathname, location.search]);
}
