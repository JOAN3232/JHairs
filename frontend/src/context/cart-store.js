
import { createContext } from "react";

/**
 * JHAIRS — SHARED CART CONTEXT
 *
 * Creates the context object used to pass
 * shopping bag information across the website.
 *
 * Kept in a separate file so React Fast Refresh
 * does not complain about mixed exports.
 */

export const CartContext = createContext(null);
