import React from "react";
import { Link } from "react-router-dom";

import placeholder from "../../assets/images/default_name.webp";
import {
  buildProductDetailUrlFromResolved,
  getProductImageUrl,
} from "../../helpers/commonHelper";
import ROUTES from "../../helpers/routesHelper";
import { formatAssistantMessageHtml } from "../../helpers/assistantMessageHelper";
import TranslatedProductName from "./TranslatedProductName";
import WhatsAppIcon from "./WhatsAppIcon";

function resolveActionPath(action = {}) {
  if (action.type === "product" && action.productId) {
    return buildProductDetailUrlFromResolved({
      mongoId: action.productId,
      offerId: action.offerId,
    });
  }
  if (action.type === "search" && action.query) {
    return `${ROUTES.PRODUCT_LISTING}?search=${encodeURIComponent(action.query)}`;
  }
  if (action.route === "ORDER_DETAIL" && action.orderId) {
    return `${ROUTES.ORDER_DETAIL}/${encodeURIComponent(action.orderId)}`;
  }
  if (action.route && ROUTES[action.route]) {
    return ROUTES[action.route];
  }
  return action.path || "";
}

function AssistantProductCard({ product, onNavigate }) {
  const detailUrl = buildProductDetailUrlFromResolved({
    mongoId: product?.id,
    offerId: product?.offerId,
  });
  const imageUrl = product?.imageUrl || getProductImageUrl(product, placeholder);

  if (!product?.id) return null;

  return (
    <Link
      to={detailUrl || ROUTES.PRODUCT_LISTING}
      className="floating-buyer-assistant__product_card"
      onClick={() => onNavigate?.({ type: "product", closeAssistant: true })}
    >
      <img
        src={imageUrl || placeholder}
        alt={product.name || "Product"}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.src = placeholder;
        }}
      />
      <div className="floating-buyer-assistant__product_card_body">
        <TranslatedProductName product={product} className="floating-buyer-assistant__product_name" as="p" />
        {product.price != null ? (
          <p className="floating-buyer-assistant__product_price">
            <strong>{product.price}</strong>
            {product.moq ? <span> · MOQ {product.moq}</span> : null}
            {product.quantityOrdered ? <span> · Qty {product.quantityOrdered}</span> : null}
          </p>
        ) : null}
        {product.shortDescription ? (
          <p className="floating-buyer-assistant__product_desc">{product.shortDescription}</p>
        ) : null}
        <span className="floating-buyer-assistant__product_cta">View details →</span>
      </div>
    </Link>
  );
}

function AssistantMessage({ message, onAction, onNavigate, onConfirm, confirmingId }) {
  const isUser = message.role === "user";
  const html = !isUser ? formatAssistantMessageHtml(message.content) : "";
  const products = message.products || [];
  const actions = message.actions || [];

  return (
    <div className={`floating-buyer-assistant__message_group floating-buyer-assistant__message_group--${message.role}`}>
      <div className={`floating-buyer-assistant__bubble floating-buyer-assistant__bubble--${message.role}`}>
        {isUser ? (
          message.content
        ) : (
          <div
            className="floating-buyer-assistant__rich_text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      {!isUser && products.length > 0 ? (
        <div className="floating-buyer-assistant__products" aria-label="Related products">
          {products.map((product) => (
            <AssistantProductCard
              key={product.id || product.offerId}
              product={product}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}

      {!isUser && actions.length > 0 ? (
        <div className="floating-buyer-assistant__actions" aria-label="Suggested actions">
          {actions.map((action) => {
            if (action.type === "confirm" && action.confirmationId) {
              const busy = confirmingId === action.confirmationId;
              return (
                <div
                  key={`confirm-${action.confirmationId}`}
                  className="floating-buyer-assistant__confirm_block"
                >
                  {action.label ? (
                    <p className="floating-buyer-assistant__confirm_prompt">{action.label}</p>
                  ) : null}
                  <div className="floating-buyer-assistant__confirm_actions">
                    <button
                      type="button"
                      className="floating-buyer-assistant__action_btn floating-buyer-assistant__action_btn--confirm"
                      disabled={busy}
                      onClick={() => onConfirm?.(action, true)}
                    >
                      {action.confirmLabel || "Confirm"}
                    </button>
                    <button
                      type="button"
                      className="floating-buyer-assistant__action_btn floating-buyer-assistant__action_btn--cancel"
                      disabled={busy}
                      onClick={() => onConfirm?.(action, false)}
                    >
                      {action.cancelLabel || "Cancel"}
                    </button>
                  </div>
                </div>
              );
            }

            const path = resolveActionPath(action);
            if (action.type === "whatsapp" || action.type === "external") {
              const href = action.url || action.href || "";
              return (
                <a
                  key={`${action.label}-${href || "whatsapp"}`}
                  href={href || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`floating-buyer-assistant__action_btn floating-buyer-assistant__action_btn--link${
                    action.type === "whatsapp" ? " floating-buyer-assistant__action_btn--whatsapp" : ""
                  }`}
                  onClick={(e) => {
                    if (action.type === "whatsapp") {
                      e.preventDefault();
                      onAction?.(action);
                    } else {
                      onNavigate?.(action);
                    }
                  }}
                >
                  {action.type === "whatsapp" ? <WhatsAppIcon size={14} /> : null}
                  <span>{action.label}</span>
                </a>
              );
            }

            if (action.type === "chat") {
              return (
                <button
                  key={`${action.label}-${action.message}`}
                  type="button"
                  className="floating-buyer-assistant__action_btn"
                  onClick={() => onAction?.(action)}
                >
                  {action.label}
                </button>
              );
            }
            if (path) {
              return (
                <Link
                  key={`${action.label}-${path}`}
                  to={path}
                  className="floating-buyer-assistant__action_btn floating-buyer-assistant__action_btn--link"
                  onClick={() => onNavigate?.(action)}
                >
                  {action.label}
                </Link>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                className="floating-buyer-assistant__action_btn"
                onClick={() => onAction?.(action)}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default AssistantMessage;
