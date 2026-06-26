import { mergeUniqueProducts } from "./commonHelper";

const STORAGE_PREFIX = "uzabulk_fetch_cache_v1:";
const DEFAULT_TTL_MS = 30 * 60 * 1000;
const LIST_TTL_MS = 25 * 60 * 1000;
const DETAIL_TTL_MS = 45 * 60 * 1000;
const MEMORY_MAX_ENTRIES = 60;
const SESSION_MAX_LIST_PAGES = 12;

const memory = new Map();

const IGNORE_QUERY_KEYS = new Set([
  "signal",
  "skipCache",
  "revalidate",
  "suppressGlobalErrorToast",
]);

function isBrowser() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function stableSerialize(value) {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${key}:${stableSerialize(value[key])}`).join(",")}}`;
  }
  return String(value);
}

export function buildFetchCacheKey(url, params = {}) {
  const normalized = {};
  Object.entries(params || {}).forEach(([key, value]) => {
    if (IGNORE_QUERY_KEYS.has(key)) return;
    if (value === undefined || value === null || value === "") return;
    normalized[key] = value;
  });
  return `${String(url || "").trim()}?${stableSerialize(normalized)}`;
}

export function buildListCacheKey(url, params = {}) {
  const { skip, refresh, homeBrowse, ...rest } = params || {};
  const base = buildFetchCacheKey(url, rest);
  const rotationKey = refresh || (homeBrowse ? "home-browse" : "");
  if (!rotationKey) return base;
  return `${base}::rf:${rotationKey}`;
}

function pruneMemory() {
  if (memory.size <= MEMORY_MAX_ENTRIES) return;
  const oldest = memory.keys().next().value;
  if (oldest) memory.delete(oldest);
}

function readSession(key) {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSession(key, value) {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    /* quota exceeded — memory cache still works */
  }
}

function isExpired(entry, ttlMs = DEFAULT_TTL_MS) {
  if (!entry?.fetchedAt) return true;
  return Date.now() - entry.fetchedAt > ttlMs;
}

export function getFetchCacheEntry(key, { ttlMs = DEFAULT_TTL_MS } = {}) {
  const fromMemory = memory.get(key);
  if (fromMemory && !isExpired(fromMemory, ttlMs)) return fromMemory.data;

  const fromSession = readSession(key);
  if (fromSession && !isExpired(fromSession, ttlMs)) {
    memory.set(key, fromSession);
    return fromSession.data;
  }
  return null;
}

export function setFetchCacheEntry(key, data, { ttlMs = DEFAULT_TTL_MS } = {}) {
  const entry = { data, fetchedAt: Date.now(), ttlMs };
  pruneMemory();
  memory.set(key, entry);
  writeSession(key, entry);
}

export function isFetchCacheStale(key, maxAgeMs = 5 * 60 * 1000) {
  const entry = memory.get(key) || readSession(key);
  if (!entry?.fetchedAt) return true;
  return Date.now() - entry.fetchedAt > maxAgeMs;
}

function getListSession(listKey) {
  const cached = getFetchCacheEntry(`list:${listKey}`, { ttlMs: LIST_TTL_MS });
  return cached || null;
}

function saveListSession(listKey, session) {
  setFetchCacheEntry(`list:${listKey}`, session, { ttlMs: LIST_TTL_MS });
}

export function getCachedListPage(listKey, skip) {
  const session = getListSession(listKey);
  if (!session) return null;
  return session.pages?.[String(skip)] || null;
}

export function getListSessionSnapshot(listKey) {
  const session = getListSession(listKey);
  if (!session?.mergedItems?.length) return null;
  return {
    items: session.mergedItems,
    hasMore: session.hasMore ?? true,
    skip: session.lastSkip || 1,
    others: session.others || null,
    fetchedPages: Object.keys(session.pages || {}).map(Number).filter(Number.isFinite),
  };
}

export function hasCachedListPage(listKey, skip) {
  return Boolean(getCachedListPage(listKey, skip));
}

export function saveListPage(listKey, skip, pageData = {}) {
  const pageSkip = Number(pageData.skip ?? skip) || Number(skip) || 1;
  const pageItems = Array.isArray(pageData.items) ? pageData.items : [];
  const pageKey = String(pageSkip);

  let session = getListSession(listKey) || {
    pages: {},
    mergedItems: [],
    lastSkip: pageSkip,
    hasMore: true,
    others: null,
  };

  session.pages[pageKey] = {
    items: pageItems,
    skip: pageSkip,
    hasMore: pageData.hasMore,
    others: pageData.others ?? null,
    limit: pageData.limit,
    total: pageData.total,
    fetchedAt: Date.now(),
  };

  const pageKeys = Object.keys(session.pages)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (pageKeys.length > SESSION_MAX_LIST_PAGES) {
    const drop = pageKeys.slice(0, pageKeys.length - SESSION_MAX_LIST_PAGES);
    drop.forEach((key) => delete session.pages[String(key)]);
  }

  session.mergedItems = pageKeys.reduce((acc, key) => {
    const batch = session.pages[String(key)]?.items || [];
    return mergeUniqueProducts(acc, batch);
  }, []);

  session.lastSkip = Math.max(session.lastSkip || 1, pageSkip);
  session.hasMore = typeof pageData.hasMore === "boolean" ? pageData.hasMore : session.hasMore;
  if (pageSkip === 1 && pageData.others) {
    session.others = pageData.others;
  }

  saveListSession(listKey, session);
  return session;
}

export function saveListSnapshot(listKey, { items = [], hasMore = true, skip = 1, others = null } = {}) {
  if (!listKey || !items?.length) return;
  const session = getListSession(listKey) || {
    pages: {},
    mergedItems: [],
    lastSkip: skip,
    hasMore,
    others,
  };
  session.mergedItems = items;
  session.lastSkip = skip;
  session.hasMore = hasMore;
  if (others) session.others = others;
  saveListSession(listKey, session);
}

export function savePageScroll(listKey, scrollY) {
  if (!isBrowser() || !listKey) return;
  try {
    const y = Number(scrollY);
    if (!Number.isFinite(y)) return;
    sessionStorage.setItem(`${STORAGE_PREFIX}scroll:${listKey}`, String(Math.max(0, y)));
  } catch {
    /* ignore */
  }
}

export function restorePageScroll(listKey) {
  if (!isBrowser() || !listKey) return;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}scroll:${listKey}`);
    const y = Number(raw);
    if (!Number.isFinite(y)) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: "auto" });
    });
  } catch {
    /* ignore */
  }
}

export function getProductDetailCache(productId) {
  const key = `detail:${String(productId || "").trim()}`;
  if (!key || key === "detail:") return null;
  return getFetchCacheEntry(key, { ttlMs: DETAIL_TTL_MS });
}

export function setProductDetailCache(productId, payload) {
  const key = `detail:${String(productId || "").trim()}`;
  if (!key || key === "detail:" || !payload) return;
  setFetchCacheEntry(key, payload, { ttlMs: DETAIL_TTL_MS });
}
