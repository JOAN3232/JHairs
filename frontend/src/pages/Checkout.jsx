
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  LockKeyhole,
  MapPin,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { useCart } from "../context/useCart.js";
import { formatPrice } from "../data/products.js";
import {
  createGuestOrder,
  fetchOrderQuote,
  initializeGuestPayment,
} from "../services/orderApi.js";

/**
 * JHAIRS — GUEST CHECKOUT
 *
 * 1. Customer enters contact and delivery information.
 * 2. Backend verifies product prices and stock.
 * 3. Backend calculates the destination delivery fee.
 * 4. Customer reviews the quotation.
 * 5. Customer submits the order.
 * 6. Backend initializes Paystack checkout.
 * 7. Customer completes payment on Paystack.
 * 8. Backend verifies payment before confirming the order.
 *
 * Inventory is deducted only after successful payment verification.
 */

// ============================================
// NIGERIAN STATES
// ============================================

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra",
  "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara",
  "Federal Capital Territory",
];

// ============================================
// REUSABLE INPUT
// ============================================

function CheckoutInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  required = true,
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block font-body text-sm text-plum/80">
        {label}
        {required && <span className="ml-1 text-rose">*</span>}
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full min-w-0 rounded-2xl border border-plum/10 bg-white px-4 py-3.5 font-body text-base text-plum outline-none transition-colors placeholder:text-plum/30 focus:border-rose"
      />
    </label>
  );
}

// ============================================
// STATE SELECT
// ============================================

function StateSelect({ value, onChange }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block font-body text-sm text-plum/80">
        State
        <span className="ml-1 text-rose">*</span>
      </span>

      <select
        name="state"
        value={value}
        onChange={onChange}
        required
        autoComplete="address-level1"
        className="w-full min-w-0 rounded-2xl border border-plum/10 bg-white px-4 py-3.5 font-body text-base text-plum outline-none transition-colors focus:border-rose"
      >
        <option value="">Select your state</option>

        {NIGERIAN_STATES.map((state) => (
          <option key={state} value={state}>
            {state === "Federal Capital Territory"
              ? "Abuja (FCT)"
              : state}
          </option>
        ))}
      </select>
    </label>
  );
}

// ============================================
// ORDER SUMMARY
// ============================================

function OrderSummaryContent({
  cartItems,
  cartSubtotal,
  quote = null,
}) {
  const verifiedItems = quote?.items ?? [];

  function getVerifiedItem(item) {
    return verifiedItems.find(
      (verified) =>
        (
          String(verified.productId) === String(item.productId) ||
          String(verified.legacyId) === String(item.productId)
        ) &&
        verified.color === item.color &&
        Number(verified.length) === Number(item.length) &&
        (verified.density || "") === (item.density || "") &&
        (verified.laceType || "") === (item.laceType || "")
    );
  }

  const subtotal = quote?.subtotal ?? cartSubtotal;
  const deliveryFee = quote?.deliveryFee ?? null;
  const total = quote?.total ?? null;

  return (
    <>
      <div className="divide-y divide-plum/10">
        {cartItems.map((item) => {
          const verifiedItem = getVerifiedItem(item);

          const displayedLineTotal =
            verifiedItem?.lineTotal ??
            item.unitPrice * item.quantity;

          return (
            <div
              key={item.cartKey}
              className="flex min-w-0 gap-3 py-5 first:pt-0 sm:gap-4"
            >
              <div className="h-25 w-20 shrink-0 overflow-hidden rounded-2xl bg-ivory sm:h-28 sm:w-24">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-lg font-medium leading-6 text-plum">
                  {item.name}
                </h3>

                <div className="mt-2 space-y-1 font-body text-xs leading-5 text-plum/70 sm:text-[13px]">
                  {item.color && (
                    <p>
                      <span className="text-plum/50">Colour:</span>{" "}
                      {item.color}
                    </p>
                  )}

                  {item.length && (
                    <p>
                      <span className="text-plum/50">Length:</span>{" "}
                      {item.length}&quot;
                    </p>
                  )}

                  {item.density && (
                    <p>
                      <span className="text-plum/50">Density:</span>{" "}
                      {item.density}
                    </p>
                  )}

                  {item.laceType && (
                    <p>
                      <span className="text-plum/50">Lace:</span>{" "}
                      {item.laceType}
                    </p>
                  )}

                  <p>
                    <span className="text-plum/50">Quantity:</span>{" "}
                    {item.quantity}
                  </p>
                </div>

                <p className="mt-3 font-body text-sm font-semibold text-plum">
                  {formatPrice(displayedLineTotal)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-plum/10 pt-5">
        <div className="flex items-center justify-between gap-4 font-body text-sm text-plum/65">
          <span>Subtotal</span>
          <span className="font-medium text-plum">
            {formatPrice(subtotal)}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 font-body text-sm text-plum/65">
          <span>Delivery Fee</span>
          <span className="text-right font-medium text-plum">
            {deliveryFee !== null
              ? formatPrice(deliveryFee)
              : "Select state"}
          </span>
        </div>

        <div className="mt-6 border-t border-plum/10 pt-5">
          <div className="flex items-center justify-between gap-4">
            <span className="font-heading text-xl text-plum">
              Total
            </span>

            <span className="font-body text-base font-semibold text-plum sm:text-lg">
              {total !== null ? formatPrice(total) : "—"}
            </span>
          </div>

          {quote && (
            <p className="mt-2 font-body text-xs text-rose">
              Prices verified by JHAIRS
            </p>
          )}

          <p className="mt-3 font-body text-xs leading-6 text-plum/55">
            Delivery is calculated from your selected Nigerian state.
            No payment is collected at this stage.
          </p>
        </div>
      </div>
    </>
  );
}

// ============================================
// MAIN CHECKOUT COMPONENT
// ============================================

function Checkout() {
  const { cartItems, cartSubtotal, cartCount } = useCart();

  const [details, setDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    apartment: "",
    city: "",
    state: "",
    country: "Nigeria",
    notes: "",
  });

  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Quotation state
  const [orderQuote, setOrderQuote] = useState(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  // Payment submission state
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSubmitError, setOrderSubmitError] = useState("");

  const submittingRef = useRef(false);
  const pendingOrderRef = useRef(null);

  const PENDING_ORDER_KEY = "jhairs-pending-order-request";

  // ==========================================
  // IDEMPOTENCY
  // ==========================================

  function getOrderRequestId(orderPayload) {
    // Create a fingerprint from the customer's order details.
    const fingerprint = JSON.stringify({
      customer: orderPayload.customer,
      deliveryAddress: orderPayload.deliveryAddress,
      deliveryMethod: orderPayload.deliveryMethod,
      notes: orderPayload.notes,
      items: orderPayload.cartItems.map((item) => ({
        productId: item.productId,
        color: item.color,
        length: item.length,
        density: item.density || "",
        laceType: item.laceType || "",
        quantity: item.quantity,
      })),
    });

    let previous = pendingOrderRef.current;

    // Check whether an earlier order request was saved.
    if (!previous) {
      try {
        const saved = window.sessionStorage.getItem(PENDING_ORDER_KEY);
        previous = saved ? JSON.parse(saved) : null;
      } catch {
        previous = null;
      }
    }

    // Reuse the same ID for an identical order.
    if (
      previous?.fingerprint === fingerprint &&
      typeof previous?.id === "string"
    ) {
      pendingOrderRef.current = previous;
      return previous.id;
    }

    // Generate a new ID when the order details change.
    const next = {
      id: crypto.randomUUID(),
      fingerprint,
    };

    pendingOrderRef.current = next;

    try {
      window.sessionStorage.setItem(
        PENDING_ORDER_KEY,
        JSON.stringify(next)
      );
    } catch {
      // In-memory protection remains available.
    }

    return next.id;
  }

  // ==========================================
  // CART IDENTIFIER
  // ==========================================

  const cartKey = useMemo(
    () =>
      JSON.stringify(
        cartItems.map((item) => ({
          productId: item.productId,
          color: item.color,
          length: item.length,
          density: item.density || "",
          laceType: item.laceType || "",
          quantity: item.quantity,
        }))
      ),
    [cartItems]
  );

  const quoteKey = `${cartKey}::${details.state}`;

  // ==========================================
  // STOCK / PRICE VERIFICATION
  // ==========================================

  const [stockCheck, setStockCheck] = useState({
    status: "idle",
    quoteKey: "",
    message: "",
  });

  // ==========================================
  // AUTOMATIC STOCK VERIFICATION
  // ==========================================

  useEffect(() => {
    // Do not verify when there is no state or no cart.
    if (!details.state || cartItems.length === 0) {
      return;
    }

    let cancelled = false;

    async function verifyCheckout() {
      try {
        // Ask the backend to verify current prices and stock.
        const quote = await fetchOrderQuote(cartItems, details.state);

        if (cancelled) return;

        setOrderQuote({
          ...quote,
          quotedState: details.state,
          quotedCartKey: cartKey,
        });

        setStockCheck({
          status: "verified",
          quoteKey,
          message: "",
        });
      } catch (error) {
        if (cancelled) return;

        setOrderQuote(null);

        setStockCheck({
          status: "error",
          quoteKey,
          message:
            error.message ||
            "Unable to verify your shopping bag.",
        });
      }
    }

    verifyCheckout();

    return () => {
      cancelled = true;
    };
  }, [quoteKey, details.state, cartKey, cartItems]);

  const checkoutStockVerified =
    stockCheck.status === "verified" &&
    stockCheck.quoteKey === quoteKey;

  // ==========================================
  // ACTIVE QUOTE
  // ==========================================

  const activeQuote =
    orderQuote?.quotedState === details.state &&
    orderQuote?.quotedCartKey === cartKey
      ? orderQuote
      : null;

  // ==========================================
  // FORM HANDLING
  // ==========================================

  function handleChange(event) {
    const { name, value } = event.target;

    setDetails((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "state") {
      setOrderQuote(null);
      setQuoteError("");
      setOrderSubmitError("");
      setIsReviewing(false);
    }
  }

  // ==========================================
  // REVIEW ORDER
  // ==========================================

  async function handleReviewOrder(event) {
    event.preventDefault();

    if (
      isQuoting ||
      cartItems.length === 0 ||
      !details.state ||
      !checkoutStockVerified
    ) {
      return;
    }

    setIsQuoting(true);
    setQuoteError("");
    setOrderQuote(null);

    const stateAtRequest = details.state;
    const cartAtRequest = cartKey;

    try {
      // Fetch a fresh quotation before allowing payment.
      const quote = await fetchOrderQuote(cartItems, stateAtRequest);

      // Ignore the response if the customer changed their cart or state.
      if (
        details.state !== stateAtRequest ||
        cartKey !== cartAtRequest
      ) {
        return;
      }

      const verifiedQuote = {
        ...quote,
        quotedState: stateAtRequest,
        quotedCartKey: cartAtRequest,
      };

      setOrderQuote(verifiedQuote);
      setIsReviewing(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      setQuoteError(
        error.message ||
          "We couldn't verify your bag. Please try again."
      );
    } finally {
      setIsQuoting(false);
    }
  }

  // ==========================================
  // SUBMIT ORDER AND INITIALIZE PAYMENT
  // ==========================================

  async function handleSubmitOrder() {
    // Prevent duplicate submissions.
    if (
      submittingRef.current ||
      isSubmittingOrder ||
      !isReviewing ||
      !activeQuote ||
      cartItems.length === 0 ||
      !checkoutStockVerified
    ) {
      return;
    }

    // Make sure the quotation still matches the customer's order.
    if (
      activeQuote.deliveryFee == null ||
      activeQuote.total == null ||
      activeQuote.quotedState !== details.state ||
      activeQuote.quotedCartKey !== cartKey
    ) {
      setOrderSubmitError(
        "Your quotation has changed. Please review your order again."
      );

      setIsReviewing(false);
      setOrderQuote(null);
      return;
    }

    submittingRef.current = true;
    setIsSubmittingOrder(true);
    setOrderSubmitError("");

    try {
      // Prepare the customer's order information.
      const orderPayload = {
        cartItems,

        customer: {
          firstName: details.firstName,
          lastName: details.lastName,
          email: details.email,
          phone: details.phone,
        },

        deliveryAddress: {
          address: details.address,
          apartment: details.apartment,
          city: details.city,
          state: details.state,
          country: details.country,
        },

        deliveryMethod,
        notes: details.notes,
      };

      // Reuse the same request ID if the customer retries.
      const orderRequestId = getOrderRequestId(orderPayload);

      // First, save the order through our backend.
      const orderResponse = await createGuestOrder({
        ...orderPayload,
        orderRequestId,
      });

      const order = orderResponse.order;

      // Make sure the backend returned a valid order reference.
      if (!order?.orderNumber) {
        throw new Error(
          "Your order could not be created. Please try again."
        );
      }

      // Initialize the Paystack transaction.
      const paymentResponse = await initializeGuestPayment(
        order.orderNumber
      );

      // Handle an order whose payment has already been confirmed.
      if (paymentResponse.alreadyPaid && paymentResponse.reference) {
        const verificationUrl = new URL(
          "/payment/verify",
          window.location.origin
        );

        verificationUrl.searchParams.set(
          "reference",
          paymentResponse.reference
        );

        window.location.assign(verificationUrl.toString());
        return;
      }

      // Make sure Paystack returned a valid checkout URL.
      if (!paymentResponse.authorizationUrl) {
        throw new Error(
          "Unable to open Paystack checkout. Please try again."
        );
      }

      // Redirect the customer to Paystack's hosted checkout.
      window.location.assign(paymentResponse.authorizationUrl);

    } catch (error) {
      setOrderSubmitError(
        error.message ||
          "Unable to proceed to payment. Please try again."
      );
    } finally {
      submittingRef.current = false;
      setIsSubmittingOrder(false);
    }
  }

  // ==========================================
  // EMPTY CART
  // ==========================================

  if (cartItems.length === 0) {
    return (
      <main className="min-h-[75vh] bg-[#FFFCFA] px-5 py-20">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blush/40 text-rose">
            <ShoppingBag size={32} strokeWidth={1.3} />
          </div>

          <h1 className="mt-7 font-heading text-3xl text-plum sm:text-4xl">
            Your Bag Is Empty
          </h1>

          <p className="mt-4 font-body text-sm leading-7 text-plum/60">
            Your next favourite hairstyle is waiting. Explore our collection
            before heading to checkout.
          </p>

          <Link
            to="/shop"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-plum px-8 py-4 font-body text-sm font-medium text-white transition-colors hover:bg-rose"
          >
            Explore Our Collection
            <ArrowRight size={17} />
          </Link>
        </div>
      </main>
    );
  }

  // ==========================================
  // MAIN CHECKOUT
  // ==========================================

  return (
    <main className="min-h-screen bg-[#FFFCFA]">
      <section className="border-b border-plum/5 bg-ivory px-5 py-10 sm:px-10 sm:py-14 lg:px-16">
        <div className="mx-auto max-w-[1250px]">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 font-body text-xs text-plum/60 transition-colors hover:text-rose"
          >
            <ArrowLeft size={16} />
            Continue Shopping
          </Link>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-body text-[11px] font-medium uppercase tracking-[0.2em] text-rose">
                JHAIRS · Your Order
              </p>

              <h1 className="mt-3 font-heading text-4xl font-medium text-plum sm:text-5xl">
                {isReviewing ? "Review Your Order" : "Checkout"}
              </h1>

              <p className="mt-3 font-body text-sm leading-7 text-plum/60">
                {isReviewing
                  ? "Check your details and verified order total before proceeding to payment."
                  : "A little closer to your perfect hair."}
              </p>
            </div>

            <div className="flex items-center gap-2 text-plum/50">
              <LockKeyhole size={17} strokeWidth={1.5} />
              <span className="font-body text-xs">
                Guest checkout · No account needed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE ORDER SUMMARY */}

      <section className="px-5 pt-7 sm:px-10 lg:hidden">
        <div className="mx-auto max-w-[1250px]">
          <div className="overflow-hidden rounded-[22px] border border-rose/15 bg-[#FAF0F3]">
            <button
              type="button"
              onClick={() => setIsSummaryOpen((previous) => !previous)}
              aria-expanded={isSummaryOpen}
              aria-controls="mobile-order-summary"
              className="flex w-full items-center justify-between gap-3 px-4 py-5 text-left sm:px-6"
            >
              <span className="flex min-w-0 items-center gap-3">
                <ShoppingBag
                  size={20}
                  strokeWidth={1.5}
                  className="shrink-0 text-rose"
                />

                <span className="font-body text-sm font-medium text-plum">
                  {isSummaryOpen
                    ? "Hide Order Summary"
                    : "View Order Summary"}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <span className="font-body text-xs font-semibold text-plum sm:text-sm">
                  {activeQuote
                    ? formatPrice(activeQuote.total)
                    : formatPrice(cartSubtotal)}
                </span>

                <ChevronDown
                  size={18}
                  strokeWidth={1.5}
                  className={`text-rose transition-transform duration-300 ${
                    isSummaryOpen ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>

            {isSummaryOpen && (
              <div
                id="mobile-order-summary"
                className="border-t border-rose/15 bg-white px-4 py-6 sm:px-6"
              >
                <p className="mb-5 font-body text-xs text-plum/55">
                  {cartCount} {cartCount === 1 ? "item" : "items"} in your bag
                </p>

                <OrderSummaryContent
                  cartItems={cartItems}
                  cartSubtotal={cartSubtotal}
                  quote={activeQuote}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CHECKOUT FORM + SIDEBAR */}

      <section className="px-5 py-8 sm:px-10 sm:py-12 lg:px-16 lg:py-16">
        <div className="mx-auto grid max-w-[1250px] grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-12">

          {/* LEFT COLUMN */}

          <div className="min-w-0">
            {!isReviewing ? (
              <form
                id="jhair-checkout-form"
                onSubmit={handleReviewOrder}
                className="space-y-7"
              >
                {/* CONTACT INFORMATION */}

                <div className="rounded-[26px] border border-plum/5 bg-white p-5 sm:p-8">
                  <div className="mb-7 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush/40 text-rose">
                      <span className="font-body text-sm font-semibold">
                        01
                      </span>
                    </div>

                    <div>
                      <h2 className="font-heading text-2xl text-plum">
                        Contact Information
                      </h2>
                      <p className="mt-1 font-body text-sm text-plum/50">
                        How can we reach you?
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <CheckoutInput
                      label="First Name"
                      name="firstName"
                      value={details.firstName}
                      onChange={handleChange}
                      placeholder="Your first name"
                      autoComplete="given-name"
                    />

                    <CheckoutInput
                      label="Last Name"
                      name="lastName"
                      value={details.lastName}
                      onChange={handleChange}
                      placeholder="Your last name"
                      autoComplete="family-name"
                    />

                    <CheckoutInput
                      label="Email Address"
                      name="email"
                      type="email"
                      value={details.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />

                    <CheckoutInput
                      label="Phone Number"
                      name="phone"
                      type="tel"
                      value={details.phone}
                      onChange={handleChange}
                      placeholder="Your phone number"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* DELIVERY ADDRESS */}

                <div className="rounded-[26px] border border-plum/5 bg-white p-5 sm:p-8">
                  <div className="mb-7 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush/40 text-rose">
                      <MapPin size={19} strokeWidth={1.6} />
                    </div>

                    <div>
                      <h2 className="font-heading text-2xl text-plum">
                        Delivery Address
                      </h2>
                      <p className="mt-1 font-body text-sm text-plum/50">
                        Where should we deliver your hair?
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <CheckoutInput
                      label="Street Address"
                      name="address"
                      value={details.address}
                      onChange={handleChange}
                      placeholder="House number and street name"
                      autoComplete="street-address"
                    />

                    <CheckoutInput
                      label="Apartment / Landmark"
                      name="apartment"
                      value={details.apartment}
                      onChange={handleChange}
                      placeholder="Optional"
                      required={false}
                    />

                    <div className="grid gap-5 sm:grid-cols-2">
                      <CheckoutInput
                        label="City"
                        name="city"
                        value={details.city}
                        onChange={handleChange}
                        placeholder="Your city"
                        autoComplete="address-level2"
                      />

                      <StateSelect
                        value={details.state}
                        onChange={handleChange}
                      />
                    </div>

                    <CheckoutInput
                      label="Country"
                      name="country"
                      value={details.country}
                      onChange={handleChange}
                      autoComplete="country-name"
                    />
                  </div>

                  <p className="mt-4 font-body text-xs leading-6 text-plum/50">
                    Select your Nigerian state to calculate your delivery
                    fee automatically.
                  </p>
                </div>

                {/* DELIVERY METHOD */}

                <div className="rounded-[26px] border border-plum/5 bg-white p-5 sm:p-8">
                  <div className="mb-7 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush/40 text-rose">
                      <Truck size={20} strokeWidth={1.6} />
                    </div>

                    <div>
                      <h2 className="font-heading text-2xl text-plum">
                        Delivery Preference
                      </h2>
                      <p className="mt-1 font-body text-sm text-plum/50">
                        Choose how you'd prefer your order delivered.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        value: "standard",
                        title: "Standard Delivery",
                        description: "Regular delivery preference",
                      },
                      {
                        value: "express",
                        title: "Express Delivery",
                        description: "Request a faster delivery option",
                      },
                    ].map((method) => {
                      const isSelected =
                        deliveryMethod === method.value;

                      return (
                        <label
                          key={method.value}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                            isSelected
                              ? "border-rose bg-blush/20"
                              : "border-plum/10 bg-white hover:border-rose/50"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <input
                              type="radio"
                              name="deliveryMethod"
                              value={method.value}
                              checked={isSelected}
                              onChange={(event) =>
                                setDeliveryMethod(event.target.value)
                              }
                              className="h-4 w-4 shrink-0 accent-rose"
                            />

                            <div className="min-w-0">
                              <p className="font-body text-sm font-medium text-plum">
                                {method.title}
                              </p>
                              <p className="mt-1 font-body text-xs leading-5 text-plum/50">
                                {method.description}
                              </p>
                            </div>
                          </div>

                          <span className="shrink-0 font-body text-[11px] text-plum/50">
                            State-based fee
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <p className="mt-4 font-body text-xs leading-6 text-plum/50">
                    The delivery fee is calculated from your selected state.
                    Express delivery timing and availability will be confirmed
                    by JHAIRS.
                  </p>
                </div>

                {/* ORDER NOTES */}

                <div className="rounded-[26px] border border-plum/5 bg-white p-5 sm:p-8">
                  <h2 className="font-heading text-2xl text-plum">
                    Order Notes
                  </h2>

                  <p className="mt-2 font-body text-sm text-plum/50">
                    Anything else you'd like us to know?
                  </p>

                  <textarea
                    name="notes"
                    value={details.notes}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Special delivery instructions (optional)"
                    className="mt-5 w-full resize-y rounded-2xl border border-plum/10 bg-white px-4 py-3.5 font-body text-base text-plum outline-none placeholder:text-plum/30 focus:border-rose"
                  />
                </div>

                {/* QUOTE ERRORS */}

                {quoteError && (
                  <p
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-body text-sm text-red-700"
                  >
                    {quoteError}
                  </p>
                )}

                {/* STOCK ERRORS */}

                {stockCheck.status === "error" &&
                  stockCheck.quoteKey === quoteKey && (
                    <p
                      role="alert"
                      className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-body text-sm text-red-700"
                    >
                      {stockCheck.message}
                    </p>
                  )}

                {/* REVIEW BUTTON */}

                <button
                  type="submit"
                  disabled={
                    isQuoting ||
                    !details.state ||
                    !checkoutStockVerified
                  }
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-plum px-6 py-4 font-body text-sm font-medium text-white transition-colors hover:bg-rose disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isQuoting
                    ? "Calculating Your Order..."
                    : !details.state
                      ? "Select Your Delivery State"
                      : !checkoutStockVerified
                        ? "Verifying Your Order..."
                        : "Review Your Order"}

                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (

              /* REVIEW STAGE */

              <div className="rounded-[26px] border border-plum/5 bg-white p-5 sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blush/40 text-rose">
                  <CheckCircle2 size={25} strokeWidth={1.5} />
                </div>

                <h2 className="mt-5 font-heading text-3xl text-plum">
                  Your Details
                </h2>

                <p className="mt-2 font-body text-sm leading-7 text-plum/60">
                  Please review your information below.
                </p>

                <div className="mt-8 space-y-6">
                  <div>
                    <h3 className="font-body text-sm font-semibold text-plum">
                      Contact
                    </h3>

                    <p className="mt-2 break-words font-body text-sm leading-7 text-plum/65">
                      {details.firstName} {details.lastName}
                      <br />
                      {details.email}
                      <br />
                      {details.phone}
                    </p>
                  </div>

                  <div className="h-px bg-plum/10" />

                  <div>
                    <h3 className="font-body text-sm font-semibold text-plum">
                      Delivery Address
                    </h3>

                    <p className="mt-2 break-words font-body text-sm leading-7 text-plum/65">
                      {details.address}
                      {details.apartment && (
                        <>
                          <br />
                          {details.apartment}
                        </>
                      )}
                      <br />
                      {details.city}, {details.state}
                      <br />
                      {details.country}
                    </p>
                  </div>

                  <div className="h-px bg-plum/10" />

                  <div>
                    <h3 className="font-body text-sm font-semibold text-plum">
                      Delivery Preference
                    </h3>

                    <p className="mt-2 font-body text-sm text-plum/65">
                      {deliveryMethod === "express"
                        ? "Express Delivery"
                        : "Standard Delivery"}
                    </p>
                  </div>

                  {details.notes.trim() && (
                    <>
                      <div className="h-px bg-plum/10" />

                      <div>
                        <h3 className="font-body text-sm font-semibold text-plum">
                          Order Notes
                        </h3>

                        <p className="mt-2 whitespace-pre-wrap break-words font-body text-sm text-plum/65">
                          {details.notes}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* EDIT DETAILS */}

                <button
                  type="button"
                  onClick={() => {
                    setIsReviewing(false);
                    setOrderQuote(null);
                    setOrderSubmitError("");
                  }}
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-plum/15 px-6 py-3 font-body text-sm text-plum transition-colors hover:border-rose hover:text-rose"
                >
                  <ArrowLeft size={16} />
                  Edit Details
                </button>

                {/* VERIFIED QUOTATION */}

                <div className="mt-8 rounded-2xl bg-ivory p-5">
                  <div className="flex items-center gap-2 text-plum">
                    <CreditCard size={19} strokeWidth={1.5} />

                    <span className="font-body text-sm font-semibold">
                      Order Payment Summary
                    </span>
                  </div>

                  <p className="mt-3 font-body text-sm leading-7 text-plum/60">
                    Your product prices and delivery fee have been verified
                    by JHAIRS.
                  </p>

                  {activeQuote && (
                    <div className="mt-5 space-y-4 border-t border-plum/10 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-body text-sm text-plum/65">
                          Items Subtotal
                        </span>

                        <span className="font-body text-sm font-medium text-plum">
                          {formatPrice(activeQuote.subtotal)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="font-body text-sm text-plum/65">
                          Delivery Fee
                        </span>

                        <span className="font-body text-sm font-medium text-plum">
                          {formatPrice(activeQuote.deliveryFee)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-plum/10 pt-4">
                        <span className="font-heading text-xl text-plum">
                          Total
                        </span>

                        <span className="font-heading text-2xl text-plum">
                          {formatPrice(activeQuote.total)}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="mt-4 font-body text-xs leading-6 text-plum/55">
                    Your payment has not been collected yet. You will proceed
                    to Paystack after submitting your order.
                  </p>
                </div>

                {/* PAYMENT INITIALIZATION ERROR */}

                {orderSubmitError && (
                  <p
                    role="alert"
                    className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-body text-sm text-red-700"
                  >
                    {orderSubmitError}
                  </p>
                )}

                {/* PAYSTACK PAYMENT BUTTON */}

                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={
                    isSubmittingOrder ||
                    !checkoutStockVerified ||
                    !activeQuote
                  }
                  className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-plum px-6 py-4 font-body text-sm font-medium text-white transition-colors hover:bg-rose disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmittingOrder
                    ? "Redirecting to Paystack..."
                    : "Continue to Payment"}

                  <ArrowRight size={18} />
                </button>

                <p className="mt-3 text-center font-body text-xs leading-6 text-plum/50">
                  You will be securely redirected to Paystack to complete
                  your payment. Your order will only be confirmed after
                  successful payment verification.
                </p>
              </div>
            )}
          </div>

          {/* DESKTOP ORDER SUMMARY */}

          <aside className="hidden min-w-0 lg:block">
            <div className="sticky top-28 rounded-[26px] border border-plum/5 bg-white p-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-2xl text-plum">
                  Order Summary
                </h2>

                <span className="rounded-full bg-blush/40 px-3 py-1 font-body text-xs text-plum">
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="mt-7">
                <OrderSummaryContent
                  cartItems={cartItems}
                  cartSubtotal={cartSubtotal}
                  quote={activeQuote}
                />
              </div>

              {!isReviewing && (
                <button
                  type="submit"
                  form="jhair-checkout-form"
                  disabled={
                    isQuoting ||
                    !details.state ||
                    !checkoutStockVerified
                  }
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-plum px-5 py-4 font-body text-sm font-medium text-white transition-colors hover:bg-rose disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isQuoting
                    ? "Calculating Your Order..."
                    : !details.state
                      ? "Select Your State"
                      : !checkoutStockVerified
                        ? "Verifying Your Order..."
                        : "Review Order"}

                  <ArrowRight size={17} />
                </button>
              )}

              <Link
                to="/shop"
                className="mt-5 flex items-center justify-center gap-2 font-body text-xs text-plum/60 transition-colors hover:text-rose"
              >
                <ArrowLeft size={15} />
                Continue Shopping
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default Checkout;
