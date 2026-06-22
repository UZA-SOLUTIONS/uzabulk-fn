import apiClient from "./apiHelper";
import { PRODUCTS } from "./urlHelper";
import ROUTES from "./routesHelper";

const FLUSH_DELAY_MS = 1200;
const MAX_QUEUE = 24;

let eventQueue = [];
let flushTimer = null;
let pageEnteredAt = Date.now();
let maxScrollDepth = 0;
let scrollListenerAttached = false;

export const resolvePageName = (pathname = "") => {
  const path = String(pathname || "").split("?")[0];
  if (path === ROUTES.HOME || path === "/") return "home";
  if (path === ROUTES.PRODUCT_LISTING || path === ROUTES.CATEGORIES) return "product_list";
  if (path.startsWith(ROUTES.PRODUCT_DETAIL)) return "product_detail";
  if (path === ROUTES.CART) return "cart";
  if (path === ROUTES.CHECKOUT) return "checkout";
  if (path === ROUTES.NEW_ARRIVALS_PRODUCT_LISTING) return "new_arrivals";
  if (path === ROUTES.TOP_RANKING_PRODUCT_LISTING) return "top_ranking";
  return path.replace(/^\//, "").replace(/\//g, "_") || "unknown";
};

export const getScrollDepthPercent = () => {
  if (typeof document === "undefined") return 0;
  const doc = document.documentElement;
  const scrollTop = window.scrollY || doc.scrollTop || 0;
  const viewport = window.innerHeight || doc.clientHeight || 0;
  const fullHeight = Math.max(doc.scrollHeight || 0, viewport);
  if (fullHeight <= viewport) return 100;
  return Math.min(100, Math.round(((scrollTop + viewport) / fullHeight) * 100));
};

const attachScrollListener = () => {
  if (scrollListenerAttached || typeof window === "undefined") return;
  scrollListenerAttached = true;
  const onScroll = () => {
    maxScrollDepth = Math.max(maxScrollDepth, getScrollDepthPercent());
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
};

export const resetPageEngagement = () => {
  pageEnteredAt = Date.now();
  maxScrollDepth = 0;
  attachScrollListener();
};

export const buildRegionContext = (shippingAddress) => ({
  country: shippingAddress?.country || shippingAddress?.countryName || "",
  city: shippingAddress?.city || shippingAddress?.town || "",
});

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushBrowsingEvents();
  }, FLUSH_DELAY_MS);
};

export const trackBrowsingEvent = (payload = {}) => {
  if (typeof window === "undefined") return;
  const entry = {
    ...payload,
    scrollDepth: payload.scrollDepth ?? maxScrollDepth,
  };
  eventQueue.push(entry);
  if (eventQueue.length > MAX_QUEUE) {
    eventQueue = eventQueue.slice(-MAX_QUEUE);
  }
  scheduleFlush();
};

export const flushBrowsingEvents = async () => {
  if (!eventQueue.length) return;
  const batch = eventQueue.splice(0, eventQueue.length);
  await Promise.allSettled(
    batch.map((event) =>
      apiClient.post(PRODUCTS.RECOMMENDATIONS.EVENTS, event, {
        suppressGlobalErrorToast: true,
      })
    )
  );
};

export const trackPageView = ({ page, region = {}, extra = {} } = {}) => {
  trackBrowsingEvent({
    eventType: "page_view",
    page,
    ...region,
    ...extra,
  });
};

export const trackProductView = ({ productId, page = "product_detail", category = "", region = {} } = {}) => {
  if (!productId) return;
  trackBrowsingEvent({
    eventType: "view",
    productId,
    page,
    category,
    ...region,
  });
};

export const trackSearchEngagement = ({ search = "", page = "product_list", filters = {}, region = {} } = {}) => {
  trackBrowsingEvent({
    eventType: "search",
    search,
    page,
    filters,
    ...region,
  });
};

export const trackFilterEngagement = ({ page = "", filters = {}, category = "", region = {} } = {}) => {
  trackBrowsingEvent({
    eventType: "filter",
    page,
    filters,
    category,
    ...region,
  });
};

export const trackPageDwell = ({ page, region = {}, extra = {} } = {}) => {
  const dwellTimeMs = Math.max(0, Date.now() - pageEnteredAt);
  if (dwellTimeMs < 500) return;
  trackBrowsingEvent({
    eventType: "dwell",
    page,
    dwellTimeMs,
    scrollDepth: maxScrollDepth,
    ...region,
    ...extra,
  });
};

export const flushOnPageLeave = ({ page, region = {}, extra = {} } = {}) => {
  trackPageDwell({ page, region, extra });
  return flushBrowsingEvents();
};
