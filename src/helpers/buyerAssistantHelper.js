import apiClient from "./apiHelper";
import { BUYER_ASSISTANT } from "./urlHelper";

const SESSION_KEY = "uza-buyer-assistant-session";

export const getAssistantSessionId = () => {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(SESSION_KEY) || "";
};

export const setAssistantSessionId = (id) => {
  if (typeof sessionStorage === "undefined" || !id) return;
  sessionStorage.setItem(SESSION_KEY, String(id));
};

export const clearAssistantSession = () => {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
};

export const fetchAssistantWelcome = async (lang = "en") => {
  const res = await apiClient.get(BUYER_ASSISTANT.WELCOME, {
    params: { lang },
    suppressGlobalErrorToast: true,
  });
  if (res?.status !== "success") {
    throw new Error(res?.message || "Assistant unavailable");
  }
  return res.data;
};

export const sendAssistantMessage = async ({ message, sessionId, productId, orderId }) => {
  const res = await apiClient.post(
    BUYER_ASSISTANT.CHAT,
    {
      message,
      sessionId: sessionId || undefined,
      productId: productId || undefined,
      orderId: orderId || undefined,
    },
    { suppressGlobalErrorToast: true, timeout: 0 }
  );
  if (res?.status !== "success") {
    throw new Error(res?.message || "Could not send message");
  }
  return res.data;
};

export const escalateAssistantChat = async ({ sessionId, note }) => {
  const res = await apiClient.post(
    BUYER_ASSISTANT.ESCALATE,
    { sessionId, note },
    { suppressGlobalErrorToast: true }
  );
  if (res?.status !== "success") {
    throw new Error(res?.message || "Escalation failed");
  }
  return res.data;
};

export const QUICK_PROMPTS = [
  { id: "order", label: "My orders", message: "What are my recent orders and their status?" },
  { id: "product", label: "Product details", message: "Tell me about this product — price, MOQ, and description." },
  { id: "moq", label: "MOQ & pricing", message: "How does MOQ and wholesale pricing work on UZA Bulk?" },
  { id: "delivery", label: "Delivery ETA", message: "How long does delivery take from 1688 suppliers?" },
];
