import { updateAuthInfo } from "./authHelper";

export const paginationInitialState = {
  isLoading: false,
  items: [],
  total: 0,
  skip: 0,
  limit: 10,
  totalPages: 0,
  message: "",
};

export const paginationInfiniteInitialState = {
  skip: 1,
  isLoading: false,
  items: [],
  hasMore: true,
  others: null,
};

export const paginateFulfilled = (field) => (state, action) => {
  state[field].isLoading = false;
  state[field].items = action.payload.items;
  state[field].total = action.payload.total;
  state[field].skip = action.payload.skip;
  state[field].limit = action.payload.limit;
  state[field].totalPages = action.payload.totalPages;
};

export const paginatePending = (field) => (state, action) => {
  state[field].isLoading = true;
  state[field].message = "";
};

export const paginateRejected = (field) => (state, action) => {
  state[field].isLoading = false;
  state[field].message = action.payload;
};

export const paginateInfiniteFulfilled = (field) => (state, action) => {
  state[field].isLoading = false;
  const { items, skip, limit, others = null, hasMore: payloadHasMore } = action.payload;
  state[field].items = skip === 1 ? items : [...state[field].items, ...items];
  state[field].hasMore =
    typeof payloadHasMore === "boolean" ? payloadHasMore : items?.length === limit;
  state[field].skip = skip;
  state[field].others = others;
};

export const loginSuccess = (state, action) => {
  state.message = "";
  state.isLoading = false;
  state.user = action.payload.user;
  state.authToken = action.payload.token;
  state.isLogin = true;
  updateAuthInfo(state.authToken, state.user);
};

export const pendingState = (state, action) => {
  state.isLoading = true;
  state.message = "";
}

export const failedState = (state, action) => {
  state.isLoading = false;
  state.message = action.payload;
}