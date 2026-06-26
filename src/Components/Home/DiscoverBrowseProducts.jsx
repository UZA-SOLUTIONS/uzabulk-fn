import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import BrowseCategoryStrip from "../Products/BrowseCategoryStrip";
import ProductsListingInfinite from "../Products/ProductsListingInfinite";
import UXSkeleton from "../Common/UXSkeleton";
import { useCategoryStripPin } from "../../hooks/useCategoryStripPin";
import { apiGet } from "../../helpers/apiHelper";
import {
  buildListCacheKey,
  getCachedListPage,
  getListSessionSnapshot,
  hasCachedListPage,
  restorePageScroll,
  saveListPage,
  saveListSnapshot,
  savePageScroll,
} from "../../helpers/fetchCacheHelper";
import {
  getHomeFeedRefreshToken,
  getProductDedupeKey,
  mergeUniqueProducts,
  normalizeHomeCatalogProducts,
} from "../../helpers/commonHelper";
import { trackFilterEngagement } from "../../helpers/browsingBehaviorHelper";
import ROUTES from "../../helpers/routesHelper";
import { PRODUCTS } from "../../helpers/urlHelper";
import { apiGetCategories } from "../../store/categories/actions";
import useCategoryDisplayNames from "../../hooks/useCategoryDisplayNames";
import useFrenchTranslationPrefetch from "../../hooks/useFrenchTranslationPrefetch";

const PAGE_LIMIT_CATEGORY = 24;
const ALL_PRODUCTS_CHUNK = 24;

function categoryLabel(category) {
  return (category?.catName || category?.name || "").trim();
}

function listingLink(categoryId, categoryName) {
  if (!categoryId) return ROUTES.PRODUCT_LISTING;
  const name = categoryName ? `&name=${encodeURIComponent(categoryName)}` : "";
  return `${ROUTES.PRODUCT_LISTING}?category=${encodeURIComponent(categoryId)}${name}`;
}

function buildDiscoverCacheKey(categoryId, feedRefreshToken) {
  return buildListCacheKey(PRODUCTS.LIST, {
    limit: categoryId ? PAGE_LIMIT_CATEGORY : ALL_PRODUCTS_CHUNK,
    category: categoryId || undefined,
    refresh: categoryId ? undefined : feedRefreshToken,
    homeBrowse: categoryId ? undefined : true,
  });
}

export default function DiscoverBrowseProducts() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const level1 = useSelector((s) => s.categories.categories.level1 || []);
  const level2 = useSelector((s) => s.categories.categories.level2 || []);
  const newArrivalItems = useSelector((s) => s.products.homeNewArrivalProducts?.items || []);

  const categoriesAll = useMemo(() => {
    const base = (level1?.length ? level1 : level2) || [];
    return base.filter((c) => c?._id && categoryLabel(c));
  }, [level1, level2]);

  const categoryDisplayNames = useCategoryDisplayNames(categoriesAll);

  const tabs = useMemo(
    () => [
      { id: "", label: t("nav.allProducts") },
      ...categoriesAll.map((c) => ({
        id: String(c._id),
        label: categoryDisplayNames[String(c._id)] || categoryLabel(c),
      })),
    ],
    [categoriesAll, categoryDisplayNames, t]
  );

  const [feedRefresh] = useState(() => getHomeFeedRefreshToken());

  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [message, setMessage] = useState("");
  const nextSkipRef = useRef(1);
  const inFlightRef = useRef(false);
  const abortRef = useRef(null);
  const loadGenRef = useRef(0);
  const newArrivalExcludeKeysRef = useRef(null);
  const activeCategoryRef = useRef(activeCategoryId);
  activeCategoryRef.current = activeCategoryId;

  const activeFilterLabel = useMemo(() => {
    if (!activeCategoryId) return t("nav.allProducts");
    return categoryDisplayNames[activeCategoryId] || categoryLabel(
      categoriesAll.find((c) => String(c._id) === String(activeCategoryId))
    ) || t("home.categoryFallback");
  }, [activeCategoryId, categoriesAll, categoryDisplayNames, t]);

  useFrenchTranslationPrefetch(items, categoriesAll);

  const {
    catstripSentinelRef,
    catstripNavRef,
    catstripPinned,
    catstripSpacerHeight,
  } = useCategoryStripPin({ enabled: tabs.length > 0, bodyClass: "home-catstrip-pinned" });

  const listCacheKey = useMemo(
    () => buildDiscoverCacheKey(activeCategoryId, feedRefresh),
    [activeCategoryId, feedRefresh]
  );

  const browseStateRef = useRef({ items: [], hasMore: true, skip: 1, listKey: listCacheKey });
  browseStateRef.current = {
    items,
    hasMore,
    skip: nextSkipRef.current,
    listKey: listCacheKey,
  };

  useLayoutEffect(() => {
    const snapshot = getListSessionSnapshot(listCacheKey);
    if (snapshot?.items?.length) {
      setItems(snapshot.items);
      setHasMore(snapshot.hasMore);
      nextSkipRef.current = snapshot.skip;
      setInitialLoad(false);
      setIsLoading(false);
      restorePageScroll(listCacheKey);
    }
  }, [listCacheKey]);

  useEffect(() => {
    if (!listCacheKey || !items.length) return;
    saveListSnapshot(listCacheKey, {
      items,
      hasMore,
      skip: nextSkipRef.current,
    });
  }, [items, hasMore, listCacheKey]);

  useEffect(() => {
    const cacheKeyAtMount = listCacheKey;
    return () => {
      const { items: cachedItems, hasMore: cachedHasMore, skip } = browseStateRef.current;
      if (cacheKeyAtMount && cachedItems?.length) {
        saveListSnapshot(cacheKeyAtMount, {
          items: cachedItems,
          hasMore: cachedHasMore,
          skip,
        });
      }
      if (cacheKeyAtMount) savePageScroll(cacheKeyAtMount, window.scrollY);
    };
  }, [listCacheKey]);

  const newArrivalExcludeKeys = useMemo(() => {
    if (activeCategoryId) return null;
    const keys = new Set();
    newArrivalItems.forEach((item) => {
      const key = getProductDedupeKey(item);
      if (key) keys.add(key);
    });
    return keys.size ? keys : null;
  }, [activeCategoryId, newArrivalItems]);

  newArrivalExcludeKeysRef.current = newArrivalExcludeKeys;

  useEffect(() => {
    if (activeCategoryId || !newArrivalExcludeKeys?.size) return;
    setItems((prev) => {
      if (!prev?.length) return prev;
      const filtered = normalizeHomeCatalogProducts(prev, { excludeKeys: newArrivalExcludeKeys });
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [activeCategoryId, newArrivalExcludeKeys]);

  const sanitizeBatch = useCallback((batch) => {
    const excludeKeys = newArrivalExcludeKeysRef.current;
    const cleaned = normalizeHomeCatalogProducts(batch, { excludeKeys });
    if (cleaned.length > 0 || !excludeKeys?.size) {
      return cleaned;
    }
    return normalizeHomeCatalogProducts(batch);
  }, []);

  useEffect(() => {
    inFlightRef.current = false;
    if (activeCategoryId) {
      trackFilterEngagement({
        page: "home",
        category: activeCategoryId,
        filters: { section: "discover_browse" },
      });
    }
  }, [activeCategoryId]);

  useEffect(() => {
    if (level1?.length) return;
    dispatch(apiGetCategories({ level: 1 }));
  }, [dispatch, level1?.length]);

  useEffect(() => {
    if (level1?.length || !level2?.length) return;
    dispatch(apiGetCategories({ level: 2 }));
  }, [dispatch, level1?.length, level2?.length]);

  const loadPage = useCallback(async (skip, categoryId, signal) => {
    const pageLimit = categoryId ? PAGE_LIMIT_CATEGORY : ALL_PRODUCTS_CHUNK;
    const query = {
      limit: pageLimit,
      skip,
      suppressGlobalErrorToast: true,
      ...(signal ? { signal } : {}),
    };
    if (categoryId) {
      query.category = String(categoryId);
    } else {
      query.refresh = feedRefresh;
      query.homeBrowse = true;
    }

    const cacheKey = buildDiscoverCacheKey(categoryId, feedRefresh);
    if (hasCachedListPage(cacheKey, skip)) {
      const cached = getCachedListPage(cacheKey, skip);
      return {
        batch: cached.items || [],
        hasMore: cached.hasMore ?? true,
        skip: Number(cached.skip ?? skip) || skip,
        fromCache: true,
      };
    }

    const res = await apiGet(PRODUCTS.LIST, query);
    if (signal?.aborted) return null;
    if (!res || res.status !== "success") {
      throw new Error(res?.message || "Could not load products.");
    }
    const data = res.data || {};
    saveListPage(cacheKey, skip, data);
    const batch = Array.isArray(data.items) ? data.items : [];
    const has =
      typeof data.hasMore === "boolean"
        ? data.hasMore
        : batch.length >= pageLimit;
    return { batch, hasMore: has, skip: Number(data.skip ?? skip) || skip };
  }, [feedRefresh]);

  const loadPageRef = useRef(loadPage);
  loadPageRef.current = loadPage;

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const generation = loadGenRef.current + 1;
    loadGenRef.current = generation;
    const isActive = () => loadGenRef.current === generation && !ac.signal.aborted;

    (async () => {
      const snapshot = getListSessionSnapshot(listCacheKey);
      const hasCachedList = Boolean(snapshot?.items?.length);

      if (hasCachedList) {
        setItems(snapshot.items);
        nextSkipRef.current = snapshot.skip;
        setHasMore(snapshot.hasMore);
        setInitialLoad(false);
        setIsLoading(false);
        return;
      } else {
        setInitialLoad(true);
        setIsLoading(true);
        setMessage("");
        nextSkipRef.current = 1;
        setItems([]);
        setHasMore(true);
      }

      try {
        const first = await loadPageRef.current(1, activeCategoryId, ac.signal);
        if (!isActive()) return;
        if (first) {
          const firstItems = sanitizeBatch(first.batch);
          nextSkipRef.current = first.skip;
          setHasMore(first.hasMore);
          setItems(firstItems);
          if (!firstItems.length && !first.hasMore) {
            setMessage("No products found.");
          }
        } else {
          setItems([]);
          setHasMore(false);
        }
      } catch (e) {
        if (!isActive()) return;
        if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
        if (!hasCachedList) {
          setItems([]);
          setHasMore(false);
          setMessage(e?.message || "Could not load products.");
        }
      } finally {
        if (isActive()) {
          setIsLoading(false);
          setInitialLoad(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [activeCategoryId, feedRefresh, listCacheKey, sanitizeBatch]);

  const fetchRecords = useCallback(async () => {
    if (inFlightRef.current || !hasMore) return;
    const categorySnapshot = activeCategoryRef.current;
    inFlightRef.current = true;
    setIsLoading(true);
    try {
      let pageSkip = nextSkipRef.current + 1;
      let merged = [];
      let has = true;
      let lastSkip = pageSkip;
      let attempts = 0;

      while (merged.length < 1 && has && attempts < 8) {
        const result = await loadPage(pageSkip, categorySnapshot, null);
        if (!result) return;
        if (categorySnapshot !== activeCategoryRef.current) return;
        lastSkip = result.skip;
        has = result.hasMore;
        const sanitized = sanitizeBatch(result.batch);
        if (sanitized.length) {
          merged = mergeUniqueProducts(merged, sanitized);
        }
        pageSkip = lastSkip + 1;
        attempts += 1;
        if (!result.batch.length && !has) break;
      }

      nextSkipRef.current = lastSkip;
      setHasMore(has);
      if (merged.length) {
        setItems((prev) => mergeUniqueProducts(prev, merged));
      }
    } catch (e) {
      if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
      setHasMore(false);
      setMessage(e?.message || "Could not load more.");
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  }, [hasMore, loadPage, sanitizeBatch]);

  const selectTab = useCallback((tabId) => {
    setActiveCategoryId(tabId ? String(tabId) : "");
  }, []);

  const selectTabIndex = useCallback(
    (nextIndex) => {
      if (!tabs.length) return;
      const len = tabs.length;
      const idx = ((nextIndex % len) + len) % len;
      const nextId = tabs[idx].id;
      setActiveCategoryId(nextId);
      requestAnimationFrame(() => {
        const btn = document.getElementById(`browse-tab-${nextId || "all"}`);
        btn?.focus();
        btn?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
      });
    },
    [tabs]
  );

  const handleTablistKeyDown = useCallback(
    (e) => {
      if (!tabs.length) return;
      const root = document.getElementById("home-discover-category-tablist");
      if (!root) return;
      const buttons = [...root.querySelectorAll('[role="tab"]')];
      let i = buttons.indexOf(document.activeElement);
      if (i < 0) i = tabs.findIndex((t) => t.id === activeCategoryId);
      if (i < 0) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        selectTabIndex(i + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        selectTabIndex(i - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        selectTabIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        selectTabIndex(tabs.length - 1);
      }
    },
    [activeCategoryId, selectTabIndex, tabs]
  );

  return (
    <div className="home_discover_browse_outer home_feed_section_offset px-3 w-100">
      <h2 id="home-discover-browse-title" className="visually-hidden">
        All products — filter by category
      </h2>

      <div ref={catstripSentinelRef} className="home_discover_catstrip_sentinel" aria-hidden="true" />
      {catstripSpacerHeight > 0 ? (
        <div className="home_discover_catstrip_spacer" style={{ height: catstripSpacerHeight }} aria-hidden />
      ) : null}
      <BrowseCategoryStrip
        tabs={tabs}
        activeTabId={activeCategoryId}
        navRef={catstripNavRef}
        isPinned={catstripPinned}
        onTabClick={selectTab}
        onTabKeyDown={handleTablistKeyDown}
        ariaLabel="Filter all products by category"
        tablistId="home-discover-category-tablist"
      />

      <section className="home_discover_browse home_discover_browse--flat" aria-labelledby="home-discover-browse-title">
        <div className="home_discover_browse__card_head">
          <p
            id="home-discover-browse-status"
            className="home_discover_browse__filter_status visually-hidden"
            aria-live="polite"
          >
            Showing: {activeFilterLabel}
          </p>
          <Link
            className="home_discover_browse__see_all"
            to={listingLink(activeCategoryId, activeFilterLabel !== t("nav.allProducts") ? activeFilterLabel : "")}
          >
            See all <span aria-hidden>&gt;</span>
          </Link>
        </div>

        <div
          id="home-discover-browse-panel"
          className="home_discover_browse__body"
          role="tabpanel"
          aria-labelledby="home-discover-browse-title"
        >
          {initialLoad ? (
            <div className="home_discover_browse__skeleton" aria-busy="true">
              <UXSkeleton count={8} />
            </div>
          ) : (
            <ProductsListingInfinite
              items={items}
              isLoading={isLoading}
              message={message}
              hasMore={hasMore}
              fetchRecords={fetchRecords}
              gridClassName="home_discover_browse__product_grid"
            />
          )}
        </div>
      </section>
    </div>
  );
}
