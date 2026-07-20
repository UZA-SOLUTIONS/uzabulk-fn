import { createSlice } from '@reduxjs/toolkit'
import { apiGetBestSalerProducts, apiGetGuaranteedProducts, apiGetHomeBestSalerProducts, apiGetHomeGuaranteedProducts, apiGetHomeNewArrivalProducts, apiGetHomepageFeed, apiGetHomeProducts, apiGetHomeSavingSpotlightProducts, apiGetHomeTopRankingProducts, apiGetNewArrivalProducts, apiGetProductDetail, apiGetProducts, apiGetRecommendedProducts, apiGetSavingSpotlightProducts, apiGetTopRankingProducts } from './actions'
import { paginateFulfilled, paginateInfiniteFulfilled, paginatePending, paginateRejected, paginationInfiniteInitialState, paginationInitialState } from '../../helpers/reduxHelper';

const initialState = {
    products: paginationInfiniteInitialState,
    topRankingProducts: paginationInfiniteInitialState,
    newArrivalProducts: paginationInfiniteInitialState,
    savingSpotlightProducts: paginationInfiniteInitialState,
    guaranteedProducts: paginationInitialState,
    bestSalerProducts: paginationInitialState,

    homeProducts: paginationInitialState,
    homeRecommendedProducts: paginationInitialState,
    homeTopRankingProducts: paginationInitialState,
    homeNewArrivalProducts: paginationInitialState,
    homeSavingSpotlightProducts: paginationInitialState,
    homeGuaranteedProducts: paginationInitialState,
    homeBestSalerProducts: paginationInitialState,

    productDetail: {
        isLoading: false,
        detail: null,
        message: "",
        outOfStock: false,
    },
}

export const slice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        manageProductForCart: (state, action) => {
            state.productDetail.detail = action.payload;
        },
        setAddedInCart: (state, action) => {
            if (action.payload.variation_id) {
                state.productDetail.detail = { ...state.productDetail.detail, variations: state.productDetail.detail.variations.map((variation) => variation._id === action.payload.variation_id ? { ...variation, addedInCart: true } : variation) }
            }
            else {
                state.productDetail.detail.addedInCart = true;
            }
        },
        clearProductList: (state, action) => {
            const payload = action.payload;
            const field = typeof payload === "string" ? payload : payload?.field;
            if (!field) return;
            // Soft refresh: keep current cards visible while page-1 reloads (avoids blank flash).
            if (typeof payload === "object" && payload?.keepItems) {
                state[field].isLoading = true;
                state[field].message = "";
                return;
            }
            state[field] = { ...paginationInfiniteInitialState, isLoading: true };
        },
        clearHomeFeedProducts: (state) => {
            state.homeNewArrivalProducts = { ...paginationInitialState, isLoading: true };
            state.homeRecommendedProducts = { ...paginationInitialState, isLoading: true };
        },
        hydrateProductList: (state, action) => {
            const { items = [], hasMore = true, skip = 1, others = null } = action.payload || {};
            state.products.isLoading = false;
            state.products.message = "";
            state.products.items = items;
            state.products.hasMore = hasMore;
            state.products.skip = skip;
            state.products.others = others;
        },
    },
    extraReducers: (builder) => {
        // Get products
        builder
            .addCase(apiGetProducts.fulfilled, paginateInfiniteFulfilled('products'))
            .addCase(apiGetProducts.pending, paginatePending('products'))
            .addCase(apiGetProducts.rejected, paginateRejected('products'));


        // Top ranking products
        builder
            .addCase(apiGetTopRankingProducts.fulfilled, paginateInfiniteFulfilled('topRankingProducts'))
            .addCase(apiGetTopRankingProducts.pending, paginatePending('topRankingProducts'))
            .addCase(apiGetTopRankingProducts.rejected, paginateRejected('topRankingProducts'));


        // Get new arrival products
        builder
            .addCase(apiGetNewArrivalProducts.fulfilled, paginateInfiniteFulfilled('newArrivalProducts'))
            .addCase(apiGetNewArrivalProducts.pending, paginatePending('newArrivalProducts'))
            .addCase(apiGetNewArrivalProducts.rejected, paginateRejected('newArrivalProducts'));


        // Get saving spotlight products
        builder
            .addCase(apiGetSavingSpotlightProducts.fulfilled, paginateInfiniteFulfilled('savingSpotlightProducts'))
            .addCase(apiGetSavingSpotlightProducts.pending, paginatePending('savingSpotlightProducts'))
            .addCase(apiGetSavingSpotlightProducts.rejected, paginateRejected('savingSpotlightProducts'));


        // Get guaranteed products
        builder
            .addCase(apiGetGuaranteedProducts.fulfilled, paginateFulfilled('guaranteedProducts'))
            .addCase(apiGetGuaranteedProducts.pending, paginatePending('guaranteedProducts'))
            .addCase(apiGetGuaranteedProducts.rejected, paginateRejected('guaranteedProducts'));


        // Get best saler product
        builder
            .addCase(apiGetBestSalerProducts.fulfilled, paginateFulfilled('bestSalerProducts'))
            .addCase(apiGetBestSalerProducts.pending, paginatePending('bestSalerProducts'))
            .addCase(apiGetBestSalerProducts.rejected, paginateRejected('bestSalerProducts'));


        // Get products
        builder
            .addCase(apiGetHomeProducts.fulfilled, paginateFulfilled('homeProducts'))
            .addCase(apiGetHomeProducts.pending, paginatePending('homeProducts'))
            .addCase(apiGetHomeProducts.rejected, paginateRejected('homeProducts'));

        builder
            .addCase(apiGetRecommendedProducts.fulfilled, paginateFulfilled('homeRecommendedProducts'))
            .addCase(apiGetRecommendedProducts.pending, paginatePending('homeRecommendedProducts'))
            .addCase(apiGetRecommendedProducts.rejected, paginateRejected('homeRecommendedProducts'));

        builder
            .addCase(apiGetHomepageFeed.fulfilled, paginateFulfilled('homeRecommendedProducts'))
            .addCase(apiGetHomepageFeed.pending, paginatePending('homeRecommendedProducts'))
            .addCase(apiGetHomepageFeed.rejected, paginateRejected('homeRecommendedProducts'));


        // Top ranking products
        builder
            .addCase(apiGetHomeTopRankingProducts.fulfilled, paginateFulfilled('homeTopRankingProducts'))
            .addCase(apiGetHomeTopRankingProducts.pending, paginatePending('homeTopRankingProducts'))
            .addCase(apiGetHomeTopRankingProducts.rejected, paginateRejected('homeTopRankingProducts'));


        // Get new arrival products
        builder
            .addCase(apiGetHomeNewArrivalProducts.fulfilled, paginateFulfilled('homeNewArrivalProducts'))
            .addCase(apiGetHomeNewArrivalProducts.pending, paginatePending('homeNewArrivalProducts'))
            .addCase(apiGetHomeNewArrivalProducts.rejected, paginateRejected('homeNewArrivalProducts'));


        // Get saving spotlight products
        builder
            .addCase(apiGetHomeSavingSpotlightProducts.fulfilled, paginateFulfilled('homeSavingSpotlightProducts'))
            .addCase(apiGetHomeSavingSpotlightProducts.pending, paginatePending('homeSavingSpotlightProducts'))
            .addCase(apiGetHomeSavingSpotlightProducts.rejected, paginateRejected('homeSavingSpotlightProducts'));


        // Get guaranteed products
        builder
            .addCase(apiGetHomeGuaranteedProducts.fulfilled, paginateFulfilled('homeGuaranteedProducts'))
            .addCase(apiGetHomeGuaranteedProducts.pending, paginatePending('homeGuaranteedProducts'))
            .addCase(apiGetHomeGuaranteedProducts.rejected, paginateRejected('homeGuaranteedProducts'));


        // Get best saler product
        builder
            .addCase(apiGetHomeBestSalerProducts.fulfilled, paginateFulfilled('homeBestSalerProducts'))
            .addCase(apiGetHomeBestSalerProducts.pending, paginatePending('homeBestSalerProducts'))
            .addCase(apiGetHomeBestSalerProducts.rejected, paginateRejected('homeBestSalerProducts'));


        // Get product detail
        builder
            .addCase(apiGetProductDetail.fulfilled, (state, action) => {
                state.productDetail.isLoading = false;
                state.productDetail.message = "";
                if (action.payload?.data?.attributes?.length) {
                    action.payload.data.attributes = action.payload?.data?.attributes?.map((attribute, index) => {
                        attribute.terms = attribute?.terms.map((term, idx) => {
                            term.active = idx === 0;
                            return term;
                        });
                        return { ...attribute };
                    })
                }
                state.productDetail.detail = action.payload?.data;
                state.productDetail.outOfStock = action.payload?.outOfStock;
            })
            .addCase(apiGetProductDetail.pending, (state) => {
                state.productDetail.isLoading = true;
                state.productDetail.message = "";
                state.productDetail.detail = null;
                state.productDetail.outOfStock = false;
            })
            .addCase(apiGetProductDetail.rejected, (state, action) => {
                state.productDetail.isLoading = false;
                state.productDetail.detail = null;
                state.productDetail.message = action.payload || action.error?.message || "Product not found!";
                state.productDetail.outOfStock = false;
            });
    },
})

export const { manageProductForCart, clearProductList, clearHomeFeedProducts, setAddedInCart, hydrateProductList } = slice.actions

export default slice.reducer