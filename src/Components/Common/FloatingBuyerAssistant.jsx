import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import ROUTES from "../../helpers/routesHelper";
import {
  QUICK_PROMPTS,
  escalateAssistantChat,
  fetchAssistantWelcome,
  getAssistantSessionId,
  sendAssistantMessage,
  setAssistantSessionId,
} from "../../helpers/buyerAssistantHelper";
import "./FloatingBuyerAssistant.css";

const LANG_OPTIONS = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "rw", label: "RW" },
];

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

export default function FloatingBuyerAssistant() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(() => getAssistantSessionId());
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [disputeFlag, setDisputeFlag] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    if (!open || messages.length) return undefined;
    let cancelled = false;

    fetchAssistantWelcome(language)
      .then((data) => {
        if (cancelled) return;
        const welcome = data?.message
          || "Hi! I'm your UZA Bulk buyer assistant. Ask about products, delivery, or your order.";
        setMessages([{ role: "assistant", content: welcome, id: "welcome" }]);
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([
          {
            role: "assistant",
            content: "Hi! I'm your UZA Bulk buyer assistant. Ask about products, delivery, or your order.",
            id: "welcome-fallback",
          },
        ]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, language, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

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

  return (
    <div className={`floating-buyer-assistant ${open ? "is-open" : ""}`}>
      {open ? (
        <div className="floating-buyer-assistant__panel" role="dialog" aria-label="UZA buyer assistant">
          <header className="floating-buyer-assistant__header">
            <div>
              <p className="floating-buyer-assistant__eyebrow">AI Buyer Assistant</p>
              <h2 className="floating-buyer-assistant__title">UZA Bulk Support</h2>
            </div>
            <div className="floating-buyer-assistant__header_actions">
              <div className="floating-buyer-assistant__langs" role="group" aria-label="Language hint">
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
                aria-label="Close assistant"
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

          <div className="floating-buyer-assistant__quick" aria-label="Quick questions">
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
              <div
                key={msg.id}
                className={`floating-buyer-assistant__bubble floating-buyer-assistant__bubble--${msg.role}`}
              >
                {msg.content}
              </div>
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
              placeholder="Ask about products, delivery, or your order…"
              disabled={loading}
              maxLength={2000}
              aria-label="Message to buyer assistant"
            />
            <button type="submit" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>

          <footer className="floating-buyer-assistant__footer">
            <Link to={ROUTES.CONTACT_US}>Contact Us</Link>
            <span aria-hidden>·</span>
            <span>Grounded on live catalog &amp; policies</span>
          </footer>
        </div>
      ) : null}

      <button
        type="button"
        className="floating-buyer-assistant__launcher"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close buyer assistant" : "Open buyer assistant"}
      >
        <ChatIcon />
        <span className="floating-buyer-assistant__launcher_label">Ask UZA</span>
      </button>
    </div>
  );
}
