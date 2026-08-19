import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { apiGetCartCount } from "../../store/cart/actions";
import { store } from "../../store/store";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ROUTES from "../../helpers/routesHelper";
import { getLanguageCode } from "../../helpers/languageHelper";
import {
  buildAssistantSupportWhatsAppMessage,
  getSupportWhatsAppUrl,
  openAssistantSupportWhatsApp,
} from "../../helpers/supportChatHelper";
import {
  ASSISTANT_OPEN_EVENT,
  QUICK_PROMPTS,
  applyAssistantResponse,
  confirmAssistantAction,
  escalateAssistantChat,
  fetchAssistantHistory,
  fetchAssistantWelcome,
  getAssistantSessionId,
  sendAssistantMessage,
  setAssistantSessionId,
} from "../../helpers/buyerAssistantHelper";
import AssistantMessage from "./AssistantMessage";
import WhatsAppIcon from "./WhatsAppIcon";
import "./FloatingBuyerAssistant.css";

const DESKTOP_DOCK_MQ = "(min-width: 992px)";
const SUPPORT_WHATSAPP_PREFILL =
  "Hi UZA Bulk support, I need help from the buyer assistant.";
const DOCK_WIDTH_KEY = "uza-assistant-dock-width";
const DEFAULT_DOCK_WIDTH = 328;
const MIN_DOCK_WIDTH = 280;
const MAX_DOCK_WIDTH = 560;

const readDockWidth = () => {
  try {
    const raw = Number(sessionStorage.getItem(DOCK_WIDTH_KEY));
    if (Number.isFinite(raw) && raw >= MIN_DOCK_WIDTH && raw <= MAX_DOCK_WIDTH) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_DOCK_WIDTH;
};

const persistDockWidth = (value) => {
  try {
    sessionStorage.setItem(DOCK_WIDTH_KEY, String(value));
  } catch {
    /* ignore */
  }
};

const resolveAssistantProductId = (location) => {
  const path = location?.pathname || "";
  const search = new URLSearchParams(location?.search || "");

  const pathMatch = path.match(/\/(?:product-view|product\/view|products?\/details?|product)\/([a-f0-9]{24})/i);
  if (pathMatch?.[1]) return pathMatch[1];

  const queryId = search.get("productId") || search.get("product_id");
  if (queryId && /^[a-f0-9]{24}$/i.test(queryId)) return queryId;

  return "";
};

const resolveAssistantOrderId = (location) => {
  const path = location?.pathname || "";
  const search = new URLSearchParams(location?.search || "");

  const pathMatch = path.match(/\/(?:order-view|order-details?|orders?\/view)\/([a-f0-9]{24})/i);
  if (pathMatch?.[1]) return pathMatch[1];

  const queryId = search.get("orderId") || search.get("order_id");
  if (queryId) return queryId;

  return "";
};

function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 9h10M7 13h6M5 19l1.5-3H19a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useDesktopDock() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_DOCK_MQ).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_DOCK_MQ);
    const onChange = (event) => setIsDesktop(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export default function FloatingBuyerAssistant() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isDesktop = useDesktopDock();
  const [open, setOpen] = useState(false);
  const [dockWidth, setDockWidth] = useState(() => readDockWidth());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(() => getAssistantSessionId());
  const [language, setLanguage] = useState(() => getLanguageCode());
  const [loading, setLoading] = useState(false);
  const [disputeFlag, setDisputeFlag] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [confirmingId, setConfirmingId] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const openLoadedRef = useRef(false);
  const resizeRef = useRef({ startX: 0, startWidth: DEFAULT_DOCK_WIDTH });

  const isDocked = open && isDesktop;
  const isMobileSheet = open && !isDesktop;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    const onLanguageChanged = (lng) => {
      const next = lng === "fr" ? "fr" : "en";
      setLanguage(next);
      // Refresh welcome copy when the platform language changes.
      setMessages([]);
      openLoadedRef.current = false;
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => i18n.off("languageChanged", onLanguageChanged);
  }, [i18n]);

  useEffect(() => {
    setLanguage(getLanguageCode());
  }, []);

  useEffect(() => {
    if (!open) {
      openLoadedRef.current = false;
      return undefined;
    }
    if (openLoadedRef.current) return undefined;
    openLoadedRef.current = true;

    let cancelled = false;
    const storedSessionId = getAssistantSessionId() || sessionId;

    const loadSession = async () => {
      if (storedSessionId) {
        try {
          const history = await fetchAssistantHistory(storedSessionId);
          if (cancelled) return;
          if (history?.messages?.length) {
            setSessionId(String(history.sessionId || storedSessionId));
            setAssistantSessionId(String(history.sessionId || storedSessionId));
            setMessages(history.messages);
            if (history.dispute_flag) setDisputeFlag(true);
            if (history.escalated) setEscalated(true);
            return;
          }
        } catch {
          /* fall through to welcome */
        }
      }

      if (cancelled) return;

      try {
        const data = await fetchAssistantWelcome(language);
        if (cancelled) return;
        const welcome = data?.message || t("assistant.welcomeFallback");
        setMessages([{ role: "assistant", content: welcome, id: "welcome" }]);
      } catch {
        if (cancelled) return;
        setMessages([
          {
            role: "assistant",
            content: t("assistant.welcomeFallback"),
            id: "welcome-fallback",
          },
        ]);
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [open, language, t]);

  useEffect(() => {
    const onOpenAssistant = (event) => {
      const detail = event?.detail || {};
      if (detail.message) {
        openLoadedRef.current = true;
      }
      setOpen(true);
      if (detail.message) {
        window.setTimeout(() => {
          handleSendRef.current?.(detail.message);
        }, 300);
      }
    };
    window.addEventListener(ASSISTANT_OPEN_EVENT, onOpenAssistant);
    return () => window.removeEventListener(ASSISTANT_OPEN_EVENT, onOpenAssistant);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    persistDockWidth(dockWidth);
  }, [dockWidth]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    body.classList.toggle("assistant-side-dock", isDocked);
    body.classList.toggle("assistant-side-dock--resizing", isDocked && isResizing);
    if (isDocked) {
      root.style.setProperty("--assistant-dock-width", `${dockWidth}px`);
    } else {
      root.style.removeProperty("--assistant-dock-width");
    }
    return () => {
      body.classList.remove("assistant-side-dock");
      body.classList.remove("assistant-side-dock--resizing");
      root.style.removeProperty("--assistant-dock-width");
    };
  }, [isDocked, dockWidth, isResizing]);

  // Mobile: lock page scroll so the chat stays fixed while typing / scrolling messages.
  useEffect(() => {
    const body = document.body;
    if (!isMobileSheet) {
      body.classList.remove("assistant-mobile-sheet-open");
      return undefined;
    }

    const scrollY = window.scrollY || window.pageYOffset || 0;
    body.classList.add("assistant-mobile-sheet-open");
    body.style.top = `-${scrollY}px`;

    return () => {
      body.classList.remove("assistant-mobile-sheet-open");
      body.style.top = "";
      window.scrollTo(0, scrollY);
    };
  }, [isMobileSheet]);

  useEffect(() => {
    if (!open || !isMobileSheet) return undefined;
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const syncViewport = () => {
      const root = document.documentElement;
      root.style.setProperty("--assistant-mobile-vh", `${vv.height}px`);
      root.style.setProperty("--assistant-mobile-offset-top", `${vv.offsetTop}px`);
    };
    syncViewport();
    vv.addEventListener("resize", syncViewport);
    vv.addEventListener("scroll", syncViewport);
    return () => {
      vv.removeEventListener("resize", syncViewport);
      vv.removeEventListener("scroll", syncViewport);
      document.documentElement.style.removeProperty("--assistant-mobile-vh");
      document.documentElement.style.removeProperty("--assistant-mobile-offset-top");
    };
  }, [open, isMobileSheet]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const clampDockWidth = useCallback((width) => {
    const maxWidth = Math.min(MAX_DOCK_WIDTH, Math.floor(window.innerWidth * 0.5));
    return Math.min(Math.max(width, MIN_DOCK_WIDTH), maxWidth);
  }, []);

  const startResize = useCallback((event) => {
    if (!isDocked) return;
    event.preventDefault();
    resizeRef.current = {
      startX: event.clientX,
      startWidth: dockWidth,
    };
    setIsResizing(true);
  }, [dockWidth, isDocked]);

  useEffect(() => {
    if (!isResizing) return undefined;

    const onMove = (event) => {
      const delta = resizeRef.current.startX - event.clientX;
      setDockWidth(clampDockWidth(resizeRef.current.startWidth + delta));
    };

    const onEnd = () => setIsResizing(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
    };
  }, [clampDockWidth, isResizing]);

  const productIdFromContext = resolveAssistantProductId(location);
  const orderIdFromContext = resolveAssistantOrderId(location);
  const handleSendRef = useRef(null);

  const pushMessage = (role, content, extra = {}) => {
    setMessages((prev) => [
      ...prev,
      { role, content, id: `${role}-${Date.now()}-${prev.length}`, ...extra },
    ]);
  };

  const handleSend = async (text) => {
    const message = String(text || input || "").trim();
    if (!message || loading) return;

    setInput("");
    pushMessage("user", message);
    setLoading(true);

    try {
      const currentSearchParams = new URLSearchParams(location.search || "");
      const data = await sendAssistantMessage({
        message,
        sessionId,
        productId: productIdFromContext || undefined,
        orderId: orderIdFromContext || undefined,
        preferredLanguage: getLanguageCode(),
        pageContext: {
          pathname: location.pathname || "",
          search: location.search || "",
          searchQuery: currentSearchParams.get("search") || "",
          productId: productIdFromContext || "",
          orderId: orderIdFromContext || "",
        },
      });

      const assistantMessage = applyAssistantResponse(data, {
        setSessionId,
        setDisputeFlag,
        setEscalated,
      });

      pushMessage("assistant", assistantMessage.content, {
        dispute_flag: assistantMessage.dispute_flag,
        status: assistantMessage.status,
        products: assistantMessage.products,
        actions: assistantMessage.actions,
      });
    } catch (error) {
      pushMessage(
        "assistant",
        t("assistant.connectionError"),
        { status: "EXCEPTION" }
      );
    } finally {
      setLoading(false);
    }
  };

  handleSendRef.current = handleSend;

  const handleConfirm = async (action, confirmed) => {
    if (!action?.confirmationId || loading) return;
    setConfirmingId(action.confirmationId);
    setLoading(true);
    try {
      const data = await confirmAssistantAction({
        sessionId,
        confirmationId: action.confirmationId,
        confirmed,
      });

      const assistantMessage = applyAssistantResponse(data, {
        setSessionId,
        setDisputeFlag,
        setEscalated,
      });

      pushMessage("assistant", assistantMessage.content, {
        status: assistantMessage.status,
        products: assistantMessage.products,
        actions: assistantMessage.actions,
      });

      if (confirmed && action.actionType === "add_to_cart") {
        store.dispatch(apiGetCartCount());
        toast.success(t("cart.cartUpdated"));
      }
    } catch {
      pushMessage("assistant", t("assistant.actionFailed"), { status: "EXCEPTION" });
    } finally {
      setConfirmingId("");
      setLoading(false);
    }
  };

  const handleNavigate = (action = {}) => {
    if (action?.closeAssistant !== false) {
      window.setTimeout(() => setOpen(false), 120);
    }
  };

  const handleEscalate = async () => {
    if (!sessionId || escalated) return;
    setLoading(true);
    try {
      const data = await escalateAssistantChat({
        sessionId,
        note: messages.filter((m) => m.role === "user").slice(-3).map((m) => m.content).join("\n"),
      });
      setEscalated(true);
      pushMessage(
        "assistant",
        data?.message || t("assistant.disputeEscalated")
      );
    } catch {
      pushMessage("assistant", t("assistant.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppSupport = () => {
    openAssistantSupportWhatsApp({
      messages,
      fallbackMessage: SUPPORT_WHATSAPP_PREFILL,
    });
  };

  const supportWhatsAppHref = getSupportWhatsAppUrl(
    buildAssistantSupportWhatsAppMessage({
      messages,
      fallbackMessage: SUPPORT_WHATSAPP_PREFILL,
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
    })
  );

  const handleAction = (action) => {
    if (action?.type === "whatsapp") {
      openAssistantSupportWhatsApp({
        messages,
        fallbackMessage: action.message || SUPPORT_WHATSAPP_PREFILL,
      });
      return;
    }
    if (action?.type === "chat" && action.message) {
      handleSend(action.message);
    }
  };

  return (
    <div
      className={`floating-buyer-assistant${open ? " is-open" : ""}${isDocked ? " is-docked" : ""}${isMobileSheet ? " is-mobile-sheet" : ""}`}
    >
      {open ? (
        <div className="floating-buyer-assistant__panel" role="dialog" aria-label={t("assistant.dialogLabel")}>
          {isDocked ? (
            <div
              className={`floating-buyer-assistant__resize_handle${isResizing ? " is-active" : ""}`}
              role="separator"
              aria-orientation="vertical"
              aria-label={t("assistant.resize")}
              onMouseDown={startResize}
            />
          ) : null}
          <header className="floating-buyer-assistant__header">
            <div className="floating-buyer-assistant__brand">
              <h2 className="floating-buyer-assistant__title">{t("assistant.title")}</h2>
            </div>
            <div className="floating-buyer-assistant__header_actions">
              <button
                type="button"
                className="floating-buyer-assistant__close"
                onClick={() => setOpen(false)}
                aria-label={t("assistant.close")}
              >
                ×
              </button>
            </div>
          </header>

          {disputeFlag ? (
            <div className="floating-buyer-assistant__alert" role="status">
              <span>
                {escalated
                  ? t("assistant.disputeEscalated")
                  : t("assistant.disputeHint")}
              </span>
              {!escalated ? (
                <div className="floating-buyer-assistant__alert_actions">
                  <button type="button" onClick={handleEscalate} disabled={loading}>
                    {t("assistant.escalateNow")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="floating-buyer-assistant__quick" aria-label={t("assistant.quickQuestions")}>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => handleSend(prompt.message)}
                disabled={loading}
              >
                {prompt.label}
              </button>
            ))}
          </div>

          <div className="floating-buyer-assistant__messages" ref={listRef}>
            {messages.map((msg) => (
              <AssistantMessage
                key={msg.id}
                message={msg}
                onAction={handleAction}
                onNavigate={handleNavigate}
                onConfirm={handleConfirm}
                confirmingId={confirmingId}
              />
            ))}
            {loading ? (
              <div className="floating-buyer-assistant__typing" aria-live="polite">
                <span /><span /><span />
              </div>
            ) : null}
          </div>

          <form
            className="floating-buyer-assistant__composer"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("assistant.placeholder")}
              disabled={loading}
              maxLength={2000}
              aria-label="Message to buyer assistant"
            />
            <div className="floating-buyer-assistant__composer_actions">
              <button type="submit" disabled={loading || !input.trim()}>
                {t("common.submit")}
              </button>
              <a
                className="floating-buyer-assistant__composer_whatsapp"
                href={supportWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("assistant.whatsappSupport")}
                title={`${t("assistant.whatsappSupport")} · ${t("assistant.whatsappNumber")}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleWhatsAppSupport();
                }}
              >
                <WhatsAppIcon size={18} />
              </a>
            </div>
          </form>

          <footer className="floating-buyer-assistant__footer">
            <Link to={ROUTES.CONTACT_US}>{t("nav.contactUs")}</Link>
            <span aria-hidden>·</span>
            <span>{t("assistant.footerGrounded")}</span>
          </footer>
        </div>
      ) : null}

      <button
        type="button"
        className="floating-buyer-assistant__launcher"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Close buyer assistant" : "Open buyer assistant"}
      >
        <ChatIcon />
        <span className="floating-buyer-assistant__launcher_label">{t("assistant.askUza")}</span>
      </button>
    </div>
  );
}
