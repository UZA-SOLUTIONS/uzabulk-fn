import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { apiGetRecommendedProducts } from "../../store/products/actions";

const HOME_RECOMMENDED_LIMIT = 100;

/**
 * Loads personalized `/products/recommended` once at app start so every home section
 * (Best deals, New arrivals, etc.) can merge the same pool without racing the first paint.
 */
export default function PrefetchHomeRecommended() {
  const dispatch = useDispatch();
  const { items, isLoading } = useSelector((s) => s.products.homeRecommendedProducts);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (items?.length) {
      attemptedRef.current = true;
      return;
    }
    if (isLoading) return;
    attemptedRef.current = true;
    dispatch(
      apiGetRecommendedProducts({
        limit: HOME_RECOMMENDED_LIMIT,
        refresh: Date.now(),
        suppressGlobalErrorToast: true,
      })
    );
  }, [dispatch, items?.length, isLoading]);

  return null;
}
