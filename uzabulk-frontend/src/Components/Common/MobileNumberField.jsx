import { useEffect, useState } from "react";
import { ErrorMessage } from "formik";
import PhoneInput from "react-phone-input-2";

export const MobileError = ({ value = "", name = "mobileNumber", minLength = 10 }) => {
  if (!value) return null;
  return value?.length >= minLength ? null : (
    <ErrorMessage name={name} className="text-danger" component={"p"} />
  );
};

export default function MobileNumberField({
  defaultValue = "",
  callback = () => {},
  className = "",
  inputClass = "",
  placeholder = "Phone number",
  inputProps: extraInputProps = {},
}) {
  const [fieldValue, setFieldValue] = useState("");

  useEffect(() => {
    if (!!defaultValue) {
      setFieldValue(`${(defaultValue || "")?.replace("+", "")}`);
    }
  }, [defaultValue]);

  return (
    <PhoneInput
      country={"us"}
      value={fieldValue}
      inputProps={{ placeholder, ...extraInputProps }}
      inputClass={inputClass}
      className={className}
      onChange={(value, data) => {
        setFieldValue(value);
        const number = value.replace(`${data.dialCode}`, "");
        callback(`+${data.dialCode}`, number);
      }}
    />
  );
}
