
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";

import { formatPrice } from "../data/products";
import { fetchProductById } from "../services/productApi.js";
import { useCart } from "../context/useCart.js";

/**
 * JHAIRS — PRODUCT DETAILS
 *
 * DATABASE FEATURES:
 * - Fetch product details from MongoDB.
 * - Support original numeric product IDs.
 * - Handle loading, errors and missing products.
 *
 * SHOPPING FEATURES:
 * - Colour-specific product images.
 * - Hair length, colour, density and lace options.
 * - Automatic pricing.
 * - Stock availability for exact variations.
 * - Quantity controls.
 * - Working Add to Bag functionality.
 * - Responsive desktop and mobile layouts.
 *
 * ESLINT FIX:
 * Quantity is reset inside variation-change handlers
 * instead of inside a useEffect.
 */

// ============================================
// REUSABLE PRODUCT OPTION SELECTOR
// ============================================

function OptionSelector({
  title,
  options,
  selected,
  onSelect,
}) {
  // Hide selectors that do not apply to a product.
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className="mt-7">
      <h3 className="mb-3 font-body text-sm font-medium text-plum">
        {title}
      </h3>

      <div className="flex flex-wrap gap-2.5">
        {options.map((option) => {
          const isSelected = selected === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={isSelected}
              className={`
                flex min-h-11 items-center
                justify-center rounded-full
                border px-4 py-2.5
                font-body text-xs
                transition-all duration-300
                sm:min-h-0
                ${
                  isSelected
                    ? "border-plum bg-plum text-white"
                    : "border-plum/15 bg-white text-plum hover:border-rose"
                }
              `}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// HAIR COLOUR SELECTOR
// ============================================

function ColorSelector({
  colors,
  selectedColor,
  onSelect,
}) {
  if (!colors || colors.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="mb-4 font-body text-sm font-medium text-plum">
        Hair Colour:
        <span className="ml-2 font-normal text-plum/60">
          {selectedColor?.name}
        </span>
      </h3>

      <div className="flex flex-wrap gap-x-5 gap-y-4">
        {colors.map((color) => {
          const isSelected =
            selectedColor?.name === color.name;

          return (
            <button
              key={color.name}
              type="button"
              onClick={() => onSelect(color)}
              aria-label={`Select ${color.name}`}
              aria-pressed={isSelected}
              title={color.name}
              className="group flex min-w-[65px] flex-col items-center gap-2"
            >
              {/* Selected colour ring */}
              <span
                className={`
                  flex h-13 w-13 items-center
                  justify-center rounded-full
                  border-2 p-1
                  transition-all duration-300
                  ${
                    isSelected
                      ? "border-rose"
                      : "border-transparent group-hover:border-plum/20"
                  }
                `}
              >
                {/* Actual colour swatch */}
                <span
                  className="
                    flex h-full w-full items-center
                    justify-center rounded-full
                    border border-black/10
                  "
                  style={{
                    backgroundColor: color.hex,
                  }}
                >
                  {isSelected && (
                    <Check
                      size={16}
                      strokeWidth={2.5}
                      className="text-white drop-shadow-md"
                    />
                  )}
                </span>
              </span>

              {/* Colour label */}
              <span
                className={`
                  max-w-24 text-center
                  font-body text-xs leading-5
                  ${
                    isSelected
                      ? "font-medium text-plum"
                      : "text-plum/60"
                  }
                `}
              >
                {color.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// PRODUCT DETAILS ROUTE
// ============================================

function ProductDetails() {
  // Read the product ID from the URL.
  const { id } = useParams();

  // Product returned from MongoDB.
  const [product, setProduct] = useState(null);

  // API loading and error states.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isNotFound, setIsNotFound] = useState(false);

  // Trigger a retry after a failed request.
  const [reloadKey, setReloadKey] = useState(0);

  // ==========================================
  // FETCH PRODUCT FROM MONGODB
  // ==========================================

  useEffect(() => {
    // Cancel outdated requests when changing pages.
    const controller = new AbortController();

    async function loadProduct() {
      setIsLoading(true);
      setProduct(null);
      setError("");
      setIsNotFound(false);

      try {
        // Retrieve the product from our backend API.
        const databaseProduct = await fetchProductById(
          id,
          controller.signal
        );

        // Store only the latest successful request.
        if (!controller.signal.aborted) {
          setProduct(databaseProduct);
        }
      } catch (requestError) {
        // Ignore canceled requests.
        if (controller.signal.aborted) {
          return;
        }

        // Handle missing products separately.
        if (requestError.status === 404) {
          setIsNotFound(true);
        } else {
          console.error(
            "JHAIRS: Product details failed to load:",
            requestError
          );

          setError(
            "We couldn't load this product right now. Please try again."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => controller.abort();
  }, [id, reloadKey]);

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (isLoading) {
    return (
      <main
        role="status"
        className="
          flex min-h-[70vh] flex-col
          items-center justify-center
          gap-4 bg-ivory px-6 text-center
        "
      >
        <div
          className="
            h-10 w-10 animate-spin
            rounded-full border-2
            border-rose/20 border-t-rose
          "
        />

        <p className="font-body text-sm text-plum/60">
          Preparing your perfect hair...
        </p>
      </main>
    );
  }

  // ==========================================
  // ERROR OR MISSING PRODUCT
  // ==========================================

  if (error || isNotFound || !product) {
    return (
      <main
        className="
          flex min-h-[70vh] flex-col
          items-center justify-center
          bg-ivory px-6 py-24 text-center
        "
      >
        <h1 className="font-heading text-4xl text-plum">
          {isNotFound
            ? "Product Not Found"
            : "Product Unavailable"}
        </h1>

        <p
          className="
            mt-4 max-w-md font-body
            text-sm leading-7 text-plum/65
          "
        >
          {isNotFound
            ? "We couldn't find the product you're looking for."
            : error ||
              "This product is currently unavailable."}
        </p>

        {/* Retry temporary connection failures */}
        {!isNotFound && (
          <button
            type="button"
            onClick={() =>
              setReloadKey((previous) => previous + 1)
            }
            className="
              mt-7 inline-flex items-center
              gap-2 rounded-full
              border border-plum/20
              px-6 py-3 font-body
              text-sm text-plum
              hover:border-rose
            "
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        )}

        <Link
          to="/shop"
          className="
            mt-5 inline-block rounded-full
            bg-plum px-7 py-3
            font-body text-sm text-white
            hover:bg-rose
          "
        >
          Back to Collection
        </Link>
      </main>
    );
  }

  // Remount the interactive page when the product changes.
  return (
    <ProductContent
      key={product._id}
      product={product}
    />
  );
}

// ============================================
// INTERACTIVE PRODUCT PAGE
// ============================================

function ProductContent({ product }) {
  // Existing global shopping cart.
  const { addToCart } = useCart();

  // ==========================================
  // PRODUCT VARIATION STATE
  // ==========================================

  // Default to the first available length.
  const [length, setLength] = useState(
    product.lengths?.[0] ?? 0
  );

  // Default to the first colour.
  const [selectedColor, setSelectedColor] = useState(
    product.colors?.[0] ?? null
  );

  // Optional wig density and lace type.
  const [density, setDensity] = useState(
    product.densities?.[0] || ""
  );

  const [laceType, setLaceType] = useState(
    product.laceTypes?.[0] || ""
  );

  // Customer-selected quantity.
  const [quantity, setQuantity] = useState(1);

  // ==========================================
  // VARIATION SELECTION HANDLERS
  // ==========================================

  /**
   * These handlers reset quantity immediately
   * when a different variation is selected.
   *
   * This avoids the React ESLint warning caused
   * by calling setQuantity inside useEffect.
   */

  function handleLengthChange(value) {
    const newLength = Number(
      value.replace('"', "")
    );

    if (newLength !== length) {
      setLength(newLength);
      setQuantity(1);
    }
  }

  function handleColorChange(color) {
    if (color.name !== selectedColor?.name) {
      setSelectedColor(color);
      setQuantity(1);
    }
  }

  function handleDensityChange(value) {
    if (value !== density) {
      setDensity(value);
      setQuantity(1);
    }
  }

  function handleLaceTypeChange(value) {
    if (value !== laceType) {
      setLaceType(value);
      setQuantity(1);
    }
  }

  // ==========================================
  // PRODUCT IMAGE
  // ==========================================

  // Use the colour-specific image when available.
  const displayedImage =
    selectedColor?.image || product.image;

  // ==========================================
  // AUTOMATIC PRICING
  // ==========================================

  // Every additional two inches adds ₦5,000.
  const extraLengthCost = product.lengths?.length
    ? ((length - product.lengths[0]) / 2) * 5000
    : 0;

  // Wig density pricing.
  const densityCost =
    density === "180%"
      ? 10000
      : density === "200%"
        ? 20000
        : 0;

  // Lace type pricing.
  const laceCost =
    laceType === "5x5 Closure"
      ? 5000
      : laceType === "13x4 Frontal"
        ? 15000
        : 0;

  // Colour-specific pricing.
  const colorCost =
    selectedColor?.extraPrice || 0;

  // Final price per customised unit.
  const unitPrice =
    product.basePrice +
    extraLengthCost +
    densityCost +
    laceCost +
    colorCost;

  // Total price for selected quantity.
  const totalPrice = unitPrice * quantity;

  // ==========================================
  // INVENTORY FOR EXACT VARIATION
  // ==========================================

  // Find stock matching every selected option.
  const selectedInventory = (
    product.inventory || []
  ).find(
    (item) =>
      item.color === selectedColor?.name &&
      item.length === length &&
      (item.density || "") === density &&
      (item.laceType || "") === laceType
  );

  // Missing variation records have zero stock.
  const availableStock =
    selectedInventory?.stock ?? 0;

  // Stock availability states.
  const isSoldOut = availableStock <= 0;

  const isLowStock =
    availableStock > 0 && availableStock <= 3;

  // ==========================================
  // ADD PRODUCT TO SHOPPING BAG
  // ==========================================

  function handleAddToCart() {
    // Never add a sold-out variation.
    if (isSoldOut) {
      return;
    }

    // Reject quantities above available stock.
    if (quantity > availableStock) {
      return;
    }

    // Preserve the existing cart object structure.
    addToCart({
      productId: product.id,
      name: product.name,
      image: displayedImage,

      color: selectedColor?.name || "",
      length,
      density,
      laceType,

      unitPrice,
      quantity,
    });
  }

  // ==========================================
  // PRODUCT PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-ivory">
      {/* Extra bottom padding for mobile purchase bar */}
      <div
        className="
          mx-auto w-full max-w-[1360px]
          px-5 pb-36 pt-8
          sm:px-9 sm:pt-12
          lg:px-14 lg:py-16
        "
      >
        {/* Return to shop */}
        <Link
          to="/shop"
          className="
            mb-7 inline-flex items-center
            gap-2 font-body text-sm
            text-plum/70 transition-colors
            hover:text-rose sm:mb-9
          "
        >
          <ArrowLeft
            size={17}
            strokeWidth={1.5}
          />

          Back to Collection
        </Link>

        {/* Responsive product layout */}
        <div
          className="
            grid grid-cols-1 items-start
            gap-8 sm:gap-12
            lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]
            lg:gap-12 xl:gap-16
          "
        >
          {/* ===================================
              LEFT — PRODUCT IMAGE
             =================================== */}

          <div
            className="
              mx-auto w-full max-w-[520px]
              overflow-hidden rounded-[32px]
              border border-plum/5
              bg-[#F8F0F0]
              shadow-[0_12px_40px_rgba(75,46,57,0.06)]
              lg:mx-0
            "
          >
            <img
              key={displayedImage}
              src={displayedImage}
              alt={`${product.name} in ${
                selectedColor?.name || "selected style"
              }`}
              className="
                block aspect-[4/5] w-full
                object-cover object-center
                transition-opacity duration-300
              "
            />
          </div>

          {/* ===================================
              RIGHT — PRODUCT INFORMATION
             =================================== */}

          <div className="min-w-0 lg:pt-2">
            {/* Category */}
            <p
              className="
                font-body text-xs font-medium
                uppercase tracking-[0.2em]
                text-rose
              "
            >
              JHAIRS / {product.category}
            </p>

            {/* Product name */}
            <h1
              className="
                mt-3 font-heading
                text-4xl font-medium
                leading-tight text-plum
                sm:mt-4 sm:text-5xl
              "
            >
              {product.name}
            </h1>

            {/* Current price */}
            <p
              className="
                mt-3 font-heading
                text-3xl text-plum sm:mt-5
              "
            >
              {formatPrice(unitPrice)}
            </p>

            {/* Product description */}
            <p
              className="
                mt-5 max-w-lg font-body
                text-[15px] leading-7
                text-plum/70
                sm:mt-6 sm:text-base sm:leading-8
              "
            >
              {product.description}
            </p>

            <div className="my-7 h-px bg-plum/10 sm:my-8" />

            {/* =================================
                STOCK AVAILABILITY
               ================================= */}

            <div className="mt-6">
              {isSoldOut ? (
                <p className="inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
                  Sold Out — Currently Unavailable
                </p>
              ) : isLowStock ? (
                <p className="inline-flex rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                  Only {availableStock} Left in Stock
                </p>
              ) : (
                <p className="inline-flex rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                  In Stock — {availableStock} Available
                </p>
              )}
            </div>

            {/* =================================
                HAIR LENGTH
               ================================= */}

            <OptionSelector
              title="Select Hair Length"
              options={(product.lengths || []).map(
                (item) => `${item}"`
              )}
              selected={`${length}"`}
              onSelect={handleLengthChange}
            />

            {/* =================================
                HAIR COLOUR
               ================================= */}

            <ColorSelector
              colors={product.colors}
              selectedColor={selectedColor}
              onSelect={handleColorChange}
            />

            {/* =================================
                DENSITY
               ================================= */}

            <OptionSelector
              title="Select Density"
              options={product.densities}
              selected={density}
              onSelect={handleDensityChange}
            />

            {/* =================================
                LACE TYPE
               ================================= */}

            <OptionSelector
              title="Select Lace Type"
              options={product.laceTypes}
              selected={laceType}
              onSelect={handleLaceTypeChange}
            />

            {/* =================================
                QUANTITY SELECTOR
               ================================= */}

            <div className="mt-8">
              <h3 className="mb-3 font-body text-sm font-medium text-plum">
                Quantity
              </h3>

              <div
                className="
                  flex w-fit items-center
                  overflow-hidden rounded-full
                  border border-plum/15 bg-white
                "
              >
                {/* Decrease quantity */}
                <button
                  type="button"
                  disabled={quantity === 1}
                  aria-label="Decrease quantity"
                  onClick={() =>
                    setQuantity((previous) =>
                      Math.max(1, previous - 1)
                    )
                  }
                  className="
                    flex h-11 w-11 items-center
                    justify-center text-plum
                    hover:bg-blush/40
                    disabled:opacity-30
                  "
                >
                  <Minus size={17} />
                </button>

                {/* Current quantity */}
                <span
                  className="
                    min-w-10 text-center
                    font-body text-sm text-plum
                  "
                >
                  {quantity}
                </span>

                {/* Increase quantity */}
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={
                    isSoldOut ||
                    quantity >= availableStock
                  }
                  onClick={() =>
                    setQuantity((previous) =>
                      Math.min(
                        previous + 1,
                        availableStock
                      )
                    )
                  }
                  className="
                    flex h-11 w-11 items-center
                    justify-center text-plum
                    hover:bg-blush/40
                    disabled:opacity-30
                  "
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>

            {/* =================================
                TOTAL PRICE
               ================================= */}

            <div
              className="
                mt-9 flex items-center
                justify-between gap-4
                border-t border-plum/10 pt-6
              "
            >
              <span className="font-body text-sm text-plum/65">
                Total Price
              </span>

              <span
                className="
                  font-heading text-2xl
                  font-medium text-plum
                "
              >
                {formatPrice(totalPrice)}
              </span>
            </div>

            {/* =================================
                DESKTOP ADD TO BAG
               ================================= */}

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={
                isSoldOut ||
                quantity > availableStock
              }
              className="
                mt-6 hidden w-full
                items-center justify-center gap-3
                rounded-full bg-plum px-8 py-4
                font-body text-sm font-medium
                text-white
                transition-all duration-300
                hover:-translate-y-0.5
                hover:bg-rose
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-50
                disabled:hover:translate-y-0
                lg:flex
              "
            >
              <ShoppingBag
                size={19}
                strokeWidth={1.6}
              />

              {isSoldOut ? "Sold Out" : "Add to Bag"}
            </button>

            {/* Brand signature */}
            <p
              className="
                mt-7 text-center font-body
                text-xs tracking-wider
                text-plum/45
              "
            >
              ✦ Luxury in Every Strand ✦
            </p>
          </div>
        </div>
      </div>

      {/* =======================================
          MOBILE STICKY PURCHASE BAR
         ======================================= */}

      <div
        className="
          fixed inset-x-0 bottom-0 z-40
          border-t border-plum/10
          bg-[#FFFCFA]/95
          px-4 pb-[max(12px,env(safe-area-inset-bottom))]
          pt-3 backdrop-blur-xl
          shadow-[0_-8px_30px_rgba(75,46,57,0.07)]
          sm:px-8 lg:hidden
        "
      >
        <div
          className="
            mx-auto flex max-w-[640px]
            items-center justify-between gap-3
          "
        >
          {/* Live total price */}
          <div className="min-w-0">
            <p
              className="
                font-body text-[10px]
                uppercase tracking-[0.1em]
                text-plum/50
              "
            >
              Total Price
            </p>

            <p
              className="
                mt-1 whitespace-nowrap
                font-heading text-xl
                font-medium text-plum
                sm:text-2xl
              "
            >
              {formatPrice(totalPrice)}
            </p>
          </div>

          {/* Mobile Add to Bag */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={
              isSoldOut ||
              quantity > availableStock
            }
            className="
              flex min-h-12 shrink-0
              items-center justify-center gap-2
              rounded-full bg-plum
              px-4 font-body
              text-xs font-medium text-white
              transition-colors duration-300
              hover:bg-rose
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:px-7 sm:text-sm
            "
          >
            <ShoppingBag
              size={17}
              strokeWidth={1.6}
            />

            {isSoldOut ? "Sold Out" : "Add to Bag"}
          </button>
        </div>
      </div>
    </main>
  );
}

// ============================================
// EXPORT PRODUCT DETAILS PAGE
// ============================================

export default ProductDetails;
