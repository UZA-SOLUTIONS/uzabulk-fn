import { ErrorMessage, Field, Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import * as Yup from "yup";

import MobileNumberField, { MobileError } from "../../Components/Common/MobileNumberField";
import { apiUpdateProfile } from "../../store/auth/actions";

const ChangeProfile = ({ changeMobile, changeEmail }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const profile = useSelector((s) => s.auth.profile);
  const [editingDetails, setEditingDetails] = useState(false);
  const [altPhone, setAltPhone] = useState("");
  const [initialValues, setInitialValues] = useState({
    name: "",
    altCountryCode: "",
    altMobileNumber: "",
    hintName: "",
  });

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Name is a required field"),
    altMobileNumber: Yup.string()
      .transform((value) => (value ? String(value).trim() : ""))
      .matches(/^$|^\d+$/, "Mobile number must contain only digits")
      .test("alt-phone-length", "Enter a valid phone number", (value) => {
        if (!value) return true;
        return value.length >= 8 && value.length <= 15;
      }),
    altCountryCode: Yup.string().when("altMobileNumber", {
      is: (value) => Boolean(value),
      then: (schema) =>
        schema.matches(
          /^\+\d+$/,
          "Country code must start with a '+' and contain only digits"
        ),
      otherwise: (schema) => schema.notRequired(),
    }),
    hintName: Yup.string(),
  });

  useEffect(() => {
    if (!!profile) {
      setInitialValues({
        name: profile?.name || "",
        altCountryCode: profile?.altCountryCode || "",
        altMobileNumber: profile?.altMobileNumber || "",
        hintName: profile?.hintName || "",
      });
      setAltPhone(`${profile?.altCountryCode || ""}${profile?.altMobileNumber || ""}`);
    }
  }, [profile]);

  const altPhoneDisplay = [profile?.altCountryCode, profile?.altMobileNumber]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="profile_form text-start">
      <Row>
        <Col md={6} className="my-2">
          <label htmlFor="profile-mobile">{t("address.mobile")}</label>
          <div className="profile_field_with_action">
            <input
              id="profile-mobile"
              type="text"
              className="form-control"
              value={[profile?.countryCode, profile?.mobileNumber].filter(Boolean).join(" ")}
              readOnly
            />
            <button type="button" className="btn profile_field_action" onClick={changeMobile}>
              {t("product.change")}
            </button>
          </div>
        </Col>

        <Col md={6} className="my-2">
          <label htmlFor="profile-email">{t("auth.email")}</label>
          <div className="profile_field_with_action">
            <input
              id="profile-email"
              type="text"
              className="form-control"
              value={profile?.email || ""}
              readOnly
            />
            <button type="button" className="btn profile_field_action" onClick={changeEmail}>
              {t("product.change")}
            </button>
          </div>
        </Col>
      </Row>

      {!editingDetails ? (
        <Row>
          <Col md={6} className="my-2">
            <label htmlFor="profile-name-readonly">{t("address.name")}</label>
            <input
              id="profile-name-readonly"
              type="text"
              className="form-control profile_field_readonly"
              value={profile?.name || ""}
              readOnly
              tabIndex={-1}
            />
          </Col>
          <Col md={6} className="my-2">
            <label htmlFor="profile-alt-readonly">{t("account.alternateMobile")}</label>
            <input
              id="profile-alt-readonly"
              type="text"
              className="form-control profile_field_readonly"
              value={altPhoneDisplay}
              readOnly
              tabIndex={-1}
            />
          </Col>
          <Col md={6} className="my-2">
            <label htmlFor="profile-hint-readonly">{t("account.hintName")}</label>
            <input
              id="profile-hint-readonly"
              type="text"
              className="form-control profile_field_readonly"
              value={profile?.hintName || ""}
              readOnly
              tabIndex={-1}
            />
          </Col>
          <Col lg={12} className="my-2 pt-3">
            <button
              type="button"
              className="btn profile_field_action"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditingDetails(true);
              }}
            >
              {t("product.change")}
            </button>
          </Col>
        </Row>
      ) : (
        <Formik
          initialValues={initialValues}
          onSubmit={(data) => {
            dispatch(
              apiUpdateProfile({
                data: { ...data, type: "profile" },
                callback: () => setEditingDetails(false),
              })
            );
          }}
          validationSchema={validationSchema}
          enableReinitialize
        >
          {(form) => (
            <Form className="profile_form_edit" noValidate>
              <Row>
                <Col md={6} className="my-2">
                  <label htmlFor="name">{t("address.name")}</label>
                  <Field name="name" id="name" className="form-control" />
                  <ErrorMessage name="name" className="text-danger" component="p" />
                </Col>

                <Col md={6} className="my-2">
                  <div className="position-relative signupinput_phone">
                    <label htmlFor="altMobileNumber">{t("account.alternateMobile")}</label>
                    <MobileNumberField
                      className="border"
                      defaultValue={altPhone}
                      callback={(code, number) => {
                        form.setFieldValue("altCountryCode", code);
                        form.setFieldValue("altMobileNumber", number);
                      }}
                    />
                    <MobileError
                      name="altMobileNumber"
                      value={form.values?.altMobileNumber}
                    />
                  </div>
                </Col>

                <Col md={6} className="my-2">
                  <label htmlFor="hintName">{t("account.hintName")}</label>
                  <Field name="hintName" id="hintName" className="form-control" />
                </Col>

                <Col lg={12} className="my-2 pt-3 d-flex align-items-center gap-2 flex-wrap">
                  <Button type="submit" className="track_order px-5">
                    {t("account.saveDetails")}
                  </Button>
                  <button
                    type="button"
                    className="btn profile_field_action profile_field_action--cancel"
                    onClick={(e) => {
                      e.preventDefault();
                      form.resetForm();
                      setEditingDetails(false);
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                </Col>
              </Row>
            </Form>
          )}
        </Formik>
      )}
    </div>
  );
};

export default ChangeProfile;
