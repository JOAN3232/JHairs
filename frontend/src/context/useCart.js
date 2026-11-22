import { useContext } from "react";
import { CartContext } from "./cart-store.js";

/**
 * JHAIRS — USE CART HOOK
 *
 * Lets any component access the shopping bag.
 *
 * Example:
 * const { addToCart, cartItems } = useCart();
 */

export function useCart() {
  // Read the data from the nearest CartProvider.
  const context = useContext(CartContext);

  // Prevent using this hook outside the provider.
  if (context === null) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  // Return all cart information and functions.
  return context;
}
