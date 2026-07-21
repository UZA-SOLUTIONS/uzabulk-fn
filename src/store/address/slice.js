import { createSlice } from "@reduxjs/toolkit";
import {
  apiAddAddress,
  apiGetAddress,
  apiGetAddresses,
  apiMakeDefaultAddress,
  apiUpdateAddress,
} from "./actions";
import {
  paginateFulfilled,
  paginatePending,
  paginateRejected,
  paginationInitialState,
} from "../../helpers/reduxHelper";

const initialState = {
  addresses: paginationInitialState,
  addressDetail: {
    isLoading: false,
    detail: null,
  },
  shippingAddress: {
    isLoading: false,
    detail: null,
  },
  billingAddress: {
    isLoading: false,
    detail: null,
  },
  isLoading: false,
};

export const slice = createSlice({
  name: "address",
  initialState,
  reducers: {
    clearAddressDetails: (state, action) => {
      state.addressDetail.detail = null;
    },
    setShippingAddress: (state, action) => {
      state.shippingAddress.detail = action.payload;
    },
    setBillingAddress: (state, action) => {
      state.billingAddress.detail = action.payload;
    },
    setDefaultAddress: (state) => {
      const items = state.addresses?.items || [];
      if (!items.length) return;
      // Prefer the marked default address; otherwise use the first saved address.
      const preferred =
        items.find((address) => address?.default === true)
        || items.find((address) => address?.isDefault === true)
        || items[0];
      if (!preferred?._id) return;
      state.billingAddress.detail = preferred;
      state.shippingAddress.detail = preferred;
    },
  },
  extraReducers: (builder) => {
    // List addresses
    builder
      .addCase(apiGetAddresses.fulfilled, paginateFulfilled("addresses"))
      .addCase(apiGetAddresses.pending, paginatePending("addresses"))
      .addCase(apiGetAddresses.rejected, paginateRejected("addresses"));

    // Get single address
    builder
      .addCase(apiGetAddress.fulfilled, (state, action) => {
        state.addressDetail.isLoading = false;
        state.addressDetail.detail = action.payload;
      })
      .addCase(apiGetAddress.pending, (state, action) => {
        state.addressDetail.isLoading = true;
      })
      .addCase(apiGetAddress.rejected, (state, action) => {
        state.addressDetail.isLoading = false;
      });

    // Add address
    builder
      .addCase(apiAddAddress.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(apiAddAddress.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(apiAddAddress.rejected, (state, action) => {
        state.isLoading = false;
      });

    // Update address
    builder
      .addCase(apiUpdateAddress.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(apiUpdateAddress.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(apiUpdateAddress.rejected, (state, action) => {
        state.isLoading = false;
      });

    // Make default address
    builder
      .addCase(apiMakeDefaultAddress.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(apiMakeDefaultAddress.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(apiMakeDefaultAddress.rejected, (state, action) => {
        state.isLoading = false;
      });
  },
});

export const { clearAddressDetails, setShippingAddress, setBillingAddress, setDefaultAddress } = slice.actions;

export default slice.reducer;
