
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { CartContext } from "./cart-store.js";
import { fetchProductById } from "../services/productApi.js";

/**
 * JHAIRS — INVENTORY-AWARE SHOPPING BAG
 *
 * Existing features:
 * - Add products and variations.
 * - Remove products.
 * - Update quantities.
 * - Calculate cart count and subtotal.
 * - Open and close the shopping drawer.
 * - Save the cart in localStorage.
 *
 * New features:
 * - Check live product inventory when the cart opens.
 * - Recheck inventory when cart selections change.
 * - Detect sold-out product variations.
 * - Prevent increasing quantity beyond verified stock.
 * - Keep unavailable items visible for the customer
 *   to review or remove.
 *
 * IMPORTANT:
 * These checks are not a stock reservation.
 * The backend must verify stock again at checkout.
 */

// ============================================
// LOCAL STORAGE CONFIGURATION
// ============================================

const CART_STORAGE_KEY = "jhairs-shopping-bag";

// ============================================
// CART ITEM VALIDATION
// ============================================

function validCartItem(item) {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.cartKey === "string" &&
    typeof item.productId !== "undefined" &&
    typeof item.name === "string" &&
    typeof item.unitPrice === "number" &&
    Number.isFinite(item.unitPrice) &&
    item.unitPrice >= 0 &&
    Number.isSafeInteger(item.quantity) &&
    item.quantity >= 1
  );
}

// ============================================
// LOAD PREVIOUSLY SAVED CART
// ============================================

function loadSavedCart() {
  try {
    // Support environments where localStorage
    // is not available.
    if (typeof window === "undefined") {
      return [];
    }

    const savedCart = window.localStorage.getItem(
      CART_STORAGE_KEY
    );

    if (!savedCart) {
      return [];
    }

    const parsedCart = JSON.parse(savedCart);

    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart
      .filter(validCartItem)
      .map((item) => ({
        ...item,

        // Never trust stock information saved
        // during a previous browsing session.
        availableStock: null,
        stockStatus: "unchecked",
        stockMessage: "",
      }));
  } catch (error) {
    console.error(
      "JHAIRS: Could not load saved cart.",
      error
    );

    return [];
  }
}

// ============================================
// UNIQUE CART ITEM KEY
// ============================================

function createCartKey(item) {
  /**
   * Different variations of the same product
   * must be separate items in the cart.
   */
  return JSON.stringify([
    item.productId,
    item.color,
    item.length,
    item.density || "",
    item.laceType || "",
  ]);
}

// ============================================
// FIND MATCHING INVENTORY RECORD
// ============================================

function findVariantStock(product, item) {
  const matchingVariation = (
    product.inventory || []
  ).find(
    (inventoryItem) =>
      inventoryItem.color === item.color &&
      Number(inventoryItem.length) ===
        Number(item.length) &&
      (inventoryItem.density || "") ===
        (item.density || "") &&
      (inventoryItem.laceType || "") ===
        (item.laceType || "")
  );

  // Missing inventory records mean zero stock.
  const stock = matchingVariation?.stock ?? 0;

  return Number.isSafeInteger(stock) && stock > 0
    ? stock
    : 0;
}

// ============================================
// SHOPPING BAG PROVIDER
// ============================================

export function CartProvider({ children }) {
  // Shopping cart products and variations.
  const [cartItems, setCartItems] =
    useState(loadSavedCart);

  // Drawer visibility.
  const [isCartOpen, setIsCartOpen] =
    useState(false);

  /**
   * This signature changes when the contents or
   * quantities change, but NOT when we update
   * stock messages.
   *
   * That prevents our stock-checking effect
   * from continuously calling itself.
   */
  const cartSignature = useMemo(
    () =>
      JSON.stringify(
        cartItems.map((item) => [
          item.cartKey,
          item.quantity,
        ])
      ),
    [cartItems]
  );

  // ==========================================
  // SAVE CART TO LOCAL STORAGE
  // ==========================================

  useEffect(() => {
    try {
      /**
       * Save product details and quantities.
       *
       * Do not persist stock availability because
       * MongoDB inventory can change at any time.
       */
      const savedItems = cartItems.map(
        ({
          availableStock,
          stockStatus,
          stockMessage,
          ...item
        }) => {
          // These fields are intentionally omitted
          // from localStorage, not from the live cart.
          void availableStock;
          void stockStatus;
          void stockMessage;

          return item;
        }
      );

      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(savedItems)
      );
    } catch (error) {
      console.error(
        "JHAIRS: Could not save shopping bag.",
        error
      );
    }
  }, [cartItems]);

  // ==========================================
  // CHECK LIVE CART INVENTORY
  // ==========================================

  useEffect(() => {
    // Only validate while the drawer is open.
    if (!isCartOpen) {
      return;
    }

    // Nothing to check if the bag is empty.
    if (cartSignature === "[]") {
      return;
    }

    let cancelled = false;

    async function checkCartStock() {
      /**
       * Read the latest shopping bag selections
       * from the signature that triggered this check.
       */
      const selections = JSON.parse(cartSignature);

      // Avoid fetching the same product repeatedly
      // when the cart contains multiple variations.
      const uniqueProductIds = [
        ...new Set(
          selections.map(([cartKey]) => {
            try {
              return JSON.parse(cartKey)[0];
            } catch {
              return null;
            }
          })
        ),
      ].filter(
        (id) => id !== null && id !== undefined
      );

      const results = await Promise.all(
        uniqueProductIds.map(async (productId) => {
          try {
            const product = await fetchProductById(
              productId
            );

            return [
              String(productId),
              { product, error: null },
            ];
          } catch (error) {
            return [
              String(productId),
              { product: null, error },
            ];
          }
        })
      );

      // Ignore outdated requests when the user
      // closes the drawer or changes the selection.
      if (cancelled) {
        return;
      }

      const productResults = new Map(results);

      setCartItems((previousItems) =>
        previousItems.map((item) => {
          const result = productResults.get(
            String(item.productId)
          );

          // A deleted or unpublished product is
          // no longer available to customers.
          if (result?.error?.status === 404) {
            return {
              ...item,
              availableStock: 0,
              stockStatus: "unavailable",
              stockMessage:
                "This product is no longer available.",
            };
          }

          // A connection failure is different
          // from a genuinely sold-out product.
          if (!result?.product) {
            return {
              ...item,
              availableStock: null,
              stockStatus: "unverified",
              stockMessage:
                "Unable to check stock. Please retry.",
            };
          }

          const availableStock = findVariantStock(
            result.product,
            item
          );

          if (availableStock === 0) {
            return {
              ...item,
              availableStock: 0,
              stockStatus: "sold_out",
              stockMessage:
                "This variation is out of stock.",
            };
          }

          if (item.quantity > availableStock) {
            return {
              ...item,
              availableStock,
              stockStatus: "insufficient",
              stockMessage:
                `Only ${availableStock} available. ` +
                "Please reduce your quantity.",
            };
          }

          return {
            ...item,
            availableStock,
            stockStatus: "available",
            stockMessage: "",
          };
        })
      );
    }

    checkCartStock();

    // Discard results from older checks.
    return () => {
      cancelled = true;
    };
  }, [isCartOpen, cartSignature]);

  // ==========================================
  // ADD PRODUCT TO CART
  // ==========================================

  const addToCart = (item) => {
    const cartKey = createCartKey(item);

    // Quantity must be a positive whole number.
    const requestedQuantity =
      Number.isSafeInteger(Number(item.quantity))
        ? Math.max(1, Number(item.quantity))
        : 1;

    setCartItems((previousItems) => {
      const existingItem = previousItems.find(
        (cartItem) =>
          cartItem.cartKey === cartKey
      );

      // ======================================
      // EXISTING VARIATION
      // ======================================

      if (existingItem) {
        const combinedQuantity =
          existingItem.quantity +
          requestedQuantity;

        /**
         * If we've already checked this variation
         * and know its stock, don't allow the cart
         * quantity to exceed that amount.
         *
         * An unverified variation will be checked
         * against the API when the drawer opens.
         */
        const knownStock =
          existingItem.availableStock;

        const safeQuantity =
          Number.isSafeInteger(knownStock)
            ? knownStock > 0
              ? Math.min(
                  combinedQuantity,
                  knownStock
                )
              : existingItem.quantity
            : combinedQuantity;

        return previousItems.map(
          (cartItem) =>
            cartItem.cartKey === cartKey
              ? {
                  ...cartItem,
                  quantity: safeQuantity,
                  name: item.name,
                  image: item.image,
                  unitPrice: item.unitPrice,
                }
              : cartItem
        );
      }

      // ======================================
      // NEW VARIATION
      // ======================================

      return [
        ...previousItems,
        {
          ...item,
          cartKey,
          quantity: requestedQuantity,

          // Availability must be checked
          // against MongoDB before checkout.
          availableStock: null,
          stockStatus: "unchecked",
          stockMessage: "",
        },
      ];
    });

    // Open the drawer after adding a product.
    // This also triggers a live inventory check.
    setIsCartOpen(true);
  };

  // ==========================================
  // REMOVE CART ITEM
  // ==========================================

  const removeFromCart = (cartKey) => {
    setCartItems((previousItems) =>
      previousItems.filter(
        (item) => item.cartKey !== cartKey
      )
    );
  };

  // ==========================================
  // UPDATE CART QUANTITY
  // ==========================================

  const updateQuantity = (
    cartKey,
    newQuantity
  ) => {
    const requested = Number(newQuantity);

    if (
      !Number.isSafeInteger(requested) ||
      requested < 1
    ) {
      return;
    }

    setCartItems((previousItems) =>
      previousItems.map((item) => {
        if (item.cartKey !== cartKey) {
          return item;
        }

        // Reject quantity increases for
        // confirmed unavailable variations.
        if (
          item.stockStatus === "sold_out" ||
          item.stockStatus === "unavailable"
        ) {
          return item;
        }

        // Respect stock if the latest known
        // quantity is available.
        const safeQuantity =
          Number.isSafeInteger(
            item.availableStock
          )
            ? Math.min(
                requested,
                Math.max(
                  1,
                  item.availableStock
                )
              )
            : requested;

        return {
          ...item,
          quantity: safeQuantity,
        };
      })
    );
  };

  // ==========================================
  // CLEAR SHOPPING BAG
  // ==========================================

  const clearCart = () => {
    setCartItems([]);
  };

  // ==========================================
  // CART TOTALS
  // ==========================================

  const cartCount = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total + item.quantity,
        0
      ),
    [cartItems]
  );

  // This is a display estimate based on
  // saved prices, not a verified checkout quote.
  const cartSubtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total +
          item.unitPrice * item.quantity,
        0
      ),
    [cartItems]
  );

  // ==========================================
  // CART AVAILABILITY SUMMARY
  // ==========================================

  const hasCartStockIssues = useMemo(
    () =>
      cartItems.some((item) =>
        [
          "sold_out",
          "insufficient",
          "unavailable",
          "unverified",
          "unchecked",
        ].includes(item.stockStatus)
      ),
    [cartItems]
  );

  // ==========================================
  // DRAWER CONTROLS
  // ==========================================

  const openCart = () => {
    setIsCartOpen(true);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  // ==========================================
  // SHARE CART INFORMATION
  // ==========================================

  return (
    <CartContext.Provider
      value={{
        // Existing context properties.
        cartItems,
        cartCount,
        cartSubtotal,
        isCartOpen,

        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,

        // New property for the next step:
        // The drawer can use this to warn
        // customers about unavailable items.
        hasCartStockIssues,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
