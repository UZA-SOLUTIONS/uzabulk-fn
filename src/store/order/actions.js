import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiGet, apiPost } from "../../helpers/apiHelper";
import { ORDER } from "../../helpers/urlHelper";

export const apiCheckout = createAsyncThunk(
  "apiCheckout",
  async ({ data, callback, signal = null }, Thunk) => {
    try {
      const res = await apiPost(ORDER.CHECKOUT, data, signal ? { signal } : {});
      if (res.status === "success") {
        if (typeof callback === "function") callback(res);
        return res;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      const isCanceled = error?.code === "ERR_CANCELED"
        || error?.name === "CanceledError"
        || error?.name === "AbortError";
      if (isCanceled) {
        return Thunk.rejectWithValue({ aborted: true });
      }
      return Thunk.rejectWithValue(
        error.message || "Something went wrong, please try again later."
      );
    }
  }
);

export const apiPlaceOrder = createAsyncThunk(
  "apiPlaceOrder",
  async ({ data, callback }, Thunk) => {
    try {
      const res = await apiPost(ORDER.PLACE, data);
      if (res.status === "success") {
        callback(res);
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

export const apiGetOrders = createAsyncThunk(
  "apiGetOrders",
  async (params, Thunk) => {
    try {
      const res = await apiGet(ORDER.LIST, params);
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
  }
);


export const apiGetOrderDetail = createAsyncThunk(
  "apiGetOrderDetail",
  async (id, Thunk) => {
    try {
      const res = await apiGet(ORDER.DETAIL + "/" + id);
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
  }
);
