import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import ROUTES from "../../helpers/routesHelper";
import { getHomeFeedRefreshToken } from "../../helpers/commonHelper";
import {
  applyCategoryThumbnailBatch,
  fetchCategoryRepresentativeImage,
  fetchCategoryThumbnailsBatch,
  isCategoryThumbnailsBatchInFlight,
  resolveCategoryIconUrl,
  rotateHomeCategories,
} from "../../helpers/homeCategoryFeedHelper";
import { getCachedCategoryThumbnails } from "../../helpers/homeCategoryThumbnailsSessionCache";
import { hydratePersistedCategoryImages } from "../../helpers/homeCategoryImagePersistCache";
import { getCachedCategoriesByLevel } from "../../helpers/categoriesSessionCache";
import { apiGetCategories } from "../../store/categories/actions";
import {
  clearHomeCategoryCircleImage,
  getHomeCategoryCircleImage,
  setHomeCategoryCircleImage,
  subscribeHomeCategoryCircleImages,
} from "../../helpers/homeCategoryCircleImageCache";
import useCategoryDisplayName from "../../hooks/useCategoryDisplayName";
import UXSkeleton from "../Common/UXSkeleton";

const MAX_CATEGORIES = 16;
const IMAGE_FETCH_CONCURRENCY = 2;
const SKELETON_CARD_COUNT = 6;
/** Slow continuous auto-slide speed (px/sec). */
const AUTO_SLIDE_PX_PER_SEC = 34;
const AUTO_RESUME_MS = 1800;

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

function SourceCategoryCard({ category, imageUrl, onImageError, priority = false }) {
  const { t } = useTranslation();
  const id = String(category?._id || "");
  const displayName = useCategoryDisplayName(category) || t("home.categoryFallback");
  const fallbackIcon = resolveCategoryIconUrl(category);
  const [displaySrc, setDisplaySrc] = useState(() => imageUrl || fallbackIcon || "");
  const to = `${ROUTES.PRODUCT_LISTING}?skip=1&category=${encodeURIComponent(id)}&name=${encodeURIComponent(displayName)}`;
  const [imgReady, setImgReady] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    setDisplaySrc(imageUrl || fallbackIcon || "");
  }, [imageUrl, fallbackIcon]);

  useEffect(() => {
    if (!displaySrc) {
      setImgReady(false);
      return;
    }
    if (displaySrc === fallbackIcon && fallbackIcon) {
      setImgReady(true);
      return;
    }
    setImgReady(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setImgReady(true);
    }
  }, [displaySrc, fallbackIcon]);

  return (
    <Link to={to} className="home_source_category_card">
      <div className="home_source_category_card__head">
        <span className="home_source_category_card__name">{displayName}</span>
        <span className="home_source_category_card__explore">{t("home.explore")}</span>
      </div>
      <div className="home_source_category_card__image">
        {!imgReady && displaySrc ? (
          <span className="home_source_category_card__img_placeholder shimmer" aria-hidden />
        ) : null}
        {displaySrc ? (
          <img
            ref={imgRef}
            src={displaySrc}
            alt={displayName}
            decoding="async"
            loading={priority ? "eager" : "lazy"}
            fetchpriority={priority ? "high" : "auto"}
            onLoad={() => setImgReady(true)}
            onError={() => {
              if (displaySrc !== fallbackIcon && fallbackIcon) {
                setDisplaySrc(fallbackIcon);
                setImgReady(true);
                return;
              }
              setImgReady(false);
              onImageError?.(category);
            }}
            style={{ opacity: imgReady ? 1 : 0 }}
          />
        ) : (
          <span className="home_source_category_card__img_placeholder shimmer" aria-hidden />
        )}
      </div>
    </Link>
  );
}

export default function SourceByCategory() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const level1Categories = useSelector((s) => s.categories.categories.level1 || []);
  const level2Categories = useSelector((s) => s.categories.categories.level2 || []);
  const categoriesLoading = useSelector((s) => s.categories.categories.isLoading);
  const cachedLevel1 = useMemo(() => getCachedCategoriesByLevel(1) || [], []);
  const cachedLevel2 = useMemo(() => getCachedCategoriesByLevel(2) || [], []);
  const resolvedLevel1 = level1Categories.length ? level1Categories : cachedLevel1;
  const resolvedLevel2 = level2Categories.length ? level2Categories : cachedLevel2;
  const [feedRefresh, setFeedRefresh] = useState(() => getHomeFeedRefreshToken());
  const [imageTick, setImageTick] = useState(0);
  const trackRef = useRef(null);
  const marqueeRef = useRef(null);
  const [canPrev, setCanPrev] = useState(true);
  const [canNext, setCanNext] = useState(true);
  const autoPausedRef = useRef(false);
  const resumeTimerRef = useRef(0);
  const slideOffsetRef = useRef(0);
  const halfWidthRef = useRef(0);

  useEffect(() => {
    if (!resolvedLevel1?.length) {
      dispatch(apiGetCategories({ level: 1 }));
    }
  }, [dispatch, resolvedLevel1?.length]);

  useEffect(() => {
    if (resolvedLevel1?.length || !resolvedLevel2?.length) return;
    dispatch(apiGetCategories({ level: 2 }));
  }, [dispatch, resolvedLevel1?.length, resolvedLevel2?.length]);

  const categoriesToShow = useMemo(() => {
    const base = (resolvedLevel1?.length ? resolvedLevel1 : resolvedLevel2) || [];
    return rotateHomeCategories(base, feedRefresh, MAX_CATEGORIES);
  }, [resolvedLevel1, resolvedLevel2, feedRefresh]);

  const categoryIdsKey = useMemo(
    () => `${feedRefresh}:${categoriesToShow.map((c) => c?._id).filter(Boolean).join(",")}`,
    [categoriesToShow, feedRefresh]
  );

  const categoriesToShowRef = useRef(categoriesToShow);
  categoriesToShowRef.current = categoriesToShow;
  const feedRefreshRef = useRef(feedRefresh);
  feedRefreshRef.current = feedRefresh;
  const pendingFetchRef = useRef(new Set());

  useEffect(() => {
    pendingFetchRef.current = new Set();
  }, [categoryIdsKey]);

  const resolveImageUrl = useCallback(
    (category) => {
      const id = String(category?._id || "").trim();
      if (!id) return "";
      return getHomeCategoryCircleImage(id, feedRefresh) || resolveCategoryIconUrl(category) || "";
    },
    [feedRefresh, imageTick]
  );

  const requestCategoryImage = useCallback(async (category) => {
    const id = String(category?._id || "").trim();
    if (!id || pendingFetchRef.current.has(id)) return;
    const refresh = feedRefreshRef.current;
    if (getHomeCategoryCircleImage(id, refresh)) return;

    pendingFetchRef.current.add(id);
    try {
      const imageUrl = await fetchCategoryRepresentativeImage(category, refresh);
      if (imageUrl) setHomeCategoryCircleImage(id, imageUrl, refresh);
    } finally {
      pendingFetchRef.current.delete(id);
      setImageTick((tick) => tick + 1);
    }
  }, []);

  const handleImageError = useCallback(
    (category) => {
      const id = String(category?._id || "").trim();
      if (!id) return;
      clearHomeCategoryCircleImage(id, feedRefreshRef.current);
      const iconUrl = resolveCategoryIconUrl(category);
      if (iconUrl) setHomeCategoryCircleImage(id, iconUrl, feedRefreshRef.current);
      setImageTick((tick) => tick + 1);
    },
    []
  );

  useEffect(() => {
    return subscribeHomeCategoryCircleImages(() => {
      setImageTick((tick) => tick + 1);
    });
  }, []);

  useEffect(() => {
    const refresh = feedRefreshRef.current;
    let seeded = false;

    categoriesToShow.forEach((category) => {
      const id = String(category?._id || "").trim();
      if (!id || getHomeCategoryCircleImage(id, refresh)) return;
      const iconUrl = resolveCategoryIconUrl(category);
      if (iconUrl) {
        setHomeCategoryCircleImage(id, iconUrl, refresh);
        seeded = true;
      }
    });

    if (seeded) setImageTick((t) => t + 1);
  }, [categoryIdsKey, categoriesToShow]);

  useEffect(() => {
    if (!categoryIdsKey) return undefined;
    let cancelled = false;

    const prefetchMissing = async () => {
      const cats = categoriesToShowRef.current;
      const refresh = feedRefreshRef.current;
      if (!cats.length) return;

      const ids = cats.map((c) => String(c?._id || "").trim()).filter(Boolean);
      if (hydratePersistedCategoryImages(refresh, ids)) {
        setImageTick((t) => t + 1);
      }

      const cachedBatch = getCachedCategoryThumbnails(ids, refresh);
      if (cachedBatch) {
        applyCategoryThumbnailBatch(cachedBatch, refresh);
        setImageTick((t) => t + 1);
      } else {
        void fetchCategoryThumbnailsBatch(cats, refresh)
          .then((batch) => {
            if (cancelled) return;
            if (applyCategoryThumbnailBatch(batch, refresh)) {
              setImageTick((t) => t + 1);
            }
          })
          .finally(() => {
            if (cancelled) return;
            const missingAfterBatch = cats.filter((c) => {
              const id = String(c._id);
              return id && !getHomeCategoryCircleImage(id, refresh);
            });
            if (!missingAfterBatch.length) return;
            void (async () => {
              for (let i = 0; i < missingAfterBatch.length; i += IMAGE_FETCH_CONCURRENCY) {
                if (cancelled) break;
                const chunk = missingAfterBatch.slice(i, i + IMAGE_FETCH_CONCURRENCY);
                await Promise.all(chunk.map((category) => requestCategoryImage(category)));
              }
            })();
          });
      }

      const stillMissing = cats.filter((c) => {
        const id = String(c._id);
        return id && !getHomeCategoryCircleImage(id, refresh);
      });

      if (!stillMissing.length || isCategoryThumbnailsBatchInFlight()) return;

      for (let i = 0; i < stillMissing.length; i += IMAGE_FETCH_CONCURRENCY) {
        if (cancelled) break;
        const chunk = stillMissing.slice(i, i + IMAGE_FETCH_CONCURRENCY);
        await Promise.all(chunk.map((category) => requestCategoryImage(category)));
      }
    };

    void prefetchMissing();

    return () => {
      cancelled = true;
    };
  }, [categoryIdsKey, requestCategoryImage]);

  const syncArrows = useCallback(() => {
    const track = trackRef.current;
    const marquee = marqueeRef.current;
    if (!track || !marquee) return;
    const canScroll = marquee.scrollWidth > track.clientWidth + 4;
    setCanPrev(canScroll);
    setCanNext(canScroll);
    halfWidthRef.current = marquee.scrollWidth / 2;
  }, []);

  const pauseAutoSlide = useCallback((resumeAfterMs = AUTO_RESUME_MS) => {
    autoPausedRef.current = true;
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = 0;
    }
    if (resumeAfterMs > 0) {
      resumeTimerRef.current = window.setTimeout(() => {
        autoPausedRef.current = false;
        resumeTimerRef.current = 0;
      }, resumeAfterMs);
    }
  }, []);

  const applyMarqueeOffset = useCallback((offset) => {
    const marquee = marqueeRef.current;
    if (!marquee) return;
    const half = halfWidthRef.current || marquee.scrollWidth / 2;
    let next = offset;
    if (half > 0) {
      while (next >= half) next -= half;
      while (next < 0) next += half;
    }
    slideOffsetRef.current = next;
    marquee.style.transform = `translate3d(${-next}px, 0, 0)`;
  }, []);

  const scrollByDir = useCallback((dir) => {
    pauseAutoSlide();
    const step = Math.max(240, Math.floor((trackRef.current?.clientWidth || 320) * 0.65));
    applyMarqueeOffset(slideOffsetRef.current + (dir === "next" ? step : -step));
  }, [pauseAutoSlide, applyMarqueeOffset]);

  useEffect(() => {
    const track = trackRef.current;
    const marquee = marqueeRef.current;
    if (!track || !marquee) return undefined;
    syncArrows();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncArrows) : null;
    ro?.observe(track);
    ro?.observe(marquee);
    return () => ro?.disconnect();
  }, [syncArrows, categoriesToShow.length, imageTick, categoryIdsKey]);

  // Infinite slow auto-slide via transform (more reliable than scrollLeft).
  useEffect(() => {
    const track = trackRef.current;
    const marquee = marqueeRef.current;
    if (!track || !marquee || categoriesToShow.length < 2) return undefined;

    const prefersReduced =
      typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced) return undefined;

    slideOffsetRef.current = 0;
    marquee.style.transform = "translate3d(0, 0, 0)";
    syncArrows();

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      if (autoPausedRef.current || document.hidden) return;

      const half = halfWidthRef.current || marquee.scrollWidth / 2;
      if (!(half > track.clientWidth + 4)) return;
      halfWidthRef.current = half;

      applyMarqueeOffset(slideOffsetRef.current + AUTO_SLIDE_PX_PER_SEC * dt);
    };

    rafId = requestAnimationFrame(tick);

    const onPointerEnter = () => pauseAutoSlide(0);
    const onPointerLeave = () => pauseAutoSlide(AUTO_RESUME_MS);
    const onPointerDown = () => pauseAutoSlide();
    const onFocusIn = () => pauseAutoSlide(0);
    const onFocusOut = () => pauseAutoSlide(AUTO_RESUME_MS);
    const onVisibility = () => {
      if (document.hidden) autoPausedRef.current = true;
      else pauseAutoSlide(400);
    };

    track.addEventListener("pointerenter", onPointerEnter);
    track.addEventListener("pointerleave", onPointerLeave);
    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("focusin", onFocusIn);
    track.addEventListener("focusout", onFocusOut);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(rafId);
      if (resumeTimerRef.current) {
        window.clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = 0;
      }
      track.removeEventListener("pointerenter", onPointerEnter);
      track.removeEventListener("pointerleave", onPointerLeave);
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("focusin", onFocusIn);
      track.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [categoriesToShow.length, categoryIdsKey, pauseAutoSlide, applyMarqueeOffset, syncArrows]);

  const loopCategories = useMemo(() => {
    if (categoriesToShow.length < 2) return categoriesToShow;
    return [...categoriesToShow, ...categoriesToShow];
  }, [categoriesToShow]);

  const hasAnyCategories = (resolvedLevel1?.length || 0) > 0 || (resolvedLevel2?.length || 0) > 0;
  const waitingForCategories = categoriesLoading && !hasAnyCategories;

  if (waitingForCategories) {
    return (
      <section className="home_source_by_category py-3" aria-labelledby="home-source-by-category-title">
        <h2 id="home-source-by-category-title" className="home_source_by_category__title">
          {t("home.sourceByCategory")}
        </h2>
        <UXSkeleton type="source-by-category" count={SKELETON_CARD_COUNT} />
      </section>
    );
  }

  if (!hasAnyCategories) {
    return (
      <section className="home_source_by_category py-3" aria-labelledby="home-source-by-category-title">
        <h2 id="home-source-by-category-title" className="home_source_by_category__title">
          {t("home.sourceByCategory")}
        </h2>
        <p className="text-muted mb-0 small">
          {t("home.categoriesLoadError")}
        </p>
      </section>
    );
  }

  if (!categoriesToShow.length) {
    return (
      <section className="home_source_by_category py-3" aria-labelledby="home-source-by-category-title">
        <h2 id="home-source-by-category-title" className="home_source_by_category__title">
          {t("home.sourceByCategory")}
        </h2>
        <p className="text-muted mb-0 small">{t("home.noCategoriesAvailable")}</p>
      </section>
    );
  }

  return (
    <section className="home_source_by_category py-3" aria-labelledby="home-source-by-category-title">
      <h2 id="home-source-by-category-title" className="home_source_by_category__title">
        {t("home.categoriesForYou")}
      </h2>

      <div
        className="home_source_by_category__wrap"
        onPointerEnter={() => pauseAutoSlide(0)}
        onPointerLeave={() => pauseAutoSlide(AUTO_RESUME_MS)}
      >
        <button
          type="button"
          className="home_source_by_category__arrow home_source_by_category__arrow--prev"
          onClick={() => scrollByDir("prev")}
          disabled={!canPrev}
          aria-label={t("home.scrollCategoriesLeft")}
        >
          <Chevron dir="prev" />
        </button>
        <button
          type="button"
          className="home_source_by_category__arrow home_source_by_category__arrow--next"
          onClick={() => scrollByDir("next")}
          disabled={!canNext}
          aria-label={t("home.scrollCategoriesRight")}
        >
          <Chevron dir="next" />
        </button>

        <div
          ref={trackRef}
          className="home_source_by_category__track home_source_by_category__track--autoslide"
        >
          <div ref={marqueeRef} className="home_source_by_category__marquee">
            {loopCategories.map((category, index) => (
              <SourceCategoryCard
                key={`${String(category._id)}-${index < categoriesToShow.length ? "a" : "b"}`}
                category={category}
                imageUrl={resolveImageUrl(category)}
                onImageError={handleImageError}
                priority={index < 4}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
