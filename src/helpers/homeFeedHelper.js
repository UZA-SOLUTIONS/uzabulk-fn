const HOME_FEED_REFRESH_KEY = "uza-home-feed-refresh";
let pageLoadFeedToken = null;

/** New token each app load / home visit so product pools rotate. */
export const bumpHomeFeedRefreshToken = () => {
  pageLoadFeedToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(HOME_FEED_REFRESH_KEY, pageLoadFeedToken);
  }
  return pageLoadFeedToken;
};

export const getHomeFeedRefreshToken = () => {
  if (pageLoadFeedToken) return pageLoadFeedToken;
  if (typeof sessionStorage !== "undefined") {
    const stored = sessionStorage.getItem(HOME_FEED_REFRESH_KEY);
    if (stored) {
      pageLoadFeedToken = stored;
      return pageLoadFeedToken;
    }
  }
  return bumpHomeFeedRefreshToken();
};
