import apiClient from "./apiHelper";
import { BUYER_ASSISTANT } from "./urlHelper";

const SESSION_KEY = "uza-buyer-assistant-session";
export const ASSISTANT_OPEN_EVENT = "uza:open-buyer-assistant";

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

export const openBuyerAssistant = ({ message, productId } = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ASSISTANT_OPEN_EVENT, {
      detail: {
        message: message || "",
        productId: productId || "",
      },
    })
  );
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

export const fetchAssistantHistory = async (sessionId) => {
  if (!sessionId) return null;
  const res = await apiClient.get(BUYER_ASSISTANT.HISTORY, {
    params: { sessionId },
    suppressGlobalErrorToast: true,
  });
  if (res?.status !== "success") {
    return null;
  }
  return res.data;
};

export const sendAssistantMessage = async ({
  message,
  sessionId,
  productId,
  orderId,
  preferredLanguage,
  pageContext,
}) => {
  const res = await apiClient.post(
    BUYER_ASSISTANT.CHAT,
    {
      message,
      sessionId: sessionId || undefined,
      productId: productId || undefined,
      orderId: orderId || undefined,
      preferredLanguage: preferredLanguage || undefined,
      pageContext: pageContext || undefined,
    },
    { suppressGlobalErrorToast: true, timeout: 0 }
  );
  if (res?.status !== "success") {
    throw new Error(res?.message || "Could not send message");
  }
  return res.data;
};

export const confirmAssistantAction = async ({ sessionId, confirmationId, confirmed = true }) => {
  const res = await apiClient.post(
    BUYER_ASSISTANT.CONFIRM,
    {
      sessionId: sessionId || undefined,
      confirmationId,
      confirmed,
    },
    { suppressGlobalErrorToast: true, timeout: 0 }
  );
  if (res?.status !== "success") {
    throw new Error(res?.message || "Could not complete action");
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
  { id: "order", label: "My orders", message: "What are my recent orders and what products did I order?" },
  { id: "product", label: "Find a product", message: "Help me find a product — tell me price, MOQ, and show matching items." },
  { id: "cart", label: "My cart", message: "What is in my cart and how do I checkout?" },
  { id: "checkout", label: "Checkout", message: "Help me checkout" },
  { id: "delivery", label: "Delivery ETA", message: "How long does delivery take from 1688 suppliers?" },
];

export const applyAssistantResponse = (data, setters = {}) => {
  const {
    setSessionId,
    setDisputeFlag,
    setEscalated,
  } = setters;

  if (data?.sessionId) {
    setSessionId?.(data.sessionId);
    setAssistantSessionId(data.sessionId);
  }
  if (data?.dispute_flag) setDisputeFlag?.(true);
  if (data?.escalated) setEscalated?.(true);

  return {
    content: data?.answer || "",
    dispute_flag: data?.dispute_flag,
    status: data?.status,
    products: data?.products || [],
    actions: data?.actions || [],
  };
};
