import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import ROUTES from "../../helpers/routesHelper";
import { apiGet } from "../../helpers/apiHelper";
import { getProductImageUrl } from "../../helpers/commonHelper";
import { PRODUCTS } from "../../helpers/urlHelper";
import { apiGetCategories } from "../../store/categories/actions";
import UXSkeleton from "../Common/UXSkeleton";

export default function CategoryCircleSlider() {
  const dispatch = useDispatch();
  const level1Categories = useSelector((s) => s.categories.categories.level1 || []);
  const level2Categories = useSelector((s) => s.categories.categories.level2 || []);
  const [categoryProductImages, setCategoryProductImages] = useState({});
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  useEffect(() => {
    if (!level1Categories?.length) {
      dispatch(apiGetCategories({ level: 1 }));
    }
    if (!level2Categories?.length) {
      dispatch(apiGetCategories({ level: 2 }));
    }
  }, [dispatch, level1Categories?.length, level2Categories?.length]);

  const baseCategories = (level1Categories?.length ? level1Categories : level2Categories) || [];
  const categoriesToShow = baseCategories.slice(0, 12);
  const categoriesWithImages = categoriesToShow
    .map((category) => ({
      ...category,
      resolvedImage: categoryProductImages[category?._id] || category?.catImage?.link || "",
    }))
    .filter((category) => !!category?.resolvedImage);
  const repeatCount = categoriesWithImages.length
    ? Math.max(3, Math.ceil(24 / categoriesWithImages.length))
    : 0;
  const animatedCategories = repeatCount
    ? Array.from({ length: repeatCount }, () => categoriesWithImages).flat()
    : [];
  const shiftPercent = repeatCount ? (100 / repeatCount).toFixed(4) : "50";

  useEffect(() => {
    let isCancelled = false;

    const loadCategoryProductImages = async () => {
      if (!categoriesToShow.length) return;

      const categoryWithMissingImage = categoriesToShow.filter((category) => !category?.catImage?.link);
      if (!categoryWithMissingImage.length) return;
      setIsLoadingImages(true);

      const resolved = await Promise.all(
        categoryWithMissingImage.map(async (category) => {
          try {
            const res = await apiGet(PRODUCTS.LIST, {
              category: category?._id,
              limit: 1,
              skip: 1,
            });
            const product = res?.data?.items?.[0];
            return [category?._id, getProductImageUrl(product, "")];
          } catch (error) {
            return [category?._id, ""];
          }
        })
      );

      if (!isCancelled) {
        const next = {};
        resolved.forEach(([categoryId, imageUrl]) => {
          if (categoryId && imageUrl) next[categoryId] = imageUrl;
        });
        setCategoryProductImages(next);
        setIsLoadingImages(false);
      }
    };

    loadCategoryProductImages();
    return () => {
      isCancelled = true;
    };
  }, [categoriesToShow]);

  if (!categoriesToShow.length || (isLoadingImages && !categoriesWithImages.length)) {
    return (
      <section className="home_category_circle_slider_wrap py-3">
        <div className="card_top_head d-flex align-items-center justify-content-center mb-3 text-center">
          <h4 className="home_category_circle_title mb-2">Categories for you</h4>
        </div>
        <UXSkeleton type="category-circles" count={10} />
      </section>
    );
  }

  if (!categoriesWithImages.length) return null;

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
