
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  X,
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

import { useCart } from "../context/useCart.js";
import { formatPrice } from "../data/products.js";

/**
 * JHAIRS — INVENTORY-AWARE SHOPPING BAG DRAWER
 *
 * EXISTING FEATURES PRESERVED:
 * - Opens from the right.
 * - Displays products and their variations.
 * - Updates product quantities.
 * - Removes products.
 * - Calculates subtotal.
 * - Navigates to checkout.
 * - Works on mobile and desktop.
 *
 * NEW FEATURES:
 * - Displays availability for every cart item.
 * - Shows sold-out and insufficient-stock warnings.
 * - Prevents quantity increases beyond verified stock.
 * - Blocks checkout when inventory is not verified.
 *
 * IMPORTANT:
 * Actual checkout must still validate live stock
 * and prices on the backend before placing an order.
 */

// ============================================
// INVENTORY STATUS HELPER
// ============================================

/**
 * Convert the stockStatus saved by CartContext
 * into a customer-friendly message and style.
 */
function getStockInfo(item) {
  const status = item.stockStatus || "unchecked";

  if (status === "available") {
    return {
      type: "success",
      message:
        item.availableStock <= 3
          ? `Only ${item.availableStock} left in stock`
          : `${item.availableStock} available`,
    };
  }

  if (status === "sold_out") {
    return {
      type: "error",
      message:
        item.stockMessage ||
        "This variation is out of stock.",
    };
  }

  if (status === "insufficient") {
    return {
      type: "warning",
      message:
        item.stockMessage ||
        "Please reduce your quantity.",
    };
  }

  if (status === "unavailable") {
    return {
      type: "error",
      message:
        item.stockMessage ||
        "This product is unavailable.",
    };
  }

  if (status === "unverified") {
    return {
      type: "warning",
      message:
        item.stockMessage ||
        "Unable to verify stock.",
    };
  }

  // "unchecked" is the default when the cart
  // has not received its latest stock result.
  return {
    type: "loading",
    message: "Checking stock availability...",
  };
}

// ============================================
// INDIVIDUAL STOCK MESSAGE
// ============================================

function StockMessage({ item }) {
  const info = getStockInfo(item);

  const styles = {
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-800",
    error: "bg-red-50 text-red-700",
    loading: "bg-[#F9EDF2] text-[#886778]",
  };

  return (
    <div
      role="status"
      className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 font-body text-xs leading-5 ${
        styles[info.type]
      }`}
    >
      {info.type === "success" ? (
        <CheckCircle2
          size={15}
          className="mt-0.5 shrink-0"
        />
      ) : info.type === "loading" ? (
        <LoaderCircle
          size={15}
          className="mt-0.5 shrink-0 animate-spin"
        />
      ) : (
        <AlertCircle
          size={15}
          className="mt-0.5 shrink-0"
        />
      )}

      <span>{info.message}</span>
    </div>
  );
}

// ============================================
// MAIN SHOPPING BAG DRAWER
// ============================================

function CartDrawer() {
  // React Router navigation.
  const navigate = useNavigate();

  // Read all cart information from CartContext.
  const {
    cartItems,
    isCartOpen,
    cartCount,
    cartSubtotal,

    closeCart,
    removeFromCart,
    updateQuantity,

    // Added in Step 23B.
    hasCartStockIssues,
  } = useCart();

  // ==========================================
  // CHECKOUT AVAILABILITY
  // ==========================================

  /**
   * Checkout is allowed only when:
   *
   * - The cart contains at least one item.
   * - Every item has verified stock.
   * - Every item quantity is within stock.
   *
   * We check the individual items rather
   * than trusting a button's visual state.
   */
  const canCheckout =
    cartItems.length > 0 &&
    !hasCartStockIssues &&
    cartItems.every(
      (item) =>
        item.stockStatus === "available" &&
        Number.isSafeInteger(
          item.availableStock
        ) &&
        item.availableStock >= item.quantity
    );

  // ==========================================
  // CLOSE DRAWER WITH ESCAPE KEY
  // ==========================================

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeCart();
      }
    };

    // Preserve the existing background scroll.
    const previousOverflow =
      document.body.style.overflow;

    // Prevent scrolling behind the drawer.
    document.body.style.overflow = "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      // Restore background scrolling.
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isCartOpen, closeCart]);

  // ==========================================
  // PROTECTED CHECKOUT NAVIGATION
  // ==========================================

  const handleCheckout = () => {
    // Do not navigate with unverified
    // or unavailable cart items.
    if (!canCheckout) {
      return;
    }

    closeCart();

    // Current JHAIRS checkout is quote/review
    // only; it does not place a paid order.
    navigate("/checkout");
  };

  // ==========================================
  // RENDER SHOPPING BAG
  // ==========================================

  return (
    <div
      className={`
        fixed inset-0 z-[100]
        ${
          isCartOpen
            ? "pointer-events-auto"
            : "pointer-events-none"
        }
      `}
      aria-hidden={!isCartOpen}
    >
      {/* =====================================
          DARK BACKDROP
      ===================================== */}

      <div
        onClick={closeCart}
        className={`
          absolute inset-0 bg-black/40
          transition-opacity duration-300
          ${
            isCartOpen
              ? "opacity-100"
              : "opacity-0"
          }
        `}
      />

      {/* =====================================
          SHOPPING BAG PANEL
      ===================================== */}

      <aside
        role="dialog"
        aria-modal={isCartOpen}
        aria-label="Your shopping bag"
        className={`
          absolute right-0 top-0
          flex h-full w-full max-w-[460px]
          flex-col bg-[#FFFCFA]
          shadow-2xl
          transition-transform duration-300 ease-in-out
          ${
            isCartOpen
              ? "translate-x-0"
              : "translate-x-full"
          }
        `}
      >
        {/* ===================================
            HEADER
        =================================== */}

        <div
          className="
            flex items-center justify-between
            border-b border-plum/10
            px-5 py-5 sm:px-7
          "
        >
          <div>
            <p
              className="
                font-body text-[10px] font-medium
                uppercase tracking-[0.2em]
                text-rose
              "
            >
              JHAIRS
            </p>

            <h2 className="mt-1 font-heading text-2xl text-plum">
              Your Shopping Bag

              <span className="ml-2 font-body text-sm text-plum/50">
                ({cartCount})
              </span>
            </h2>
          </div>

          {/* Close drawer button. */}
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close shopping bag"
            className="
              flex h-10 w-10 items-center justify-center
              rounded-full bg-blush/30
              text-plum transition-colors
              hover:bg-blush
            "
          >
            <X size={20} strokeWidth={1.7} />
          </button>
        </div>

        {/* ===================================
            EMPTY SHOPPING BAG
        =================================== */}

        {cartItems.length === 0 ? (
          <div
            className="
              flex flex-1 flex-col items-center
              justify-center px-6 text-center
            "
          >
            <div
              className="
                flex h-20 w-20 items-center
                justify-center rounded-full
                bg-blush/30 text-rose
              "
            >
              <ShoppingBag
                size={34}
                strokeWidth={1.3}
              />
            </div>

            <h3 className="mt-6 font-heading text-2xl text-plum">
              Your Bag Is Empty
            </h3>

            <p
              className="
                mt-3 max-w-[290px] font-body
                text-sm leading-7 text-plum/60
              "
            >
              A little luxury is waiting for you.
              Explore our collection and find your
              perfect hair.
            </p>

            <button
              type="button"
              onClick={() => {
                closeCart();
                navigate("/shop");
              }}
              className="
                mt-7 rounded-full bg-plum
                px-8 py-3.5 font-body
                text-sm font-medium text-white
                transition-colors hover:bg-rose
              "
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* ================================
                CART ITEMS
            ================================ */}

            <div
              className="
                min-h-0 flex-1 overflow-y-auto
                px-5 py-5 sm:px-7
              "
            >
              <div className="space-y-5">
                {cartItems.map((item) => {
                  /**
                   * We calculate the button states
                   * separately for every variation.
                   */

                  const stockVerified =
                    item.stockStatus ===
                      "available" ||
                    item.stockStatus ===
                      "insufficient";

                  const availableStock =
                    Number.isSafeInteger(
                      item.availableStock
                    )
                      ? item.availableStock
                      : 0;

                  /**
                   * Decreasing quantity is allowed
                   * as long as the new quantity is
                   * at least one.
                   *
                   * Customers can always remove
                   * the entire item separately.
                   */
                  const canDecrease =
                    item.quantity > 1;

                  /**
                   * Increase quantity only when
                   * inventory has been verified and
                   * enough stock exists.
                   */
                  const canIncrease =
                    stockVerified &&
                    availableStock > 0 &&
                    item.quantity <
                      availableStock;

                  return (
                    <div
                      key={item.cartKey}
                      className="
                        flex gap-4 border-b
                        border-plum/10 pb-5
                      "
                    >
                      {/* PRODUCT IMAGE */}

                      <div
                        className="
                          h-28 w-24 shrink-0
                          overflow-hidden rounded-2xl
                          bg-ivory
                        "
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="
                            h-full w-full object-cover
                          "
                        />
                      </div>

                      {/* PRODUCT INFORMATION */}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="
                              font-body text-sm
                              font-semibold leading-6
                              text-plum
                            "
                          >
                            {item.name}
                          </h3>

                          {/* REMOVE PRODUCT */}

                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(
                                item.cartKey
                              )
                            }
                            aria-label={`Remove ${item.name}`}
                            className="
                              shrink-0 text-plum/40
                              transition-colors
                              hover:text-rose
                            "
                          >
                            <Trash2
                              size={17}
                              strokeWidth={1.6}
                            />
                          </button>
                        </div>

                        {/* PRODUCT VARIATIONS */}

                        <div
                          className="
                            mt-1 space-y-0.5
                            font-body text-xs
                            leading-5 text-plum/60
                          "
                        >
                          {item.color && (
                            <p>
                              Colour: {item.color}
                            </p>
                          )}

                          {item.length && (
                            <p>
                              Length: {item.length}"
                            </p>
                          )}

                          {item.density && (
                            <p>
                              Density: {item.density}
                            </p>
                          )}

                          {item.laceType && (
                            <p>
                              Lace: {item.laceType}
                            </p>
                          )}
                        </div>

                        {/* LIVE STOCK FEEDBACK */}

                        <StockMessage item={item} />

                        {/* QUANTITY AND PRICE */}

                        <div
                          className="
                            mt-4 flex flex-wrap
                            items-center justify-between
                            gap-3
                          "
                        >
                          <div
                            className="
                              flex items-center
                              rounded-full border
                              border-plum/10
                              bg-white
                            "
                          >
                            {/* DECREASE QUANTITY */}

                            <button
                              type="button"
                              disabled={!canDecrease}
                              onClick={() =>
                                updateQuantity(
                                  item.cartKey,
                                  item.quantity - 1
                                )
                              }
                              aria-label={`Decrease ${item.name} quantity`}
                              className="
                                flex h-8 w-8
                                items-center justify-center
                                text-plum hover:text-rose
                                disabled:cursor-not-allowed
                                disabled:opacity-30
                              "
                            >
                              <Minus size={14} />
                            </button>

                            {/* CURRENT QUANTITY */}

                            <span
                              className="
                                min-w-[22px] text-center
                                font-body text-xs
                                font-medium text-plum
                              "
                            >
                              {item.quantity}
                            </span>

                            {/* INCREASE QUANTITY */}

                            <button
                              type="button"
                              disabled={!canIncrease}
                              onClick={() =>
                                updateQuantity(
                                  item.cartKey,
                                  item.quantity + 1
                                )
                              }
                              aria-label={`Increase ${item.name} quantity`}
                              className="
                                flex h-8 w-8
                                items-center justify-center
                                text-plum hover:text-rose
                                disabled:cursor-not-allowed
                                disabled:opacity-30
                              "
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {/* ITEM SUBTOTAL */}

                          <p
                            className="
                              font-body text-sm
                              font-semibold text-plum
                            "
                          >
                            {formatPrice(
                              item.unitPrice *
                                item.quantity
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ================================
                CART FOOTER
            ================================ */}

            <div
              className="
                shrink-0 border-t
                border-plum/10 bg-white
                px-5 py-5 sm:px-7 sm:py-6
              "
            >
              {/* CART STOCK WARNING */}

              {!canCheckout && (
                <div
                  role="status"
                  className="
                    mb-4 flex items-start gap-2
                    rounded-xl border
                    border-[#EBDDE4]
                    bg-[#FFF8FA]
                    px-4 py-3
                    font-body text-xs
                    leading-5 text-[#815B6F]
                  "
                >
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    Please review the stock
                    availability of your items
                    before continuing to checkout.
                  </span>
                </div>
              )}

              {/* SUBTOTAL */}

              <div
                className="
                  flex items-center
                  justify-between gap-4
                "
              >
                <span className="font-heading text-xl text-plum">
                  Subtotal
                </span>

                <span
                  className="
                    font-body text-lg
                    font-semibold text-plum
                  "
                >
                  {formatPrice(cartSubtotal)}
                </span>
              </div>

              {/* DELIVERY NOTE */}

              <p
                className="
                  mt-2 font-body text-xs
                  leading-5 text-plum/50
                "
              >
                Delivery charges will be
                confirmed later.
              </p>

              {/* CHECKOUT BUTTON */}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={!canCheckout}
                className="
                  mt-5 flex w-full
                  items-center justify-center
                  gap-3 rounded-full
                  bg-plum px-6 py-4
                  font-body text-sm
                  font-medium text-white
                  transition-colors duration-300
                  hover:bg-rose
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                {canCheckout
                  ? "Proceed to Checkout"
                  : "Review Stock Availability"}

                <ArrowRight size={18} />
              </button>

              {/* CONTINUE SHOPPING */}

              <button
                type="button"
                onClick={closeCart}
                className="
                  mt-4 w-full text-center
                  font-body text-sm
                  text-plum/65
                  transition-colors hover:text-rose
                "
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export default CartDrawer;
