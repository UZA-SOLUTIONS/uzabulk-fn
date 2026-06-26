import ROUTES from "./routesHelper";
import { SEO_LOCALES, SITE_URL } from "../config/seoConfig";

export const getSiteBaseUrl = () => {
  if (SITE_URL) return SITE_URL;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "";
};

export const normalizePath = (pathname = "/") => {
  const path = String(pathname || "/").trim() || "/";
  if (path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
};

export const buildLocalizedUrl = (pathname, lang, { baseUrl = getSiteBaseUrl(), search = "" } = {}) => {
  const path = normalizePath(pathname);
  const url = new URL(path, `${baseUrl}/`);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("lang");
  if (lang === "fr") {
    params.set("lang", "fr");
  } else {
    params.set("lang", "en");
  }
  const query = params.toString();
  return query ? `${url.origin}${url.pathname}?${query}` : `${url.origin}${url.pathname}`;
};

export const buildHreflangLinks = (pathname, search = "") => (
  SEO_LOCALES.map((locale) => ({
    hreflang: locale.hreflang,
    href: buildLocalizedUrl(pathname, locale.code, { search }),
  }))
);

export const resolveRouteSeoKey = (pathname = "/") => {
  const path = normalizePath(pathname);
  const rules = [
    { test: (p) => p.startsWith(ROUTES.PRODUCT_DETAIL), key: "productDetail" },
    { test: (p) => p.startsWith(ROUTES.NEW_ARRIVALS_PRODUCT_LISTING), key: "newArrivals" },
    { test: (p) => p.startsWith(ROUTES.TOP_RANKING_PRODUCT_LISTING), key: "topRanking" },
    { test: (p) => p.startsWith(ROUTES.BEST_DEAL_PRODUCT_LISTING), key: "bestDeals" },
    { test: (p) => p.startsWith(ROUTES.SAVING_SPOTLIGHT_PRODUCT_LISTING), key: "savingSpotlight" },
    { test: (p) => p.startsWith(ROUTES.PRODUCT_LISTING), key: "products" },
    { test: (p) => p.startsWith(ROUTES.CATEGORIES), key: "categories" },
    { test: (p) => p.startsWith(ROUTES.BLOG), key: "blog" },
    { test: (p) => p.startsWith(ROUTES.ABOUT_US), key: "aboutUs" },
    { test: (p) => p.startsWith(ROUTES.CONTACT_US), key: "contactUs" },
    { test: (p) => p.startsWith(ROUTES.PRIVACY_POLICY), key: "privacyPolicy" },
    { test: (p) => p.startsWith(ROUTES.T_AND_C), key: "terms" },
    { test: (p) => p.startsWith(ROUTES.CART), key: "cart", noindex: true },
    { test: (p) => p.startsWith(ROUTES.CHECKOUT), key: "checkout", noindex: true },
    { test: (p) => p.startsWith(ROUTES.PROFILE), key: "profile", noindex: true },
    { test: (p) => p.startsWith(ROUTES.MY_ORDERS), key: "myOrders", noindex: true },
    { test: (p) => p.startsWith(ROUTES.ORDER_DETAIL), key: "orderDetail", noindex: true },
    { test: (p) => p.startsWith(ROUTES.ORDER_ADDRESS), key: "addresses", noindex: true },
    { test: (p) => p.startsWith(ROUTES.CHANGE_PASSWORD), key: "changePassword", noindex: true },
    { test: (p) => p.startsWith(ROUTES.FORGOT), key: "forgotPassword", noindex: true },
    { test: (p) => p === ROUTES.HOME, key: "home" },
  ];

  return rules.find((rule) => rule.test(path)) || { key: "home", noindex: false };
};

export const buildProductJsonLd = ({
  name,
  description,
  image,
  url,
  price,
  currency = "RWF",
  inStock = true,
  sku,
}) => {
  if (!name || !url) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description || name,
    image: image || undefined,
    url,
    sku: sku || undefined,
    brand: {
      "@type": "Brand",
      name: "UZA Store",
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: currency,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "UZA Store",
      },
    },
  };

  if (Number.isFinite(Number(price)) && Number(price) > 0) {
    schema.offers.price = String(price);
  }

  return schema;
};

export const stripHtml = (value = "") => String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export const truncateMeta = (value = "", max = 160) => {
  const text = stripHtml(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
};

export const resolveAbsoluteImage = (value, baseUrl = getSiteBaseUrl()) => {
  const raw = typeof value === "string" ? value : value?.link || value?.url || value?.src;
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${baseUrl}${path}`;
};
