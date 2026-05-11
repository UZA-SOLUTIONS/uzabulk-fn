import { ErrorMessage, Field } from "formik";
import { FormGroup } from "react-bootstrap";
import { useState } from "react";
import { ICON_EYE, ICON_EYE_SLASH, ICON_LOCK } from "../../assets/svg";

export default function PasswordField({
  name = "password",
  placeholder = "Password",
  className = "",
}) {
  const [show, setShow] = useState(false);
  return (
    <FormGroup className={className}>
      <div className="position-relative w-100">
        <Field
          className="form-control password-input"
          type={show ? "text" : "password"}
          name={name}
          id={name}
          placeholder={placeholder}
        />
        <div className="password-eye" onClick={() => setShow((s) => !s)}>
          {show ? ICON_EYE : ICON_EYE_SLASH}
        </div>
        <div className="auth_icon">{ICON_LOCK}</div>
      </div>
      <ErrorMessage name={name} component="p" className="text-danger" />
    </FormGroup>
  );
}
