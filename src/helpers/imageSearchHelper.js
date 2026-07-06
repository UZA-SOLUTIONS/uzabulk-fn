import apiClient from "./apiHelper";
import { PRODUCTS } from "./urlHelper";

const IMAGE_URL_RE = /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?|#|$)/i;

export const isImageUrl = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^data:image\//i.test(text) || /^blob:/i.test(text)) return true;

  try {
    const url = new URL(text, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (!/^https?:$/i.test(url.protocol)) return false;
    return (
      IMAGE_URL_RE.test(url.pathname)
      || IMAGE_URL_RE.test(text)
      || /alicdn\.com|alibaba\.com|1688\.com/i.test(url.hostname)
    );
  } catch {
    return false;
  }
};

/**
 * Read a copied browser image (bitmap) or copied image URL from a paste event.
 * Returns null when the clipboard does not contain an image.
 */
export const readImageFromClipboard = (event) => {
  const clipboard = event?.clipboardData;
  if (!clipboard) return null;

  const imageItem = Array.from(clipboard.items || []).find(
    (item) => item.kind === "file" && item.type?.startsWith("image/")
  );

  if (imageItem) {
    const blob = imageItem.getAsFile();
    if (!blob) return null;

    const ext = (imageItem.type.split("/")[1] || "png").replace("jpeg", "jpg");
    const file = blob.name
      ? blob
      : new File([blob], `pasted-image.${ext}`, { type: imageItem.type });

    return { type: "file", file };
  }

  const text = clipboard.getData("text/plain")?.trim();
  if (text && isImageUrl(text)) {
    return { type: "url", imageUrl: text };
  }

  return null;
};

/**
 * Upload image only (fast). Vision + catalog search runs once on the products list page.
 */
export const uploadImageSearch = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiClient.post(PRODUCTS.IMAGE_SEARCH, formData, {
    params: { prepare: 1 },
    headers: { "Content-Type": "multipart/form-data" },
    suppressGlobalErrorToast: true,
  });

  if (res?.status !== "success") {
    throw new Error(res?.message || "Image search failed");
  }

  return res.data || {};
};

/** Fast search-bar upload — stores image URL; catalog search runs on the listing page. */
export const uploadImageForSearchBar = async (file) => {
  const data = await uploadImageSearch(file);
  const imageUrl = data?.others?.imageUrl || data?.imageUrl || "";
  if (!imageUrl) {
    throw new Error("Image upload did not return a URL");
  }
  return imageUrl;
};

const IMAGE_SEARCH_PREVIEW_KEY = "uza_image_search_preview";
const IMAGE_SEARCH_BLOB_KEY = "uza_image_search_preview_blob";

export const persistImageSearchPreview = (url = "") => {
  const value = String(url || "").trim();
  if (!value || typeof sessionStorage === "undefined") return;
  if (!/^blob:/i.test(value)) return;
  try {
    sessionStorage.setItem(IMAGE_SEARCH_BLOB_KEY, value);
  } catch {
    // quota / private mode
  }
};

export const readImageSearchPreview = () => {
  if (typeof sessionStorage === "undefined") return "";
  try {
    return sessionStorage.getItem(IMAGE_SEARCH_PREVIEW_KEY) || "";
  } catch {
    return "";
  }
};

export const readImageSearchBlobPreview = () => {
  if (typeof sessionStorage === "undefined") return "";
  try {
    return sessionStorage.getItem(IMAGE_SEARCH_BLOB_KEY) || "";
  } catch {
    return "";
  }
};

export const clearImageSearchPreview = () => {
  if (typeof sessionStorage === "undefined") return;
  try {
    const blob = sessionStorage.getItem(IMAGE_SEARCH_BLOB_KEY);
    if (blob && /^blob:/i.test(blob)) {
      URL.revokeObjectURL(blob);
    }
    sessionStorage.removeItem(IMAGE_SEARCH_PREVIEW_KEY);
    sessionStorage.removeItem(IMAGE_SEARCH_BLOB_KEY);
  } catch {
    // ignore
  }
};

const getApiRoot = () => (process.env.REACT_APP_API_URL || "http://localhost:1302").replace(/\/+$/, "");

const isApiImageUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw || /^(blob:|data:image)/i.test(raw)) return false;

  const apiRoot = getApiRoot();
  if (raw.startsWith(apiRoot)) return true;

  try {
    const parsed = new URL(raw);
    const api = new URL(apiRoot);
    return (
      parsed.protocol === api.protocol
      && parsed.hostname === api.hostname
      && String(parsed.port || "") === String(api.port || "")
      && parsed.pathname.startsWith("/images/")
    );
  } catch {
    return false;
  }
};

/** Local blob preview only — never the uploaded server URL. */
export const resolveImageSearchPreviewSource = () => {
  const blob = readImageSearchBlobPreview();
  if (!blob) return "";
  return resolveImageSearchDisplayUrl(blob) || "";
};

export const buildSearchBarImageListingUrl = ({ imageUrl, skip = 1 } = {}) => {
  const params = new URLSearchParams();
  params.set("skip", String(skip));
  if (imageUrl) params.set("image", imageUrl);
  return params.toString();
};

/** Use same-origin /images/... in the browser so CRA proxy avoids CORP blocks in dev. */
const toBrowserImageSrc = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(blob:|data:image)/i.test(raw)) return raw;

  try {
    const parsed = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (parsed.pathname.startsWith("/images/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // not a URL — fall through
  }

  if (raw.startsWith("/images/")) return raw;
  if (/^images\//i.test(raw)) return `/${raw.replace(/^\/+/, "")}`;

  return raw;
};

/** Absolute URL for displaying the searched image on the results page. */
export const resolveImageSearchDisplayUrl = (rawUrl = "") => {
  let value = String(rawUrl || "").trim();
  if (!value) return "";

  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }

  if (/^(blob:|data:image)/i.test(value)) return value;

  // Keep absolute API URLs (same as the header search bar thumb) — backend CORP allows embed.
  if (isApiImageUrl(value)) return value;

  if (typeof window !== "undefined") {
    const sameOrigin = toBrowserImageSrc(value);
    if (sameOrigin.startsWith("/images/")) {
      return sameOrigin;
    }
  }

  if (/^https?:/i.test(value)) return value;

  const apiRoot = getApiRoot();
  if (value.startsWith("/images/")) return value;
  if (value.startsWith("/")) return `${apiRoot}${value}`;
  if (/^images\//i.test(value)) return `/images/${value.replace(/^images\//i, "")}`;
  return `${apiRoot}/${value.replace(/^\/+/, "")}`;
};
