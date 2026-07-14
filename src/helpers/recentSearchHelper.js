const STORAGE_KEY = "uzabulk_recent_searches_v1";
const MAX_RECENT = 8;

function normalizeTerm(value = "") {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function getRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeTerm(typeof item === "string" ? item : item?.search || item?.term || ""))
      .filter(Boolean)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberRecentSearch(term) {
  const next = normalizeTerm(term);
  if (!next || next.length < 2) return getRecentSearches();
  if (typeof window === "undefined") return [];

  const existing = getRecentSearches().filter(
    (item) => item.toLowerCase() !== next.toLowerCase()
  );
  const updated = [next, ...existing].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("uzabulk:recent-searches", { detail: updated }));
  } catch {
    /* ignore quota */
  }
  return updated;
}

/** Merge local recent searches with API frequently-searched terms (local first). */
export function mergeSearchPlaceholderTerms(localTerms = [], apiTerms = []) {
  const seen = new Set();
  const out = [];
  const push = (value) => {
    const term = normalizeTerm(value);
    if (!term) return;
    const key = term.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(term);
  };

  (localTerms || []).forEach(push);
  (apiTerms || []).forEach((item) => {
    if (typeof item === "string") push(item);
    else push(item?.search || item?.term || item?.query || "");
  });

  return out.slice(0, MAX_RECENT);
}
