import { createAsyncThunk } from "@reduxjs/toolkit";
import apiClient, { apiGet } from "../../helpers/apiHelper";
import { PRODUCTS } from "../../helpers/urlHelper";

const hasNetworkConnection = () =>
  typeof navigator === "undefined" || navigator.onLine !== false;

const getProducts = (url) => async (query, Thunk) => {
  try {
    if (!hasNetworkConnection()) {
      return Thunk.rejectWithValue("No internet connection. Please reconnect and try again.");
    }
    const res = await apiGet(url, query);
    if (res.status === "success") {
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

export const apiGetProducts = createAsyncThunk(
  "apiGetProducts",
  async ({ query, signal = null }, Thunk) => {
    try {
      if (!hasNetworkConnection()) {
        return Thunk.rejectWithValue("No internet connection. Please reconnect and try again.");
      }
      const res = await apiClient.get(PRODUCTS.LIST, { params: query, signal });
      if (res.status === "success") {
        return res?.data;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      return Thunk.rejectWithValue(
        error.message || "Something went wrong, please try again later."
      );
    }
  }
);
export const apiGetTopRankingProducts = createAsyncThunk(
  "apiGetTopRankingProducts",
  getProducts(PRODUCTS.TOP_RANKING)
);
export const apiGetNewArrivalProducts = createAsyncThunk(
  "apiGetNewArrivalProducts",
  getProducts(PRODUCTS.NEW_ARRIVAL)
);
export const apiGetSavingSpotlightProducts = createAsyncThunk(
  "apiGetSavingSpotlightProducts",
  getProducts(PRODUCTS.SAVING_SPOTLIGHT)
);
export const apiGetGuaranteedProducts = createAsyncThunk(
  "apiGetGuaranteedProducts",
  getProducts(PRODUCTS.GUARANTED)
);
export const apiGetBestSalerProducts = createAsyncThunk(
  "apiGetBestSalerProducts",
  getProducts(PRODUCTS.LIST)
);


export const apiGetHomeProducts = createAsyncThunk(
  "apiGetHomeProducts",
  getProducts(PRODUCTS.LIST)
);
export const apiGetRecommendedProducts = createAsyncThunk(
  "apiGetRecommendedProducts",
  getProducts(PRODUCTS.RECOMMENDED)
);
export const apiGetHomeTopRankingProducts = createAsyncThunk(
  "apiGetHomeTopRankingProducts",
  getProducts(PRODUCTS.TOP_RANKING)
);
export const apiGetHomeNewArrivalProducts = createAsyncThunk(
  "apiGetHomeNewArrivalProducts",
  getProducts(PRODUCTS.NEW_ARRIVAL)
);
export const apiGetHomeSavingSpotlightProducts = createAsyncThunk(
  "apiGetHomeSavingSpotlightProducts",
  getProducts(PRODUCTS.SAVING_SPOTLIGHT)
);
export const apiGetHomeGuaranteedProducts = createAsyncThunk(
  "apiGetHomeGuaranteedProducts",
  getProducts(PRODUCTS.GUARANTED)
);
export const apiGetHomeBestSalerProducts = createAsyncThunk(
  "apiGetHomeBestSalerProducts",
  getProducts(PRODUCTS.LIST)
);

// Get single product details
export const apiGetProductDetail = createAsyncThunk(
  "apiGetProductDetail",
  async (query, Thunk) => {
    try {
      const { id, ...restQuery } = query || {};
      const normalizedId = String(id || "").trim();
      const isObjectId = /^[a-fA-F0-9]{24}$/.test(normalizedId);
      if (!isObjectId) {
        return Thunk.rejectWithValue("Invalid product id.");
      }

      const res = await apiGet(`${PRODUCTS.DETAIL}/${encodeURIComponent(normalizedId)}`, restQuery);
      if (res.status === "success") {
        return res;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      return Thunk.rejectWithValue(
        error.message || "Something went wrong, please try again later."
      );
    }
  }
);
