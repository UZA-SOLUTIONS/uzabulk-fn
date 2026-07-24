import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Container } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import AbortController from "abort-controller";

import BrowseCategoryStrip from "../../Components/Products/BrowseCategoryStrip";
import ProductsListingInfinite from "../../Components/Products/ProductsListingInfinite";
import ImageScanningPanel from "../../Components/Products/ImageScanningPanel";
import { resolveImageSearchPreviewSource, clearImageSearchPreview } from "../../helpers/imageSearchHelper";
import { APP_NAME } from "../../config/constants";
import { balanceCatalogProducts, smoothScrollToTop } from "../../helpers/commonHelper";
import { trackFilterEngagement, trackSearchEngagement } from "../../helpers/browsingBehaviorHelper";
import ROUTES from "../../helpers/routesHelper";
import { useCategoryStripPin } from "../../hooks/useCategoryStripPin";
import { apiGetCategories } from "../../store/categories/actions";
import { apiGetProductDetail, apiGetProducts } from "../../store/products/actions";
import { clearProductList } from "../../store/products/slice";
import { PRODUCTS } from "../../helpers/urlHelper";
import useCategoryDisplayName from "../../hooks/useCategoryDisplayName";
import useCategoryDisplayNames from "../../hooks/useCategoryDisplayNames";
import useFrenchTranslationPrefetch from "../../hooks/useFrenchTranslationPrefetch";

const Productlist = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const isCategoriesHub = location.pathname === ROUTES.CATEGORIES;
  const level1Categories = useSelector((s) => s.categories.categories.level1 || []);
  const level2Categories = useSelector((s) => s.categories.categories.level2 || []);
  const { detail } = useSelector((s) => s.products.productDetail);
  const { isLoading, items, hasMore, message, skip, others } = useSelector((s) => s.products.products);
  const cancelToken = useRef(null);
  const fetchLockRef = useRef(false);

  const limit = 32;
  const searchQuery = searchParams.get("search") || "";
  const imageQuery = searchParams.get("image") || "";
  const selectedSort = searchParams.get("sort")
    || (searchQuery || imageQuery ? "relevance" : "newest");
  const selectedCategory = searchParams.get("category") || "";

  const categoriesAll = useMemo(() => {
    const base = (level1Categories?.length ? level1Categories : level2Categories) || [];
    return base.filter((c) => c?._id && (c?.catName || c?.name));
  }, [level1Categories, level2Categories]);

  const categoryDisplayNames = useCategoryDisplayNames(categoriesAll);
  const selectedCategoryDisplayName = useCategoryDisplayName(others?.category);

  const categoryTabs = useMemo(
    () => [
      { id: "", label: t("nav.allProducts") },
      ...categoriesAll.map((c) => ({
        id: String(c._id),
        label: categoryDisplayNames[String(c._id)] || (c.catName || c.name || t("home.categoryFallback")).trim(),
      })),
    ],
    [categoriesAll, categoryDisplayNames, t]
  );

  const searchMeta = others?.searchMeta || {};
  const effectiveSearchLabel =
    searchMeta?.searchQuery
    || searchMeta?.primary
    || searchMeta?.correctedQuery
    || searchQuery;

  const recommendations = balanceCatalogProducts(others?.recommendations || []);
  const moreLikeThis = balanceCatalogProducts(others?.moreLikeThis || []);
  const moreLikeThisSource = others?.moreLikeThisSource || null;
  const isFirstResultsPage = Number(searchParams.get("skip") || 1) <= 1;
  const showMoreLikeThis = isFirstResultsPage && (searchQuery || imageQuery) && moreLikeThis.length > 0;
  const showRecommendations = isFirstResultsPage && (searchQuery || imageQuery) && recommendations.length > 0;
  const moreLikeThisTitle = moreLikeThisSource?.name
    ? `More like "${moreLikeThisSource.name}"`
    : "More like this";

  const pageTitle = useMemo(() => {
    if (imageQuery || others?.imageSearch) {
      const mode = others?.imageSearchMode || "";
      const label = others?.imageSearchLabel
        || others?.imageSearchTopMatch
        || others?.imageSearchKeyword
        || others?.imageSearchPhrase
        || searchQuery;
      if (mode === "visual" || mode === "visual+keyword") {
        return label
          ? t("search.visualMatchTitle", { name: label })
          : t("search.visualMatchResults");
      }
      return label ? t("search.imageSearchTitleWithTerm", { term: label }) : t("search.imageSearchResults");
    }
    if (searchQuery) {
      return `Search: ${effectiveSearchLabel || searchQuery}`;
    }
    if (selectedCategory) {
      return categoryDisplayNames[selectedCategory]
        || selectedCategoryDisplayName
        || searchParams.get("name")
        || t("home.categoryFallback");
    }
    if (others?.category?.catName || others?.category?.name) return selectedCategoryDisplayName;
    if (searchParams.get("name")) return searchParams.get("name");
    return isCategoriesHub ? t("nav.allCategories") : t("nav.allProducts");
  }, [imageQuery, searchQuery, effectiveSearchLabel, others?.imageSearchMode, others?.imageSearchLabel, others?.imageSearchTopMatch, others?.imageSearchKeyword, others?.imageSearchPhrase, others?.category, selectedCategory, selectedCategoryDisplayName, categoryDisplayNames, searchParams, isCategoriesHub, t]);

  const imageSearchLabel = others?.imageSearchLabel
    || others?.imageSearchTopMatch
    || others?.imageSearchKeyword
    || others?.imageSearchPhrase
    || searchQuery;
  const isImageSearchSession = Boolean(imageQuery || others?.imageSearch);
  const searchedImageSrc = resolveImageSearchPreviewSource(imageQuery);

  const { catstripNavRef } = useCategoryStripPin({
    enabled: categoryTabs.length > 0 && !searchQuery && !imageQuery,
  });

  const getSortQuery = (sortValue) => {
    switch (sortValue) {
      case "relevance":
        return { orderBy: "relevance", order: -1 };
      case "newest":
        return { orderBy: "date_created_utc", order: -1 };
      case "oldest":
        return { orderBy: "date_created_utc", order: 1 };
      case "price_low_high":
        return { orderBy: "price", order: 1 };
      case "price_high_low":
        return { orderBy: "price", order: -1 };
      case "name_az":
        return { orderBy: "name.keyword", order: 1 };
      case "name_za":
        return { orderBy: "name.keyword", order: -1 };
      case "rating_high_low":
        return { orderBy: "average_rating", order: -1 };
      default:
        return {};
    }
  };

  const sortedItems = useMemo(() => {
    const source = [...(items || [])];
    switch (selectedSort) {
      case "newest":
        return source.sort((a, b) => new Date(b?.date_created_utc || 0) - new Date(a?.date_created_utc || 0));
      case "oldest":
        return source.sort((a, b) => new Date(a?.date_created_utc || 0) - new Date(b?.date_created_utc || 0));
      case "price_low_high":
        return source.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
      case "price_high_low":
        return source.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
      case "name_az":
        return source.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
      case "name_za":
        return source.sort((a, b) => String(b?.name || "").localeCompare(String(a?.name || "")));
      case "rating_high_low":
        return source.sort((a, b) => Number(b?.average_rating || 0) - Number(a?.average_rating || 0));
      default:
        return source;
    }
  }, [items, selectedSort]);

  const displayItems = useMemo(() => {
    if (filteredItemsNeedDetail()) {
      return sortedItems?.length <= limit && detail
        ? [detail, ...sortedItems.filter((i) => i._id !== detail._id)]
        : sortedItems;
    }
    return sortedItems;

    function filteredItemsNeedDetail() {
      const topIds = searchParams.get("topIds");
      return Boolean(topIds && sortedItems?.length <= limit);
    }
  }, [sortedItems, detail, limit, searchParams]);

  const allProductsForTranslation = useMemo(
    () => [...(displayItems || []), ...(moreLikeThis || []), ...(recommendations || [])],
    [displayItems, moreLikeThis, recommendations]
  );
  useFrenchTranslationPrefetch(allProductsForTranslation, categoriesAll);

  useEffect(() => {
    if (!level1Categories?.length) dispatch(apiGetCategories({ level: 1 }));
  }, [dispatch, level1Categories?.length]);

  useEffect(() => {
    if (!imageQuery && !others?.imageSearch) {
      clearImageSearchPreview();
    }
  }, [imageQuery, others?.imageSearch]);

  useEffect(() => {
    if (level1Categories?.length || !level2Categories?.length) return;
    dispatch(apiGetCategories({ level: 2 }));
  }, [dispatch, level1Categories?.length, level2Categories?.length]);

  const fetchProducts = (init = false, pageSkip = null) => {
    if (cancelToken.current) cancelToken.current.abort();
    cancelToken.current = new AbortController();
    const searchTerm = searchParams.get("search") || "";
    const imageTerm = searchParams.get("image") || "";
    // Image-only sessions: ignore leftover typed `search` unless the user also submitted text.
    const useSearchWithImage = Boolean(searchTerm) && searchParams.get("mixSearch") === "1";
    const effectiveSearch = imageTerm && !useSearchWithImage ? "" : searchTerm;
    const query = {
      limit,
      skip: pageSkip ?? (init ? 1 : skip + 1),
      category: searchParams.get("category")
        ? String(searchParams.get("category"))
        : undefined,
      search: effectiveSearch || undefined,
      image: imageTerm || undefined,
      country: searchParams.get("country") || "en",
      suppressGlobalErrorToast: true,
      ...getSortQuery(selectedSort || (effectiveSearch || imageTerm ? "relevance" : "newest")),
    };
    dispatch(
      apiGetProducts({
        query,
        signal: cancelToken.current.signal,
      })
    );
  };

  useEffect(() => {
    if (!isLoading) fetchLockRef.current = false;
  }, [isLoading]);

  const handleFetchRequest = useCallback(
    (init = false) => {
      if (fetchLockRef.current) return;
      if (!init && (!hasMore || isLoading)) return;
      fetchLockRef.current = true;
      fetchProducts(init);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchProducts reads latest searchParams/skip
    [hasMore, isLoading, searchParams.toString(), skip]
  );

  useEffect(() => {
    smoothScrollToTop();
    // Keep prior cards while the new image/text search loads to avoid a blank flash.
    dispatch(clearProductList({ field: "products", keepItems: true }));
    fetchProducts(true, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when URL filters change
  }, [searchParams.toString()]);

  useEffect(() => {
    const page = "product_list";
    if (searchQuery || imageQuery) {
      trackSearchEngagement({
        search: searchQuery || imageQuery,
        page,
        filters: {
          sort: selectedSort,
          category: selectedCategory,
          imageSearch: Boolean(imageQuery),
        },
      });
      return;
    }
    if (selectedCategory || (selectedSort && selectedSort !== "newest")) {
      trackFilterEngagement({
        page,
        category: selectedCategory,
        filters: {
          sort: selectedSort,
          categoryName: searchParams.get("name") || "",
        },
      });
    }
  }, [searchQuery, imageQuery, selectedCategory, selectedSort, searchParams]);

  useEffect(() => {
    const topIds = searchParams.get("topIds");
    if (topIds) dispatch(apiGetProductDetail({ id: topIds }));
  }, [dispatch, searchParams]);

  const buildCategoryHref = (tab) => {
    const base =
      isCategoriesHub && !tab.id ? ROUTES.CATEGORIES : ROUTES.PRODUCT_LISTING;
    const params = new URLSearchParams();
    if (tab.id) {
      params.set("category", tab.id);
      params.set("name", tab.label);
    }
    if (selectedSort && selectedSort !== "relevance") params.set("sort", selectedSort);
    if (searchQuery) params.set("search", searchQuery);
    params.set("skip", "1");
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const showCategoryStrip = categoryTabs.length > 0 && !searchQuery && !imageQuery;

  return (
    <div className="wrapList products_list_browse">
      <Helmet>
        <title>{APP_NAME} | {pageTitle}</title>
      </Helmet>
      <Container fluid className="products_list_browse__container px-3">
        {others?.category?.catImage ? (
          <div className="products_list_browse__hero mb-3">
            <img src={others.category.catImage} alt="" />
            <h1 className="products_list_category_title">{selectedCategoryDisplayName}</h1>
          </div>
        ) : null}

        <div className="home_discover_browse_outer products_list_browse__outer">
          {isImageSearchSession ? (
            <header className="products_list_image_search_header mb-2">
              {searchedImageSrc ? (
                <div
                  className="products_list_image_search_banner products_list_image_search_banner--with-image"
                  data-testid="image-search-results-preview"
                >
                  <figure
                    className={`products_list_image_search_query${isLoading ? " is-loading" : ""}`}
                    aria-label={isLoading ? t("search.scanningImage") : "Image you searched for"}
                    aria-busy={isLoading || undefined}
                  >
                    <img
                      src={searchedImageSrc}
                      alt={imageSearchLabel ? t("search.visualMatchTitle", { name: imageSearchLabel }) : t("search.imageSearchResults")}
                      className="products_list_image_search_query__img"
                      decoding="async"
                    />
                    {isLoading ? (
                      <div className="products_list_image_search_query__overlay" aria-live="polite">
                        <span className="products_list_image_search_query__scan-line" aria-hidden />
                        <span className="products_list_image_search_query__spinner" aria-hidden />
                        <span className="visually-hidden">{t("search.scanningImage")}</span>
                      </div>
                    ) : null}
                  </figure>
                </div>
              ) : isLoading ? (
                <ImageScanningPanel imageUrl={searchedImageSrc} compact />
              ) : null}
              <h1 className="products_list_browse__page_title products_list_image_search_header__title">
                {isLoading && !imageSearchLabel ? t("search.scanningImage") : pageTitle}
              </h1>
            </header>
          ) : !isCategoriesHub ? (
            <h1 className="products_list_browse__page_title">{pageTitle}</h1>
          ) : (
            <h1 className="visually-hidden">{pageTitle}</h1>
          )}
          {showCategoryStrip ? (
            <BrowseCategoryStrip
              tabs={categoryTabs}
              activeTabId={selectedCategory}
              navRef={catstripNavRef}
              getTabTo={buildCategoryHref}
              ariaLabel="Filter products by category"
              tablistId="products-list-category-tablist"
            />
          ) : null}

          <section className="home_discover_browse home_discover_browse--flat" aria-label={pageTitle}>
            <div className="home_discover_browse__body products_list_browse__grid">
              <ProductsListingInfinite
                items={displayItems}
                isLoading={isLoading}
                message={message}
                hasMore={hasMore}
                fetchRecords={handleFetchRequest}
                gridClassName="home_discover_browse__product_grid"
                showVisualMatch={isImageSearchSession}
                emptyMessage={
                  isImageSearchSession
                    ? t("search.imageSearchNoMatches")
                    : undefined
                }
              />
            </div>
          </section>

          {showMoreLikeThis ? (
            <section className="home_discover_browse home_discover_browse--flat mt-4" aria-label={moreLikeThisTitle}>
              <h2 className="products_list_browse__page_title h5 mb-1">{moreLikeThisTitle}</h2>
              <p className="text-muted small mb-3">Similar wholesale items from our catalog</p>
              <div className="home_discover_browse__body products_list_browse__grid">
                <ProductsListingInfinite
                  items={moreLikeThis}
                  isLoading={false}
                  message=""
                  hasMore={false}
                  fetchRecords={() => {}}
                  gridClassName="home_discover_browse__product_grid"
                />
              </div>
            </section>
          ) : null}

          {showRecommendations ? (
            <section className="home_discover_browse home_discover_browse--flat mt-4" aria-label="Recommended for your search">
              <h2 className="products_list_browse__page_title h5 mb-3">You may also like</h2>
              <div className="home_discover_browse__body products_list_browse__grid">
                <ProductsListingInfinite
                  items={recommendations}
                  isLoading={false}
                  message=""
                  hasMore={false}
                  fetchRecords={() => {}}
                  gridClassName="home_discover_browse__product_grid"
                />
              </div>
            </section>
          ) : null}

        </div>
      </Container>
    </div>
  );
};

export default Productlist;
