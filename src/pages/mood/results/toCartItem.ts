import { MenuItem as CartMenuItem } from "../../../hooks/useCart";
import { MenuItem } from "../types/types";

/**
 * The cart's item type and the catalogue's `MenuItem` overlap but don't match
 * (`is_available` vs `isAvailable`, a category union vs a string), while the
 * cart UI reads raw catalogue fields off what it is given — CartDrawer renders
 * `item.image_url`. So the whole item goes in, unmapped, and the structural
 * mismatch is asserted away in exactly one place instead of at every call site.
 */
export const toCartItem = (item: MenuItem): CartMenuItem =>
  ({ ...item, quantity: 1 }) as unknown as CartMenuItem;
