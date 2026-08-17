import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import ROUTES from "../../helpers/routesHelper";
import { PRODUCTS } from "../../helpers/urlHelper";
import { apiDelete, apiGet } from "../../helpers/apiHelper";
import {
  amountConversion,
  buildProductDetailUrl,
  getProductDedupeKey,
  getProductImageUrl,
  mergeUniqueProducts,
  normalizeHomeCatalogProducts,
} from "../../helpers/commonHelper";
import { apiGetCartList } from "../../store/cart/actions";
import useCartProductKeys from "../../hooks/useCartProductKeys";
import placeholder from "../../assets/images/default_name.webp";
import UXSkeleton from "../Common/UXSkeleton";
import InCartBadge from "../Common/InCartBadge";
import SupplierVerificationBadge from "../Products/SupplierVerificationBadge";
import TranslatedProductName from "../Common/TranslatedProductName";
import useFrenchTranslationPrefetch from "../../hooks/useFrenchTranslationPrefetch";
import HomeHorizontalScrollRow from "./HomeHorizontalScrollRow";

function rowSkeletonSlotCount(viewportWidth) {
  const w = viewportWidth || 1200;
  const card = Math.min(204, Math.max(158, w * 0.38));
  const gap = 14;
  const visible = Math.ceil(w / (card + gap));
  return Math.min(16, Math.max(4, visible + 1));
}

const isTestProduct = (item) => {
  const name = (item?.name || "").toLowerCase().trim();
  return !name || name.includes("test");
};

function cartProductsFromList(cartList) {
  const products = [];
  (Array.isArray(cartList) ? cartList : []).forEach((cart) => {
    const product = cart?.product;
    if (!product || isTestProduct(product)) return;
    products.push(product);
  });
  return products;
}

/** Combined cart + recently viewed row: "Hey {name}, still looking for these?" */
export default function RecentlyViewedProducts() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isLogin = useSelector((s) => s.auth.isLogin);
  const user = useSelector((s) => s.auth.profile || s.auth.user);
  const userId = useSelector((s) => s.auth.user?._id || s.auth.user?.id || "");
  const cartCount = useSelector((s) => s.cart.count);
  const cartList = useSelector((s) => s.cart.cartList);
  const isCartLoading = useSelector((s) => s.cart.isLoading);
  const { currentCurrency } = useSelector((s) => s.config);
  const appConfig = useSelector((s) => s.config.data);
  const { isInCart } = useCartProductKeys();

  const [recentItems, setRecentItems] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [skeletonSlots, setSkeletonSlots] = useState(() =>
    typeof window !== "undefined" ? rowSkeletonSlotCount(window.innerWidth) : 8
  );

  const fetchLimit = useMemo(
    () => Math.min(16, Math.max(6, skeletonSlots)),
    [skeletonSlots]
  );

  const cartProducts = useMemo(() => cartProductsFromList(cartList), [cartList]);

  const displayItems = useMemo(() => {
    const cartFirst = mergeUniqueProducts([], cartProducts);
    const recent = normalizeHomeCatalogProducts(recentItems).filter((item) => !isTestProduct(item));
    return mergeUniqueProducts(cartFirst, recent).slice(0, fetchLimit);
  }, [cartProducts, recentItems, fetchLimit]);

  useFrenchTranslationPrefetch(displayItems);

  useEffect(() => {
    if (!isLogin) return;
    if (Number(cartCount) <= 0 && !cartList?.length) return;
    if (cartList?.length) return;
    dispatch(apiGetCartList({}));
  }, [isLogin, cartCount, cartList?.length, dispatch]);

  const loadRecentlyViewed = useCallback(async (signal) => {
    setIsLoadingRecent(true);
    try {
      const res = await apiGet(PRODUCTS.RECOMMENDATIONS.RECENTLY_VIEWED, {
        limit: fetchLimit,
        suppressGlobalErrorToast: true,
        signal,
      });
      if (signal?.aborted) return;
      if (res?.status === "success") {
        const batch = Array.isArray(res.data?.items) ? res.data.items : [];
        setRecentItems(batch);
      } else {
        setRecentItems([]);
      }
    } catch (e) {
      if (signal?.aborted || e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
      setRecentItems([]);
    } finally {
      if (!signal?.aborted) setIsLoadingRecent(false);
    }
  }, [fetchLimit]);

  useEffect(() => {
    const onResize = () => setSkeletonSlots(rowSkeletonSlotCount(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isLogin || !userId) {
      setRecentItems([]);
      return undefined;
    }
    const ac = new AbortController();
    void loadRecentlyViewed(ac.signal);
    return () => ac.abort();
  }, [isLogin, userId, loadRecentlyViewed]);

  const handleClearHistory = useCallback(async () => {
    if (!isLogin || !userId || isClearing) return;
    setIsClearing(true);
    try {
      await apiDelete(PRODUCTS.RECOMMENDATIONS.RECENTLY_VIEWED, {
        suppressGlobalErrorToast: true,
      });
      setRecentItems([]);
    } catch {
      /* ignore */
    } finally {
      setIsClearing(false);
    }
  }, [isLogin, userId, isClearing]);

  if (!isLogin || !userId) return null;

  const showRowSkeleton =
    (isLoadingRecent || isCartLoading)
    && !displayItems.length
    && (Number(cartCount) > 0 || isLoadingRecent);

  if (!showRowSkeleton && !displayItems.length) return null;

  const firstName =
    String(user?.hintName || user?.name || user?.email || "")
      .trim()
      .split(/[\s@]+/)[0]
      .toUpperCase() || t("nav.account").toUpperCase();

  const hasCartProducts = cartProducts.length > 0;

  return (
    <div className="home_feed_section_offset home_recently_viewed_section home_continue_looking_section px-3 w-100">
      <section
        className="home_new_arrivals_panel home_recently_viewed_panel home_continue_looking_panel"
        aria-labelledby="home-continue-looking-title"
        aria-busy={showRowSkeleton || isClearing}
      >
        <div className="home_new_arrivals_panel__head home_recently_viewed_panel__head">
          <div className="home_recently_viewed_panel__titles">
            <h2 id="home-continue-looking-title" className="home_new_arrivals_panel__title">
              {t("home.cartReminderTitle", { name: firstName })}
            </h2>
          </div>
          {hasCartProducts ? (
            <Link to={ROUTES.CART} className="home_cart_reminder_cta">
              {t("home.cartReminderCta")}
            </Link>
          ) : (
            <button
              type="button"
              className="home_recently_viewed_clear_btn"
              onClick={handleClearHistory}
              disabled={isClearing || isLoadingRecent}
            >
              {t("home.clearRecentlyViewed")}
            </button>
          )}
        </div>

        {showRowSkeleton ? (
          <div className="home_new_arrivals_panel__skeleton">
            <UXSkeleton count={skeletonSlots} />
          </div>
        ) : (
          <HomeHorizontalScrollRow
            className="home_new_arrivals_row home_recently_viewed_row"
            depKey={displayItems.map((item) => getProductDedupeKey(item)).join("|")}
          >
            {displayItems.map((item, idx) => {
              const productLink = buildProductDetailUrl(item) || ROUTES.PRODUCT_LISTING;
              const inCart = isInCart(item);
              return (
                <Link
                  key={item?._id || item?.id || idx}
                  to={productLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="new_arrival_img new_arrival_product_card home_recently_viewed_card text-start text-decoration-none d-block text-reset"
                >
                  <div className="new_arrival_media">
                    {inCart ? <InCartBadge product={item} /> : (
                      <span className="home_recently_viewed_badge">{t("home.recentBadge")}</span>
                    )}
                    <img
                      src={getProductImageUrl(item, placeholder)}
                      alt={item?.name || "Product"}
                      className="img-fluid"
                      loading="lazy"
                    />
                  </div>
                  <div className="home_product_card_body px-1 pt-2">
                    <TranslatedProductName product={item} className="home_product_title mb-1" as="p" />
                    <p className="home_product_price mb-1">
                      {currentCurrency?.symbol} {amountConversion(item?.price, appConfig)}
                    </p>
                    <div className="home_product_footer">
                      <SupplierVerificationBadge item={item} />
                      <span className="home_product_cta">
                        {inCart ? t("home.cartReminderContinue") : t("home.viewDetails")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </HomeHorizontalScrollRow>
        )}
      </section>
    </div>
  );
}
