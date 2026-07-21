import { ErrorMessage, Field, Form, Formik } from "formik";
import { Button, Col, FormGroup, Row } from "react-bootstrap";
import { useDispatch } from "react-redux";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { apiChangePassword } from "../../store/auth/actions";

/** Change-password form embedded on the Profile page. */
export default function ProfileChangePassword() {
  const dispatch = useDispatch();
  const initialValues = {
    currentPassword: "",
    password: "",
    confirmPassword: "",
  };

  const validationSchema = Yup.object().shape({
    currentPassword: Yup.string()
      .required("Current Password is required")
      .test("len", "Password must be at least 6 characters", (val) => val && val.length >= 6)
      .test("number", "Password must contain at least 1 number", (val) => /\d/.test(val))
      .test("letter", "Password must contain at least 1 letter", (val) => /[a-zA-Z]/.test(val)),
    password: Yup.string()
      .required("New Password is required")
      .test("len", "New Password must be at least 6 characters", (val) => val && val.length >= 6)
      .test("number", "New Password must contain at least 1 number", (val) => /\d/.test(val))
      .test("letter", "New Password must contain at least 1 letter", (val) => /[a-zA-Z]/.test(val)),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password"), null], "Passwords must match")
      .required("Confirm Password is required"),
  });

  return (
    <div className="profile_section text-start">
      <h5 className="mb-3">Change Password</h5>
      <Formik
        initialValues={initialValues}
        onSubmit={(data, { resetForm }) => {
          dispatch(
            apiChangePassword({
              body: data,
              callback: (res) => {
                toast.success(res?.message || "Password updated successfully.");
                resetForm();
              },
            })
          );
        }}
        validationSchema={validationSchema}
      >
        {() => (
          <Form>
            <Row>
              <Col lg={6} md={8}>
                <FormGroup className="mb-3">
                  <label htmlFor="currentPassword">Current Password</label>
                  <Field
                    name="currentPassword"
                    type="password"
                    id="currentPassword"
                    className="form-control"
                  />
                  <ErrorMessage name="currentPassword" className="text-danger" component="p" />
                </FormGroup>
                <FormGroup className="mb-3">
                  <label htmlFor="password">New Password</label>
                  <Field
                    name="password"
                    type="password"
                    id="password"
                    className="form-control"
                  />
                  <ErrorMessage name="password" className="text-danger" component="p" />
                </FormGroup>
                <FormGroup className="mb-4">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <Field
                    name="confirmPassword"
                    type="password"
                    id="confirmPassword"
                    className="form-control"
                  />
                  <ErrorMessage name="confirmPassword" className="text-danger" component="p" />
                </FormGroup>
                <Button type="submit" className="track_order px-5">
                  Change Password
                </Button>
              </Col>
            </Row>
          </Form>
        )}
      </Formik>
    </div>
  );
}
