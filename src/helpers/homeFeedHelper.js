const HOME_FEED_REFRESH_KEY = "uza-home-feed-refresh";
let pageLoadFeedToken = null;

const utcDayKey = () => new Date().toISOString().slice(0, 10);

const tokenMatchesToday = (token = "") => String(token).startsWith(`${utcDayKey()}:`);

/** Force a new rotation token (browser reload, new day, or explicit refresh). */
export const bumpHomeFeedRefreshToken = () => {
  pageLoadFeedToken = `${utcDayKey()}:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(HOME_FEED_REFRESH_KEY, pageLoadFeedToken);
  }
  return pageLoadFeedToken;
};

/** Stable token for the current tab session — reused when navigating back to home. */
export const getHomeFeedRefreshToken = () => {
  if (pageLoadFeedToken && tokenMatchesToday(pageLoadFeedToken)) return pageLoadFeedToken;
  if (typeof sessionStorage !== "undefined") {
    const stored = sessionStorage.getItem(HOME_FEED_REFRESH_KEY);
    if (stored && tokenMatchesToday(stored)) {
      pageLoadFeedToken = stored;
      return pageLoadFeedToken;
    }
  }
  return bumpHomeFeedRefreshToken();
};

/** Rotate home feeds only on full page reload, not SPA route changes. */
export const bumpHomeFeedRefreshTokenOnReload = () => {
  if (typeof window === "undefined") return getHomeFeedRefreshToken();
  const nav = performance.getEntriesByType?.("navigation")?.[0];
  if (nav?.type === "reload") {
    return bumpHomeFeedRefreshToken();
  }
  return getHomeFeedRefreshToken();
};
