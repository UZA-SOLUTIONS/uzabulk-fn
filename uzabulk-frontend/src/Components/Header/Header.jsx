import React, { useLayoutEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import UserAuthCard from "./UserAuthCard";
import ROUTES from "../../helpers/routesHelper";
import Logo from "../../assets/images/dark_logo.svg";
import Homemenustrip from "./Homemenustrip";
import ProductSearch from "../Common/ProductSearch";

/** Show sticky header search only after scrolling past the hero / fold */
const HEADER_SEARCH_REVEAL_SCROLL_Y = 72;

export default function Header() {
  const [searchText, setSearchText] = useState("");
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "";

  useLayoutEffect(() => {
    const readY = () => window.scrollY ?? document.documentElement.scrollTop ?? 0;
    const onScroll = () => setScrollY(readY());
    setScrollY(readY());
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const searchBarVisible = !isHome || scrollY >= HEADER_SEARCH_REVEAL_SCROLL_Y;

  const handleHeaderSearch = (event) => {
    event.preventDefault();
    const trimmed = (searchText || "").trim();
    if (!trimmed) return;
    navigate(`${ROUTES.PRODUCT_LISTING}?search=${encodeURIComponent(trimmed)}&skip=1`);
  };

  return (
    <header
      className={`site-header${scrollY > 4 ? " is-scrolled" : ""}${
        searchBarVisible ? " site-header--search-visible" : ""
      }`}
    >
      <section className="header-sub-actions">
        <Container>
          <div className="header-sub-actions-inner">
            <Link to={ROUTES.HOME} className="header-left-logo" aria-label="UZABULK Home">
              <img src={Logo} alt="UZABULK" className="img-fluid" />
            </Link>
            <form className="header-compact-search" onSubmit={handleHeaderSearch}>
              <ProductSearch
                defaultValue={searchText}
                placeholder="Search products..."
                callback={({ search }) => setSearchText(search || "")}
              />
              <button type="submit">Search</button>
            </form>
            <UserAuthCard className="user_card_below_header" />
          </div>
        </Container>
      </section>
      <section className="header-nav-row">
        <Homemenustrip />
      </section>
    </header>
  );
}
