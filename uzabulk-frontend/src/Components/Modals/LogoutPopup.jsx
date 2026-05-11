import React from "react";
import { Modal, Button } from "react-bootstrap";
import { Link } from "react-router-dom";

const LogoutPopup = (props) => {
  return (
    <Modal
      {...props}
      size="sm"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header className="position-relative d-flex align-items-center justify-content-between">
        <Modal.Title id="contained-modal-title-vcenter">
          Logout
        </Modal.Title>
        <Link to="#" onClick={props.onhide}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <path
              fill="#000"
              d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"
            />
          </svg>
        </Link>
      </Modal.Header>
      <Modal.Body>
        <p>Are you sure?</p>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.onhide} variant="dark" className="rounded rounded-5 py-1">
          Cancel
        </Button>
        <Button variant="danger" onClick={props.onLogout} className="rounded rounded-5 py-1">
          Logout
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LogoutPopup;
