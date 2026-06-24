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

export const buildSearchBarImageListingUrl = ({ imageUrl, skip = 1 } = {}) => {
  const params = new URLSearchParams();
  params.set("skip", String(skip));
  if (imageUrl) params.set("image", imageUrl);
  return params.toString();
};
