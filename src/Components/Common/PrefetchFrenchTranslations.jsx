import { useEffect } from "react";
import { useSelector } from "react-redux";
import { prefetchFrenchTranslations } from "../../helpers/productNameTranslationHelper";
import { prefetchBilingualProductDetailTranslations } from "../../helpers/productDetailTranslationHelper";

function collectProductItems(state) {
  const products = state?.products || {};
  const slices = [
    products.products?.items,
    products.newArrivalProducts?.items,
    products.topRankingProducts?.items,
    products.savingSpotlightProducts?.items,
    products.guaranteedProducts?.items,
    products.bestSalerProducts?.items,
    products.homeProducts?.items,
    products.homeRecommendedProducts?.items,
    products.homeTopRankingProducts?.items,
    products.homeNewArrivalProducts?.items,
    products.homeSavingSpotlightProducts?.items,
    products.homeGuaranteedProducts?.items,
    products.homeBestSalerProducts?.items,
  ];

  const seen = new Set();
  const items = [];

  const push = (product) => {
    if (!product?.name) return;
    const key = String(product?._id || product?.id || product?.offerId || product.name);
    if (seen.has(key)) return;
    seen.add(key);
    items.push(product);
  };

  slices.forEach((list) => {
    (list || []).forEach(push);
  });

  if (products.productDetail?.detail) {
    push(products.productDetail.detail);
  }

  (state?.cart?.cart?.items || []).forEach((row) => {
    if (row?.product) push(row.product);
  });

  return items;
}

function collectCategories(state) {
  const categories = state?.categories?.categories || {};
  return [
    ...(categories.level1 || []),
    ...(categories.level2 || []),
    ...(categories.level3 || []),
  ];
}

/**
 * Prefetch French translations in the background while the UI is EN or FR,
 * so switching to French can use cached names/details immediately.
 */
export default function PrefetchFrenchTranslations() {
  const productsState = useSelector((s) => s.products);
  const categoriesState = useSelector((s) => s.categories);
  const cartState = useSelector((s) => s.cart);

  useEffect(() => {
    const products = collectProductItems({
      products: productsState,
      cart: cartState,
    });
    const categories = collectCategories({ categories: categoriesState });
    const detail = productsState?.productDetail?.detail;

    if (!products.length && !categories.length && !detail) return;

    void prefetchFrenchTranslations({ products, categories });

    if (detail) {
      void prefetchBilingualProductDetailTranslations(detail);
    }
  }, [productsState, categoriesState, cartState]);

  return null;
}
