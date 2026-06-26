import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import ROUTES from "../../helpers/routesHelper";
import { apiGetCategories } from "../../store/categories/actions";
import useCategoryDisplayName from "../../hooks/useCategoryDisplayName";
import placeholder from "../../assets/images/gurfive.jpg";

function Level1CategoryLink({ category, hasChildren, onHover, onClick }) {
  const { t } = useTranslation();
  const displayName = useCategoryDisplayName(category) || t("home.categoryFallback");

  return (
    <Link
      className="home_category_link"
      onClick={onClick}
      onMouseEnter={onHover}
      to={`${ROUTES.PRODUCT_LISTING}?category=${category._id}&name=${encodeURIComponent(displayName)}`}
    >
      <span className="home_category_name">{displayName}</span>
      {hasChildren ? <span className="home_category_chevron">{">"}</span> : null}
    </Link>
  );
}

function Level2Section({ level2, children }) {
  const { t } = useTranslation();
  const displayName = useCategoryDisplayName(level2) || t("home.categoryFallback");

  return (
    <div className="home_categories_section">
      <div className="home_categories_section_header">
        <h6>{displayName}</h6>
        <Link
          to={`${ROUTES.PRODUCT_LISTING}?category=${level2._id}&name=${encodeURIComponent(displayName)}`}
        >
          {t("home.browseFeaturedSelections")}
        </Link>
      </div>
      <ul className="home_categories_section_items">{children}</ul>
    </div>
  );
}

function Level3CategoryLink({ item }) {
  const { t } = useTranslation();
  const displayName = useCategoryDisplayName(item) || t("home.categoryFallback");

  return (
    <li>
      <Link
        to={`${ROUTES.PRODUCT_LISTING}?category=${item._id}&name=${encodeURIComponent(displayName)}`}
      >
        <span className="home_categories_circle_image">
          <img src={item?.catImage?.link || placeholder} alt={displayName} />
        </span>
        <span>{displayName}</span>
      </Link>
    </li>
  );
}

const HomeCategoriesSidebar = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const level1Categories = useSelector((s) => s.categories.categories.level1 || []);
  const level2Categories = useSelector((s) => s.categories.categories.level2 || []);
  const level3Categories = useSelector((s) => s.categories.categories.level3 || []);
  const [activeLevel1Id, setActiveLevel1Id] = useState("");
  const [isMegaOpen, setIsMegaOpen] = useState(false);

  useEffect(() => {
    if (!level1Categories?.length) {
      dispatch(apiGetCategories({ level: 1 }));
    }
    if (!level2Categories?.length) {
      dispatch(apiGetCategories({ level: 2 }));
    }
    if (!level3Categories?.length) {
      dispatch(apiGetCategories({ level: 3 }));
    }
  }, [dispatch, level1Categories?.length, level2Categories?.length, level3Categories?.length]);

  useEffect(() => {
    if (!activeLevel1Id && level1Categories?.length) {
      setActiveLevel1Id(level1Categories[0]?._id || "");
    }
  }, [activeLevel1Id, level1Categories]);

  const level2ByParent = useMemo(
    () => level2Categories.filter((item) => item.parent === activeLevel1Id),
    [level2Categories, activeLevel1Id]
  );

  const level3Grouped = useMemo(() => {
    const grouped = {};
    level3Categories.forEach((item) => {
      if (!item?.parent) return;
      if (!grouped[item.parent]) grouped[item.parent] = [];
      grouped[item.parent].push(item);
    });
    return grouped;
  }, [level3Categories]);

  return (
    <div
      className="home_categories_sidebar_wrap"
      onMouseLeave={() => setIsMegaOpen(false)}
    >
      <h5 className="home_categories_title">{t("home.categoriesForYou")}</h5>
      <div className={`home_categories_shell ${isMegaOpen && level2ByParent?.length ? "is-open" : ""}`}>
        <div className="alibaba_category_panel home_categories_sidebar h-100">
          <ul>
            {level1Categories.map((category) => {
              const hasChildren = level2Categories.some((item) => item.parent === category._id);
              return (
                <li
                  key={category._id}
                  className={activeLevel1Id === category._id ? "active" : ""}
                  onMouseEnter={() => {
                    setActiveLevel1Id(category._id);
                    setIsMegaOpen(true);
                  }}
                >
                  <Level1CategoryLink
                    category={category}
                    hasChildren={hasChildren}
                    onHover={() => {
                      setActiveLevel1Id(category._id);
                      setIsMegaOpen(true);
                    }}
                    onClick={(e) => {
                      if (!hasChildren) return;
                      const isCompactScreen = window.matchMedia("(max-width: 1199px)").matches;
                      if (!isCompactScreen) return;
                      const alreadyOpen = isMegaOpen && activeLevel1Id === category._id;
                      if (!alreadyOpen) {
                        e.preventDefault();
                        setActiveLevel1Id(category._id);
                        setIsMegaOpen(true);
                      }
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
        {isMegaOpen && level2ByParent?.length ? (
          <div className="home_categories_mega">
            <div className="home_categories_mega_scroll">
              {level2ByParent.map((level2) => {
                const children = (level3Grouped[level2._id] || []).slice(0, 8);
                return (
                  <Level2Section key={level2._id} level2={level2}>
                    {children.map((item) => (
                      <Level3CategoryLink key={item._id} item={item} />
                    ))}
                  </Level2Section>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HomeCategoriesSidebar;
