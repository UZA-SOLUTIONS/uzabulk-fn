import ROUTES from "./routesHelper";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP } from "../config/constants";

/** Local Rwanda numbers (078…) → 250… for wa.me */
export const normalizeWhatsappNumber = (raw) => {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0") && digits.length === 10) {
    digits = `250${digits.slice(1)}`;
  }
  return digits;
};

export const getSupportWhatsAppDigits = () =>
  normalizeWhatsappNumber(
    SUPPORT_WHATSAPP || process.env.REACT_APP_SUPPORT_WHATSAPP || "0788371081"
  );

/**
 * Build a direct WhatsApp chat URL for customer support.
 */
export const getSupportWhatsAppUrl = (prefillMessage = "") => {
  const digits = getSupportWhatsAppDigits();
  if (!digits) return "";
  const base = `https://wa.me/${digits}`;
  const text = String(prefillMessage || "").trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
};

export const openSupportWhatsApp = (prefillMessage = "") => {
  const url = getSupportWhatsAppUrl(prefillMessage);
  if (!url || typeof window === "undefined") return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
};

const DEFAULT_ASSISTANT_SUPPORT_PREFILL =
  "Hi UZA Bulk support, I need help from the buyer assistant.";

/** WhatsApp text URLs get unreliable past ~1800–2000 chars on some devices. */
const WHATSAPP_MESSAGE_CHAR_LIMIT = 1800;

const stripHtmlToText = (value = "") =>
  String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const roleLabel = (role) => {
  if (role === "user") return "Buyer";
  if (role === "assistant") return "Assistant";
  return "System";
};

/**
 * Build a WhatsApp support handoff message from the buyer-assistant chat.
 * If the buyer already chatted, copy recent turns into a support-ready transcript.
 * Otherwise use the custom fallback message.
 */
export const buildAssistantSupportWhatsAppMessage = ({
  messages = [],
  fallbackMessage = DEFAULT_ASSISTANT_SUPPORT_PREFILL,
  pageUrl,
} = {}) => {
  const fallback = String(fallbackMessage || DEFAULT_ASSISTANT_SUPPORT_PREFILL).trim();
  const conversation = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .filter((m) => {
      const id = String(m.id || "");
      // Skip empty welcome-only bubbles when there is no real chat yet.
      if (id === "welcome" || id === "welcome-fallback") return false;
      return Boolean(stripHtmlToText(m.content));
    });

  const hasBuyerMessage = conversation.some((m) => m.role === "user");
  if (!hasBuyerMessage) return fallback;

  // Prefer the most recent turns so the handoff stays within WhatsApp URL limits.
  const recent = conversation.slice(-12);
  const lines = recent.map((m) => {
    const text = stripHtmlToText(m.content);
    const clipped = text.length > 280 ? `${text.slice(0, 277)}…` : text;
    return `${roleLabel(m.role)}: ${clipped}`;
  });

  const header = [
    "Hi UZA Bulk support — please help with this buyer-assistant conversation.",
    "",
    "--- Conversation ---",
  ];
  const footer = ["---", pageUrl ? `Page: ${pageUrl}` : null].filter(Boolean);

  let body = [...header, ...lines, ...footer].join("\n");

  if (body.length > WHATSAPP_MESSAGE_CHAR_LIMIT) {
    const kept = [...lines];
    while (
      kept.length > 2 &&
      [...header, ...kept, ...footer].join("\n").length > WHATSAPP_MESSAGE_CHAR_LIMIT
    ) {
      kept.shift();
    }
    body = [
      ...header,
      ...(kept.length < lines.length ? ["…(earlier messages omitted)", ...kept] : kept),
      ...footer,
    ]
      .join("\n")
      .slice(0, WHATSAPP_MESSAGE_CHAR_LIMIT);
  }

  return body;
};

export const openAssistantSupportWhatsApp = ({
  messages = [],
  fallbackMessage = DEFAULT_ASSISTANT_SUPPORT_PREFILL,
} = {}) => {
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const message = buildAssistantSupportWhatsAppMessage({
    messages,
    fallbackMessage,
    pageUrl,
  });
  return openSupportWhatsApp(message);
};

const getProductPageUrl = (detail) => {
  if (typeof window === "undefined") return "";
  const path = detail?._id
    ? `${ROUTES.PRODUCT_DETAIL}/${detail._id}`
    : window.location.pathname;
  return `${window.location.origin}${path}`;
};

export const buildProductChatMessage = (detail = {}) => {
  const lines = [
    "Hi, I have a question about this product:",
    detail?.name || "Product",
    detail?.offerId ? `Offer ID: ${detail.offerId}` : null,
    detail?.supplier_id || detail?.sellerOpenId
      ? `Supplier ID: ${detail.supplier_id || detail.sellerOpenId}`
      : null,
    `Link: ${getProductPageUrl(detail)}`,
  ].filter(Boolean);
  return lines.join("\n");
};

/**
 * Opens support chat for a product: WhatsApp (if configured) → email → contact page.
 */
export const openProductSupportChat = ({ detail, navigate }) => {
  const message = buildProductChatMessage(detail);
  if (openSupportWhatsApp(message)) return;

  const encodedMessage = encodeURIComponent(message);
  const email = String(SUPPORT_EMAIL || process.env.REACT_APP_SUPPORT_EMAIL || "").trim();
  if (email) {
    const subject = encodeURIComponent(
      `Product inquiry: ${detail?.name || "UZABULK"}`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${encodedMessage}`;
    return;
  }

  if (typeof navigate === "function") {
    navigate(ROUTES.CONTACT_US, {
      state: {
        productInquiry: message,
        productName: detail?.name || "",
      },
    });
    return;
  }

  window.location.assign(ROUTES.CONTACT_US);
};
