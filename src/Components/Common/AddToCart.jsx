import { Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";

export default function AddToCart({
  onDecrement,
  onIncrement,
  value,
  onChange,
  min = 1,
  disabled = false,
  decrementDisabled = false,
  className = "",
  /** Larger, labeled-friendly stepper for product detail */
  variant = "default",
}) {
  const { t } = useTranslation();
  const rootClass = [
    "add-to-cart-wrapper",
    variant === "product" ? "add-to-cart-wrapper--product" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const isProduct = variant === "product";
  const qtyBtnProps = isProduct
    ? { variant: "outline-secondary", className: "add-to-cart-qty-btn" }
    : { variant: undefined, className: undefined };

  return (
    <div className={rootClass} role="group" aria-label={t("cart.quantity")}>
      <Button
        type="button"
        {...qtyBtnProps}
        onClick={() => onDecrement()}
        disabled={decrementDisabled || Number(value) <= Number(min)}
        aria-label={t("cart.decreaseQuantity")}
      >
        -
      </Button>
      <div className="div_output2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="form-control text-center cart-input"
          value={value}
          aria-label={t("cart.quantity")}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === "") return;
            const parsed = Number.parseInt(raw, 10);
            onChange(Number.isNaN(parsed) ? min : parsed);
          }}
          min={min}
          onKeyUp={(e) => {
            if (e.keyCode === 38) {
              onIncrement();
            } else if (e.keyCode === 40) {
              onDecrement();
            }
          }}
        />
      </div>
      <Button
        type="button"
        {...qtyBtnProps}
        onClick={() => onIncrement()}
        disabled={disabled}
        aria-label={t("cart.increaseQuantity")}
      >
        +
      </Button>
    </div>
  );
}
