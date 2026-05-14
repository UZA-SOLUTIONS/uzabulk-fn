import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

import ROUTES from "../../helpers/routesHelper";
import { apiGet } from "../../helpers/apiHelper";
import { getProductImageUrl } from "../../helpers/commonHelper";
import {
  getHomeCategoryCircleImage,
  setHomeCategoryCircleImage,
} from "../../helpers/homeCategoryCircleImageCache";
import { PRODUCTS } from "../../helpers/urlHelper";
import UXSkeleton from "../Common/UXSkeleton";

const IMAGE_FETCH_CONCURRENCY = 4;

export default function CategoryCircleSlider() {
  const level1Categories = useSelector((s) => s.categories.categories.level1 || []);
  const level2Categories = useSelector((s) => s.categories.categories.level2 || []);
  const [imageTick, setImageTick] = useState(0);
  const [isFetchingImages, setIsFetchingImages] = useState(false);

  const categoriesToShow = useMemo(() => {
    const base = (level1Categories?.length ? level1Categories : level2Categories) || [];
    return base.slice(0, 12);
  }, [level1Categories, level2Categories]);

  const categoryIdsKey = useMemo(
    () => categoriesToShow.map((c) => c?._id).filter(Boolean).join(","),
    [categoriesToShow]
  );

  const categoriesToShowRef = useRef(categoriesToShow);
  categoriesToShowRef.current = categoriesToShow;

  useEffect(() => {
    if (!categoryIdsKey) return;
    let cancelled = false;

    const loadCategoryProductImages = async () => {
      const cats = categoriesToShowRef.current;
      const missing = cats.filter(
        (c) => c?._id && !c?.catImage?.link && !getHomeCategoryCircleImage(c._id)
      );
      if (!missing.length) {
        setIsFetchingImages(false);
        return;
      }

      setIsFetchingImages(true);
      try {
        for (let i = 0; i < missing.length; i += IMAGE_FETCH_CONCURRENCY) {
          if (cancelled) break;
          const chunk = missing.slice(i, i + IMAGE_FETCH_CONCURRENCY);
          const resolved = await Promise.all(
            chunk.map(async (category) => {
              try {
                const res = await apiGet(PRODUCTS.LIST, {
                  category: category._id,
                  limit: 1,
                  skip: 1,
                });
                const product = res?.data?.items?.[0];
                return [category._id, getProductImageUrl(product, "")];
              } catch {
                return [category._id, ""];
              }
            })
          );

          if (cancelled) break;
          resolved.forEach(([categoryId, imageUrl]) => {
            if (categoryId && imageUrl) setHomeCategoryCircleImage(categoryId, imageUrl);
          });
        }
      } finally {
        if (!cancelled) {
          setIsFetchingImages(false);
          setImageTick((t) => t + 1);
        }
      }
    };

    loadCategoryProductImages();
    return () => {
      cancelled = true;
    };
  }, [categoryIdsKey]);

  const categoriesWithImages = useMemo(
    () =>
      categoriesToShow
        .map((category) => {
          const id = category?._id;
          const fromCat = category?.catImage?.link;
          const resolvedImage = fromCat || (id ? getHomeCategoryCircleImage(id) : "") || "";
          return { ...category, resolvedImage };
        })
        .filter((c) => !!c.resolvedImage),
    [categoriesToShow, imageTick]
  );

  const repeatCount = categoriesWithImages.length
    ? Math.max(3, Math.ceil(24 / categoriesWithImages.length))
    : 0;
  const animatedCategories = repeatCount
    ? Array.from({ length: repeatCount }, () => categoriesWithImages).flat()
    : [];
  const shiftPercent = repeatCount ? (100 / repeatCount).toFixed(4) : "50";

  if (!categoriesToShow.length) {
    return (
      <section className="home_category_circle_slider_wrap py-3">
        <div className="card_top_head d-flex align-items-center justify-content-center mb-3 text-center">
          <h4 className="home_category_circle_title mb-2">Categories for you</h4>
        </div>
        <UXSkeleton type="category-circles" count={10} />
      </section>
    );
  }

  if (isFetchingImages) {
    return (
      <section className="home_category_circle_slider_wrap py-3">
        <div className="card_top_head d-flex align-items-center justify-content-center mb-3 text-center">
          <h4 className="home_category_circle_title mb-2">Categories for you</h4>
        </div>
        <UXSkeleton type="category-circles" count={10} />
      </section>
    );
  }

  if (!categoriesWithImages.length) {
    return null;
  }

  return (
    <section className="home_category_circle_slider_wrap py-3">
      <div className="card_top_head d-flex align-items-center justify-content-center mb-3 text-center">
        <h4 className="home_category_circle_title mb-2">Categories for you</h4>
      </div>
      <div className="home_category_circle_slider">
        <div
          className="home_category_circle_track"
          style={{ "--marquee-shift": `${shiftPercent}%` }}
        >
          {animatedCategories.map((category, index) => (
            <Link
              to={`${ROUTES.PRODUCT_LISTING}?skip=1&category=${category?._id}&name=${encodeURIComponent(
                category?.catName || "Category"
              )}`}
              className="home_category_circle_item"
              key={`${category?._id || "cat"}-${index}`}
            >
              <div className="home_category_circle_image">
                <img
                  src={category?.resolvedImage}
                  alt={category?.catName || "Category"}
                />
              </div>
              <p>{category?.catName || "Category"}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
