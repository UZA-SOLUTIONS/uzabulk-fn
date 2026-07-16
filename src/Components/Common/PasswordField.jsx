import { ErrorMessage, Field, useFormikContext } from "formik";
import { FormGroup } from "react-bootstrap";
import { useState } from "react";
import { ICON_EYE, ICON_EYE_SLASH, ICON_LOCK } from "../../assets/svg";

export default function PasswordField({
  name = "password",
  placeholder = "Password",
  className = "",
  autoComplete,
  hint = "",
  /** When set, show mismatch as soon as this field has a value and differs. */
  liveMatchAgainst = "",
  liveMatchMessage = "",
}) {
  const [show, setShow] = useState(false);
  const formik = useFormikContext();
  const resolvedAutoComplete =
    autoComplete ||
    (name === "confirmPassword" ? "new-password" : "current-password");

  const fieldValue = String(formik?.values?.[name] ?? "");
  const compareValue = liveMatchAgainst
    ? String(formik?.values?.[liveMatchAgainst] ?? "")
    : "";
  const liveMismatch =
    Boolean(liveMatchAgainst) &&
    Boolean(liveMatchMessage) &&
    fieldValue.length > 0 &&
    fieldValue !== compareValue;

  const schemaError =
    Boolean(formik?.errors?.[name]) &&
    (Boolean(formik?.touched?.[name]) || Number(formik?.submitCount) > 0);

  const showError = liveMismatch || schemaError;
  const errorText = liveMismatch
    ? liveMatchMessage
    : schemaError
      ? formik.errors[name]
      : "";

  return (
    <FormGroup className={className}>
      <div className={`auth-field${showError ? " is-invalid" : ""}`}>
        <span className="auth-field__icon" aria-hidden>
          {ICON_LOCK}
        </span>
        <Field
          className="form-control auth-field__input auth-field__input--password"
          type={show ? "text" : "password"}
          name={name}
          id={name}
          autoComplete={resolvedAutoComplete}
          placeholder={placeholder}
          onChange={(event) => {
            formik.handleChange(event);
            // Keep mismatch feedback live while typing in either password field.
            if (liveMatchAgainst || name === "password") {
              formik.setFieldTouched(name === "password" ? "confirmPassword" : name, true, false);
            }
          }}
        />
        <button
          type="button"
          className="auth-field__eye"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? ICON_EYE : ICON_EYE_SLASH}
        </button>
      </div>
      {hint && !showError ? (
        <small className="auth-field-hint">{hint}</small>
      ) : null}
      {showError && errorText ? (
        <small className="auth-field-error">{errorText}</small>
      ) : (
        <ErrorMessage name={name} component="small" className="auth-field-error" />
      )}
    </FormGroup>
  );
}
