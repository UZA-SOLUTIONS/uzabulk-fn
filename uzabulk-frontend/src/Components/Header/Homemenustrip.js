import React from "react";
import { NavLink } from "react-router-dom";
import { Container } from "react-bootstrap";
import ROUTES from "../../helpers/routesHelper";
import ItemCategory from "./Items/ItemCategory";

const Homemenustrip = ({ inline = false }) => {
  const Wrapper = inline ? React.Fragment : Container;
  const wrapperProps = inline ? {} : { className: "d-flex align-items-center justify-content-between" };

  return (
    <div className="home_strip">
      <Wrapper {...wrapperProps}>
        <ul className="homeMenu_list m-0 p-0 d-flex align-items-center">
          <ItemCategory />

          <li>
            <NavLink to={`${ROUTES.PRODUCT_LISTING}?skip=1`}>All Products</NavLink>
          </li>

          <li>
            <NavLink to={ROUTES.BLOG}>Blog</NavLink>
          </li>

          <li>
            <NavLink to={ROUTES.ABOUT_US}>About</NavLink>
          </li>

          <li>
            <NavLink to={ROUTES.CONTACT_US}>Contact</NavLink>
          </li>
        </ul>
      </Wrapper>
    </div>
  );
};

export default Homemenustrip;