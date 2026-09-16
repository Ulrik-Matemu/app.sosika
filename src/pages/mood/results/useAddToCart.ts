import { useCallback, useEffect, useRef, useState } from "react";
import { useCartContext } from "../../../context/cartContext";
import { triggerAddToCartToast } from "../../../components/my-components/AddToCartToast";
import posthog from "../../../lib/posthog";
import { MenuItem } from "../types/types";
import { toCartItem } from "./toCartItem";

/**
 * The add-to-cart states a results row can be in.
 *
 * The design canvas also specifies an "Adding" spinner, but `addToCart` is
 * synchronous state — there is nothing to wait for — so showing a spinner
 * would be invented latency. Idle goes straight to added.
 */
export type AddState = "idle" | "added" | "closed" | "soldout";

const ADDED_MS = 1200;

export function useAddToCart(item: MenuItem, isVendorOpen: boolean, source: string) {
  const { addToCart } = useCartContext();
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const isAvailable = item.is_available !== false;
  const canAdd = isAvailable && isVendorOpen;

  const state: AddState = !isAvailable
    ? "soldout"
    : !isVendorOpen
    ? "closed"
    : justAdded
    ? "added"
    : "idle";

  const add = useCallback(() => {
    if (!canAdd || justAdded) return;
    addToCart(toCartItem(item));
    triggerAddToCartToast(item);
    posthog.capture("order_started", {
      platform: "app",
      item_id: item.id,
      item_name: item.name,
      source,
    });
    setJustAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), ADDED_MS);
  }, [addToCart, canAdd, item, justAdded, source]);

  const label =
    state === "soldout"
      ? `${item.name} is sold out`
      : state === "closed"
      ? `${item.name} is unavailable — the kitchen is closed`
      : `Add ${item.name} to cart`;

  return { state, add, canAdd, label };
}
