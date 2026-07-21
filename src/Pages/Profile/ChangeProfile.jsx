import { ErrorMessage, Field, Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import * as Yup from "yup";

import MobileNumberField, { MobileError } from "../../Components/Common/MobileNumberField";
import { apiUpdateProfile } from "../../store/auth/actions";

const ChangeProfile = ({ changeMobile, changeEmail }) => {
  const dispatch = useDispatch();
  const profile = useSelector((s) => s.auth.profile);
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
      .matches(/^\d+$/, "Mobile number must contain only digits")
      .min(10, "Mobile number must be at least 10 digits long"),
    altCountryCode: Yup.string().matches(
      /^\+\d+$/,
      "Country code must start with a '+' and contain only digits"
    ),
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

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={(data) => {
        dispatch(
          apiUpdateProfile({
            data: { ...data, type: "profile" },
          })
        );
      }}
      validationSchema={validationSchema}
      enableReinitialize={true}
    >
      {(form) => {
        return (
          <Form className="profile_form text-start">
            <Row>
              <Col md={6} className="my-2">
                <label htmlFor="profile-mobile">Mobile number</label>
                <div className="profile_field_with_action">
                  <input
                    id="profile-mobile"
                    type="text"
                    className="form-control"
                    value={[profile?.countryCode, profile?.mobileNumber].filter(Boolean).join(" ")}
                    readOnly
                  />
                  <Button type="button" className="profile_field_action" onClick={changeMobile}>
                    Change
                  </Button>
                </div>
              </Col>

              <Col md={6} className="my-2">
                <label htmlFor="profile-email">Email</label>
                <div className="profile_field_with_action">
                  <input
                    id="profile-email"
                    type="text"
                    className="form-control"
                    value={profile?.email || ""}
                    readOnly
                  />
                  <Button type="button" className="profile_field_action" onClick={changeEmail}>
                    Change
                  </Button>
                </div>
              </Col>

              <Col md={6} className="my-2">
                <label htmlFor="name">Name</label>
                <Field name="name" id="name" className="form-control" />
                <ErrorMessage name="name" className="text-danger" component="p" />
              </Col>

              <Col md={6} className="my-2">
                <div className="position-relative signupinput_phone">
                  <label htmlFor="altMobileNumber">Alternate mobile details</label>
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
                <label htmlFor="hintName">Hint Name</label>
                <Field name="hintName" id="hintName" className="form-control" />
              </Col>

              <Col lg={12} className="my-2 pt-3">
                <Button type="submit" className="track_order px-5">
                  Save Details
                </Button>
              </Col>
            </Row>
          </Form>
        );
      }}
    </Formik>
  );
};

export default ChangeProfile;
