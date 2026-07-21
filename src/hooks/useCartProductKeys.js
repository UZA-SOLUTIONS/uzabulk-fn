import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getProductDedupeKey } from "../helpers/commonHelper";
import { apiGetCartList } from "../store/cart/actions";

/** Collect product identity keys for items currently in the cart. */
export function getCartProductKeys(cartList = []) {
  const keys = new Set();
  (Array.isArray(cartList) ? cartList : []).forEach((cart) => {
    const product = cart?.product || cart;
    const key = getProductDedupeKey(product);
    if (key) keys.add(key);
  });
  return keys;
}

/** Cart product keys + helpers for "In cart" badges across product cards. */
export default function useCartProductKeys() {
  const dispatch = useDispatch();
  const isLogin = useSelector((s) => s.auth.isLogin);
  const cartCount = useSelector((s) => s.cart.count);
  const cartList = useSelector((s) => s.cart.cartList);

  useEffect(() => {
    if (!isLogin) return;
    if (Number(cartCount) <= 0) return;
    if (cartList?.length) return;
    dispatch(apiGetCartList({}));
  }, [isLogin, cartCount, cartList?.length, dispatch]);

  const keys = useMemo(() => getCartProductKeys(cartList), [cartList]);

  const isInCart = useMemo(() => {
    return (product) => {
      const key = getProductDedupeKey(product);
      return Boolean(key && keys.has(key));
    };
  }, [keys]);

  return { keys, isInCart, hasCartItems: keys.size > 0 };
}
