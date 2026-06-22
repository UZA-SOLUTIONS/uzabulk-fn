import { useEffect } from "react";
import { useSelector } from "react-redux";

import {
  buildRegionContext,
  flushOnPageLeave,
  trackProductView,
} from "../helpers/browsingBehaviorHelper";

/**
 * Records product detail views + dwell time for behavioral recommendations.
 */
export default function useProductViewTracker(productId, { category = "", page = "product_detail" } = {}) {
  const shippingAddress = useSelector((s) => s.address.shippingAddress.detail);

  useEffect(() => {
    if (!productId) return undefined;

    const region = buildRegionContext(shippingAddress);
    trackProductView({ productId, page, category, region });

    return () => {
      flushOnPageLeave({
        page,
        region,
        extra: { productId, category },
      });
    };
    // category is attached to dwell payload only; avoid duplicate view events on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, page, shippingAddress]);
}
