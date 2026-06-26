import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ROUTES from "../../helpers/routesHelper";
import { getLanguageCode } from "../../helpers/languageHelper";
import {
  QUICK_PROMPTS,
  escalateAssistantChat,
  fetchAssistantWelcome,
  getAssistantSessionId,
  sendAssistantMessage,
  setAssistantSessionId,
} from "../../helpers/buyerAssistantHelper";
import AssistantMessage from "./AssistantMessage";
import "./FloatingBuyerAssistant.css";

const LANG_OPTIONS = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "rw", label: "RW" },
];

const DESKTOP_DOCK_MQ = "(min-width: 992px)";
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
  const [isResizing, setIsResizing] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const resizeRef = useRef({ startX: 0, startWidth: DEFAULT_DOCK_WIDTH });

  const isDocked = open && isDesktop;

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
      setMessages([]);
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => i18n.off("languageChanged", onLanguageChanged);
  }, [i18n]);

  useEffect(() => {
    if (!open || messages.length) return undefined;
    let cancelled = false;

    fetchAssistantWelcome(language)
      .then((data) => {
        if (cancelled) return;
        const welcome = data?.message || t("assistant.welcomeFallback");
        setMessages([{ role: "assistant", content: welcome, id: "welcome" }]);
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([
          {
            role: "assistant",
            content: t("assistant.welcomeFallback"),
            id: "welcome-fallback",
          },
        ]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, language, messages.length, t]);

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
      const data = await sendAssistantMessage({
        message,
        sessionId,
        productId: productIdFromContext || undefined,
        orderId: orderIdFromContext || undefined,
      });

      if (data?.sessionId) {
        setSessionId(data.sessionId);
        setAssistantSessionId(data.sessionId);
      }
      if (data?.language) setLanguage(data.language);
      if (data?.dispute_flag) setDisputeFlag(true);
      if (data?.escalated) setEscalated(true);

      pushMessage("assistant", data?.answer || "Sorry, I could not generate a reply.", {
        dispute_flag: data?.dispute_flag,
        status: data?.status,
        products: data?.products || [],
        actions: data?.actions || [],
      });
    } catch (error) {
      pushMessage(
        "assistant",
        "I'm having trouble connecting right now. Please try again or visit Contact Us for help.",
        { status: "EXCEPTION" }
      );
    } finally {
      setLoading(false);
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
      pushMessage("assistant", data?.message || "Your case has been escalated to a human agent.");
    } catch {
      pushMessage("assistant", "Could not escalate automatically. Please use Contact Us.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action) => {
    if (action?.type === "chat" && action.message) {
      handleSend(action.message);
    }
  };

  return (
    <div className={`floating-buyer-assistant ${open ? "is-open" : ""} ${isDocked ? "is-docked" : ""}`}>
      {open ? (
        <div className="floating-buyer-assistant__panel" role="dialog" aria-label={t("assistant.dialogLabel")}>
          {isDocked ? (
            <>
              <div
                className={`floating-buyer-assistant__resize_handle${isResizing ? " is-active" : ""}`}
                role="separator"
                aria-orientation="vertical"
                aria-label={t("assistant.resize")}
                onMouseDown={startResize}
              />
              <div className="floating-buyer-assistant__dock_tab" aria-hidden>
                <span className="floating-buyer-assistant__dock_tab_dot" />
                <span>{t("assistant.dockTab")}</span>
              </div>
            </>
          ) : null}
          <header className="floating-buyer-assistant__header">
            <div>
              <p className="floating-buyer-assistant__eyebrow">{t("assistant.eyebrow")}</p>
              <h2 className="floating-buyer-assistant__title">{t("assistant.title")}</h2>
            </div>
            <div className="floating-buyer-assistant__header_actions">
              <div className="floating-buyer-assistant__langs" role="group" aria-label={t("assistant.languageHint")}>
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    className={language === opt.code ? "is-active" : ""}
                    onClick={() => setLanguage(opt.code)}
                    title={`Prefer ${opt.label}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
              {escalated
                ? "A human agent will review this conversation."
                : "This looks sensitive — you can escalate to a human agent."}
              {!escalated ? (
                <button type="button" onClick={handleEscalate} disabled={loading}>
                  Escalate now
                </button>
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
              <AssistantMessage key={msg.id} message={msg} onAction={handleAction} />
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
            <button type="submit" disabled={loading || !input.trim()}>
              {t("common.submit")}
            </button>
          </form>

          <footer className="floating-buyer-assistant__footer">
            <Link to={ROUTES.CONTACT_US}>{t("nav.contactUs")}</Link>
            <span aria-hidden>·</span>
            <span>Grounded on live catalog &amp; policies</span>
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
