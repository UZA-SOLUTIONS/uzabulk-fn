import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiGet } from "../../helpers/apiHelper";
import {
  buildFetchCacheKey,
  getFetchCacheEntry,
  setFetchCacheEntry,
} from "../../helpers/fetchCacheHelper";
import { CATEGORIES } from "../../helpers/urlHelper";
import { setCachedCategoriesByLevel } from "../../helpers/categoriesSessionCache";
import { SOURCE_APPLICATION, TOP_CATEGORIES } from "../../helpers/storeHelper";

const getCategories = (url, localQuery) => async (query, Thunk) => {
  try {
    // const hasData = getStorageList(localQuery);
    // if (hasData !== false)
    //   return hasData;

    const res = await apiGet(url, query);
    if (res.status === "success") {
      // setStorageList(localQuery, res?.data || []);
      return res.data;
    } else {
      throw new Error(res.message);
    }
  } catch (error) {
    return Thunk.rejectWithValue(
      error.message || "Something went wrong, please try again later."
    );
  }
};

export const apiGetCategories = createAsyncThunk(
  "apiGetCategories",
  async ({ level = 1 }, Thunk) => {
    try {
      const cacheKey = `categories:${buildFetchCacheKey(CATEGORIES.LIST_BY_LEVEL, { level })}`;
      const cached = getFetchCacheEntry(cacheKey);
      if (cached) return cached;

      const res = await apiGet(CATEGORIES.LIST_BY_LEVEL, { level });
      if (res.status === "success") {
        const payload = [level, res.data];
        setCachedCategoriesByLevel(level, res.data);
        setFetchCacheEntry(cacheKey, payload);
        return payload;
      }
      throw new Error(res.message);
    } catch (error) {
      return Thunk.rejectWithValue(
        error.message || "Something went wrong, please try again later."
      );
    }
  }
);
export const apiGetTopCategories = createAsyncThunk(
  "apiGetTopCategories",
  getCategories(CATEGORIES.TOP_CATEGORIES, TOP_CATEGORIES)
);
export const apiGetSourceByApplication = createAsyncThunk(
  "apiGetSourceByApplication",
  getCategories(CATEGORIES.SOURCE_APPLICATION, SOURCE_APPLICATION)
);
