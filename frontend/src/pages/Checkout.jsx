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
import { createGuestOrder, fetchOrderQuote } from "../services/orderApi.js";

/**
 * JHAIRS — GUEST CHECKOUT
 *
 * Three stages:
 * 1. Guest enters contact and delivery details.
 * 2. Backend verifies the cart; guest reviews and submits the request.
 * 3. A successful response shows a dedicated confirmation screen.
 *
 * The backend saves PENDING / UNPAID order requests only.
 * No payment is collected or inventory reserved here.
 */

// Reusable field retaining the existing JHAIRS form styling.
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

// Used by the mobile expandable summary and desktop sidebar.
function OrderSummaryContent({ cartItems, cartSubtotal, verifiedSubtotal = null }) {
  const subtotal = verifiedSubtotal ?? cartSubtotal;

  return (
    <>
      <div className="divide-y divide-plum/10">
        {cartItems.map((item) => (
          <div key={item.cartKey} className="flex min-w-0 gap-3 py-5 first:pt-0 sm:gap-4">
            <div className="h-25 w-20 shrink-0 overflow-hidden rounded-2xl bg-ivory sm:h-28 sm:w-24">
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-lg font-medium leading-6 text-plum">{item.name}</h3>
              <div className="mt-2 space-y-1 font-body text-xs leading-5 text-plum/70 sm:text-[13px]">
                {item.color && <p><span className="text-plum/50">Colour:</span> {item.color}</p>}
                {item.length && <p><span className="text-plum/50">Length:</span> {item.length}&quot;</p>}
                {item.density && <p><span className="text-plum/50">Density:</span> {item.density}</p>}
                {item.laceType && <p><span className="text-plum/50">Lace:</span> {item.laceType}</p>}
                <p><span className="text-plum/50">Quantity:</span> {item.quantity}</p>
              </div>
              <p className="mt-3 font-body text-sm font-semibold text-plum">
                {formatPrice(item.unitPrice * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-plum/10 pt-5">
        <div className="flex items-center justify-between gap-4 font-body text-sm text-plum/65">
          <span>Subtotal</span>
          <span className="font-medium text-plum">{formatPrice(subtotal)}</span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 font-body text-sm text-plum/65">
          <span>Delivery</span>
          <span className="text-right text-xs">To be confirmed</span>
        </div>
        <div className="mt-6 border-t border-plum/10 pt-5">
          <div className="flex items-center justify-between gap-4">
            <span className="font-heading text-xl text-plum">Items Subtotal</span>
            <span className="font-body text-base font-semibold text-plum sm:text-lg">{formatPrice(subtotal)}</span>
          </div>
          {verifiedSubtotal !== null && (
            <p className="mt-2 font-body text-xs text-rose">Subtotal verified by JHAIRS</p>
          )}
          <p className="mt-3 font-body text-xs leading-6 text-plum/55">
            Delivery charges are not included. No payment will be collected.
          </p>
        </div>
      </div>
    </>
  );
}

// Dedicated confirmation replaces the previous review/payment panels.
function OrderConfirmation({ order }) {
  return (
    <section className="mx-auto max-w-[760px] rounded-[26px] border border-rose/20 bg-[#FFF7FA] px-6 py-12 text-center sm:px-12 sm:py-16" role="status">
      <CheckCircle2 size={44} strokeWidth={1.5} className="mx-auto text-rose" />
      <h2 className="mt-6 font-heading text-3xl text-plum sm:text-4xl">Order Request Received!</h2>
      <p className="mx-auto mt-4 max-w-lg font-body text-sm leading-7 text-plum/65">
        Thank you for choosing JHAIRS. Your order request has been saved.
        Please keep your order reference for your records.
      </p>

      <div className="mt-7 rounded-[22px] bg-white px-4 py-6 sm:px-8">
        <p className="font-body text-xs text-plum/50">Order Reference</p>
        <p className="mt-2 break-all font-body text-sm font-semibold text-plum sm:text-base">
          {order.orderNumber}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-body text-xs text-plum/60">
          <span>Order: <strong className="font-semibold text-plum">{order.orderStatus}</strong></span>
          <span>Payment: <strong className="font-semibold text-plum">{order.paymentStatus}</strong></span>
        </div>
        <div className="mt-6 border-t border-plum/10 pt-5">
          <p className="font-body text-xs text-plum/50">Verified Items Subtotal</p>
          <p className="mt-2 font-heading text-2xl text-plum">{formatPrice(order.subtotal)}</p>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-lg font-body text-xs leading-6 text-plum/55">
        Your request is pending. Delivery charges and payment arrangements have
        not yet been confirmed. No inventory has been reserved.
      </p>
      <Link
        to="/shop"
        className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-plum px-8 py-4 font-body text-sm font-medium text-white transition-colors hover:bg-rose"
      >
        Continue Shopping <ArrowRight size={17} />
      </Link>
    </section>
  );
}

function Checkout() {
  const { cartItems, cartSubtotal, cartCount } = useCart();

  // Guest input remains local until a request is submitted.
  const [details, setDetails] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    address: "", apartment: "", city: "", state: "",
    country: "Nigeria", notes: "",
  });
  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Quotation / review state.
  const [orderQuote, setOrderQuote] = useState(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  // Submission / confirmation state.
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSubmitError, setOrderSubmitError] = useState("");
  // The ref blocks rapid double-clicks before React re-renders.
  // Backend idempotency is still required before production.
  const submittingRef = useRef(false);

  // STEP 33E — Keep the same UUID when an unchanged order is retried.
  // sessionStorage survives page refreshes within the same browser tab.
  const pendingOrderRef = useRef(null);
  const PENDING_ORDER_KEY = "jhairs-pending-order-request";

  function getOrderRequestId(orderPayload) {
    // Use ONLY the exact fields sent to the backend. Cart images,
    // display prices and stock messages should not change this ID.
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

    // Reuse an in-memory request first, then check this browser tab's storage.
    let previous = pendingOrderRef.current;
    if (!previous) {
      try {
        const saved = window.sessionStorage.getItem(PENDING_ORDER_KEY);
        previous = saved ? JSON.parse(saved) : null;
      } catch {
        previous = null;
      }
    }

    if (previous?.fingerprint === fingerprint &&
        typeof previous?.id === "string") {
      pendingOrderRef.current = previous;
      return previous.id;
    }

    // New or changed order: a new idempotency key.
    const next = { id: crypto.randomUUID(), fingerprint };
    pendingOrderRef.current = next;
    try {
      window.sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(next));
    } catch {
      // Storage can be blocked; the ref still works until this page reloads.
    }
    return next.id;
  }

  // Verify the exact current cart whenever its selections change.
  const cartKey = useMemo(
    () => JSON.stringify(cartItems.map((item) => ({
      productId: item.productId,
      color: item.color,
      length: item.length,
      density: item.density || "",
      laceType: item.laceType || "",
      quantity: item.quantity,
    }))),
    [cartItems]
  );

  const [stockCheck, setStockCheck] = useState({
    status: "checking", cartKey: "", message: "",
  });

  useEffect(() => {
    // No need to fetch after successful submission or for an empty bag.
    if (cartKey === "[]" || submittedOrder) return;

    let cancelled = false;

    async function verifyCheckoutStock() {
      setStockCheck({ status: "checking", cartKey, message: "" });
      try {
        // Prices and available stock come from MongoDB.
        await fetchOrderQuote(JSON.parse(cartKey));
        if (!cancelled) {
          setStockCheck({ status: "verified", cartKey, message: "" });
        }
      } catch (error) {
        if (!cancelled) {
          setStockCheck({
            status: "error", cartKey,
            message: error.message || "Unable to verify your shopping bag.",
          });
        }
      }
    }

    verifyCheckoutStock();
    return () => { cancelled = true; };
  }, [cartKey, submittedOrder]);

  const checkoutStockVerified =
    stockCheck.status === "verified" && stockCheck.cartKey === cartKey;

  function handleChange(event) {
    const { name, value } = event.target;
    setDetails((previous) => ({ ...previous, [name]: value }));
  }

  // The backend checks stock and pricing again before entering review.
  async function handleReviewOrder(event) {
    event.preventDefault();
    if (isQuoting || submittedOrder || cartItems.length === 0 || !checkoutStockVerified) return;

    setIsQuoting(true);
    setQuoteError("");
    setOrderQuote(null);
    try {
      const quote = await fetchOrderQuote(cartItems);
      setOrderQuote(quote);
      setIsReviewing(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setQuoteError(error.message || "We couldn't verify your bag. Please try again.");
    } finally {
      setIsQuoting(false);
    }
  }

  // Submit an unpaid guest order request once review is complete.
  async function handleSubmitOrder() {
    if (
      submittingRef.current || isSubmittingOrder || submittedOrder ||
      !isReviewing || !orderQuote || cartItems.length === 0 || !checkoutStockVerified
    ) return;

    submittingRef.current = true;
    setIsSubmittingOrder(true);
    setOrderSubmitError("");

    try {
      // Build the exact order payload once, then reuse it for retries.
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

      // The backend now requires this stable UUID for duplicate protection.
      const orderRequestId = getOrderRequestId(orderPayload);
      const response = await createGuestOrder({
        ...orderPayload,
        orderRequestId,
      });

      // Show confirmation as a standalone final stage.
      // Keep cart contents for now; clearing is a later step.
      setSubmittedOrder(response.order);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setOrderSubmitError(
        error.message || "Unable to submit your order request."
      );
    } finally {
      submittingRef.current = false;
      setIsSubmittingOrder(false);
    }
  }

  const verifiedSubtotal = isReviewing ? (orderQuote?.subtotal ?? null) : null;

  // IMPORTANT: Show confirmation before checking for an empty cart.
  if (submittedOrder) {
    return (
      <main className="min-h-screen bg-[#FFFCFA]">
        <section className="border-b border-plum/5 bg-ivory px-5 py-10 sm:px-10 sm:py-14 lg:px-16">
          <div className="mx-auto max-w-[1250px]">
            <p className="font-body text-[11px] font-medium uppercase tracking-[0.2em] text-rose">
              JHAIRS · Your Order
            </p>
            <h1 className="mt-3 font-heading text-4xl text-plum sm:text-5xl">
              Order Request Received
            </h1>
            <p className="mt-3 font-body text-sm leading-7 text-plum/60">
              Your request has been saved successfully.
            </p>
          </div>
        </section>
        <section className="px-5 py-12 sm:px-10 sm:py-16 lg:px-16">
          <OrderConfirmation order={submittedOrder} />
        </section>
      </main>
    );
  }

  // Empty cart state; avoid showing checkout fields when no items exist.
  if (cartItems.length === 0) {
    return (
      <main className="min-h-[75vh] bg-[#FFFCFA] px-5 py-20">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blush/40 text-rose">
            <ShoppingBag size={32} strokeWidth={1.3} />
          </div>
          <h1 className="mt-7 font-heading text-3xl text-plum sm:text-4xl">Your Bag Is Empty</h1>
          <p className="mt-4 font-body text-sm leading-7 text-plum/60">
            Your next favourite hairstyle is waiting. Explore our collection before heading to checkout.
          </p>
          <Link to="/shop" className="mt-8 inline-flex items-center gap-2 rounded-full bg-plum px-8 py-4 font-body text-sm font-medium text-white transition-colors hover:bg-rose">
            Explore Our Collection <ArrowRight size={17} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFCFA]">
      {/* PAGE INTRODUCTION */}
      <section className="border-b border-plum/5 bg-ivory px-5 py-10 sm:px-10 sm:py-14 lg:px-16">
        <div className="mx-auto max-w-[1250px]">
          <Link to="/shop" className="inline-flex items-center gap-2 font-body text-xs text-plum/60 transition-colors hover:text-rose">
            <ArrowLeft size={16} /> Continue Shopping
          </Link>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-body text-[11px] font-medium uppercase tracking-[0.2em] text-rose">JHAIRS · Your Order</p>
              <h1 className="mt-3 font-heading text-4xl font-medium text-plum sm:text-5xl">
                {isReviewing ? "Review Your Order" : "Checkout"}
              </h1>
              <p className="mt-3 font-body text-sm leading-7 text-plum/60">
                {isReviewing ? "Check your details before proceeding." : "A little closer to your perfect hair."}
              </p>
            </div>
            <div className="flex items-center gap-2 text-plum/50">
              <LockKeyhole size={17} strokeWidth={1.5} />
              <span className="font-body text-xs">Guest checkout · No account needed</span>
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
                <ShoppingBag size={20} strokeWidth={1.5} className="shrink-0 text-rose" />
                <span className="font-body text-sm font-medium text-plum">
                  {isSummaryOpen ? "Hide Order Summary" : "View Order Summary"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-body text-xs font-semibold text-plum sm:text-sm">
                  {formatPrice(verifiedSubtotal ?? cartSubtotal)}
                </span>
                <ChevronDown size={18} strokeWidth={1.5} className={`text-rose transition-transform duration-300 ${isSummaryOpen ? "rotate-180" : ""}`} />
              </span>
            </button>
            {isSummaryOpen && (
              <div id="mobile-order-summary" className="border-t border-rose/15 bg-white px-4 py-6 sm:px-6">
                <p className="mb-5 font-body text-xs text-plum/55">
                  {cartCount} {cartCount === 1 ? "item" : "items"} in your bag
                </p>
                <OrderSummaryContent
                  cartItems={cartItems}
                  cartSubtotal={cartSubtotal}
                  verifiedSubtotal={verifiedSubtotal}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CONTACT FORM + DESKTOP SIDEBAR */}
      <section className="px-5 py-8 sm:px-10 sm:py-12 lg:px-16 lg:py-16">
        <div className="mx-auto grid max-w-[1250px] grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-12">
          <div className="min-w-0">
            {!isReviewing ? (
              <form id="jhair-checkout-form" onSubmit={handleReviewOrder} className="space-y-7">
                {/* CONTACT INFORMATION */}
                <div className="rounded-[26px] border border-plum/5 bg-white p-5 sm:p-8">
                  <div className="mb-7 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush/40 text-rose">
                      <span className="font-body text-sm font-semibold">01</span>
                    </div>
                    <div>
                      <h2 className="font-heading text-2xl text-plum">Contact Information</h2>
                      <p className="mt-1 font-body text-sm text-plum/50">How can we reach you?</p>
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <CheckoutInput label="First Name" name="firstName" value={details.firstName} onChange={handleChange} placeholder="Your first name" autoComplete="given-name" />
                    <CheckoutInput label="Last Name" name="lastName" value={details.lastName} onChange={handleChange} placeholder="Your last name" autoComplete="family-name" />
                    <CheckoutInput label="Email Address" name="email" type="email" value={details.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" />
                    <CheckoutInput label="Phone Number" name="phone" type="tel" value={details.phone} onChange={handleChange} placeholder="Your phone number" autoComplete="tel" />
                  </div>
                </div>

                {/* DELIVERY ADDRESS */}
                <div className="rounded-[26px] border border-plum/5 bg-white p-5 sm:p-8">
                  <div className="mb-7 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush/40 text-rose">
                      <MapPin size={19} strokeWidth={1.6} />
                    </div>
                    <div>
                      <h2 className="font-heading text-2xl text-plum">Delivery Address</h2>
                      <p className="mt-1 font-body text-sm text-plum/50">Where should we deliver your hair?</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <CheckoutInput label="Street Address" name="address" value={details.address} onChange={handleChange} placeholder="House number and street name" autoComplete="street-address" />
                    <CheckoutInput label="Apartment / Landmark" name="apartment" value={details.apartment} onChange={handleChange} placeholder="Optional" required={false} />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <CheckoutInput label="City" name="city" value={details.city} onChange={handleChange} placeholder="Your city" autoComplete="address-level2" />
                      <CheckoutInput label="State / Region" name="state" value={details.state} onChange={handleChange} placeholder="Your state" autoComplete="address-level1" />
                    </div>
                    <CheckoutInput label="Country" name="country" value={details.country} onChange={handleChange} autoComplete="country-name" />
                  </div>
                </div>

                {/* DELIVERY METHOD */}
                <div className="rounded-[26px] border border-plum/5 bg-white p-5 sm:p-8">
                  <div className="mb-7 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush/40 text-rose">
                      <Truck size={20} strokeWidth={1.6} />
                    </div>
                    <div>
                      <h2 className="font-heading text-2xl text-plum">Delivery Preference</h2>
                      <p className="mt-1 font-body text-sm text-plum/50">Choose how you'd prefer your order delivered.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { value: "standard", title: "Standard Delivery", description: "Regular delivery preference" },
                      { value: "express", title: "Express Delivery", description: "Request a faster delivery option" },
                    ].map((method) => {
                      const isSelected = deliveryMethod === method.value;
                      return (
                        <label
                          key={method.value}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${isSelected ? "border-rose bg-blush/20" : "border-plum/10 bg-white hover:border-rose/50"}`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <input
                              type="radio"
                              name="deliveryMethod"
                              value={method.value}
                              checked={isSelected}
                              onChange={(event) => setDeliveryMethod(event.target.value)}
                              className="h-4 w-4 shrink-0 accent-rose"
                            />
                            <div className="min-w-0">
                              <p className="font-body text-sm font-medium text-plum">{method.title}</p>
                              <p className="mt-1 font-body text-xs leading-5 text-plum/50">{method.description}</p>
                            </div>
                          </div>
                          <span className="shrink-0 font-body text-[11px] text-plum/50">Quote later</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-4 font-body text-xs leading-6 text-plum/50">
                    Delivery availability, cost and timing will be confirmed after an order request is received.
                  </p>
                </div>

                {/* OPTIONAL NOTES */}
                <div className="rounded-[26px] border border-plum/5 bg-white p-5 sm:p-8">
                  <h2 className="font-heading text-2xl text-plum">Order Notes</h2>
                  <p className="mt-2 font-body text-sm text-plum/50">Anything else you'd like us to know?</p>
                  <textarea
                    name="notes"
                    value={details.notes}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Special delivery instructions (optional)"
                    className="mt-5 w-full resize-y rounded-2xl border border-plum/10 bg-white px-4 py-3.5 font-body text-base text-plum outline-none placeholder:text-plum/30 focus:border-rose"
                  />
                </div>

                {/* SHOW BACKEND QUOTATION AND STOCK ERRORS */}
                {quoteError && (
                  <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-body text-sm text-red-700">
                    {quoteError}
                  </p>
                )}
                {stockCheck.status === "error" && stockCheck.cartKey === cartKey && (
                  <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-body text-sm text-red-700">
                    {stockCheck.message}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isQuoting || !checkoutStockVerified}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-plum px-6 py-4 font-body text-sm font-medium text-white transition-colors hover:bg-rose disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isQuoting ? "Checking Your Order..." : !checkoutStockVerified ? "Verifying Stock..." : "Review Your Order"}
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              /* REVIEW STAGE: visible only BEFORE order submission. */
              <div className="rounded-[26px] border border-plum/5 bg-white p-5 sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blush/40 text-rose">
                  <CheckCircle2 size={25} strokeWidth={1.5} />
                </div>
                <h2 className="mt-5 font-heading text-3xl text-plum">Your Details</h2>
                <p className="mt-2 font-body text-sm leading-7 text-plum/60">Please review your information below.</p>
                <div className="mt-8 space-y-6">
                  <div>
                    <h3 className="font-body text-sm font-semibold text-plum">Contact</h3>
                    <p className="mt-2 break-words font-body text-sm leading-7 text-plum/65">
                      {details.firstName} {details.lastName}<br />{details.email}<br />{details.phone}
                    </p>
                  </div>
                  <div className="h-px bg-plum/10" />
                  <div>
                    <h3 className="font-body text-sm font-semibold text-plum">Delivery Address</h3>
                    <p className="mt-2 break-words font-body text-sm leading-7 text-plum/65">
                      {details.address}
                      {details.apartment && <><br />{details.apartment}</>}
                      <br />{details.city}, {details.state}<br />{details.country}
                    </p>
                  </div>
                  <div className="h-px bg-plum/10" />
                  <div>
                    <h3 className="font-body text-sm font-semibold text-plum">Delivery Preference</h3>
                    <p className="mt-2 font-body text-sm text-plum/65">
                      {deliveryMethod === "express" ? "Express Delivery" : "Standard Delivery"}
                    </p>
                  </div>
                  {details.notes.trim() && (
                    <>
                      <div className="h-px bg-plum/10" />
                      <div>
                        <h3 className="font-body text-sm font-semibold text-plum">Order Notes</h3>
                        <p className="mt-2 whitespace-pre-wrap break-words font-body text-sm text-plum/65">{details.notes}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Editing is available only before submitting. */}
                <button
                  type="button"
                  onClick={() => {
                    setIsReviewing(false);
                    setOrderQuote(null);
                    setOrderSubmitError("");
                  }}
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-plum/15 px-6 py-3 font-body text-sm text-plum transition-colors hover:border-rose hover:text-rose"
                >
                  <ArrowLeft size={16} /> Edit Details
                </button>

                {/* Show the quotation/payment notice BEFORE submission only. */}
                <div className="mt-8 rounded-2xl bg-ivory p-5">
                  <div className="flex items-center gap-2 text-plum">
                    <CreditCard size={19} strokeWidth={1.5} />
                    <span className="font-body text-sm font-semibold">Payment</span>
                  </div>
                  <p className="mt-3 font-body text-sm leading-7 text-plum/60">
                    Your product subtotal has been verified by JHAIRS.
                    Guest order requests are accepted, but delivery charges and
                    payment arrangements are still to be confirmed.
                  </p>
                  {orderQuote && (
                    <div className="mt-4 border-t border-plum/10 pt-4">
                      <p className="font-body text-sm text-plum/65">Verified Items Subtotal</p>
                      <p className="mt-2 font-heading text-2xl text-plum">{formatPrice(orderQuote.subtotal)}</p>
                    </div>
                  )}
                </div>

                {/* Backend returns precise reasons for failed submission. */}
                {orderSubmitError && (
                  <p role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-body text-sm text-red-700">
                    {orderSubmitError}
                  </p>
                )}

                {/* Creates ONE pending/unpaid request when successful. */}
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={isSubmittingOrder || !checkoutStockVerified}
                  className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-plum px-6 py-4 font-body text-sm font-medium text-white transition-colors hover:bg-rose disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmittingOrder ? "Submitting Your Order..." : !checkoutStockVerified ? "Verifying Stock..." : "Submit Order Request"}
                  <ArrowRight size={18} />
                </button>
                <p className="mt-3 text-center font-body text-xs leading-6 text-plum/50">
                  This saves an unpaid order request. No payment will be collected or stock reserved.
                </p>
              </div>
            )}
          </div>

          {/* DESKTOP STICKY ORDER SUMMARY */}
          <aside className="hidden min-w-0 lg:block">
            <div className="sticky top-28 rounded-[26px] border border-plum/5 bg-white p-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-2xl text-plum">Order Summary</h2>
                <span className="rounded-full bg-blush/40 px-3 py-1 font-body text-xs text-plum">
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="mt-7">
                <OrderSummaryContent cartItems={cartItems} cartSubtotal={cartSubtotal} verifiedSubtotal={verifiedSubtotal} />
              </div>
              {!isReviewing && (
                <button
                  type="submit"
                  form="jhair-checkout-form"
                  disabled={isQuoting || !checkoutStockVerified}
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-plum px-5 py-4 font-body text-sm font-medium text-white transition-colors hover:bg-rose disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isQuoting ? "Checking Your Order..." : !checkoutStockVerified ? "Verifying Stock..." : "Review Order"}
                  <ArrowRight size={17} />
                </button>
              )}
              <Link to="/shop" className="mt-5 flex items-center justify-center gap-2 font-body text-xs text-plum/60 transition-colors hover:text-rose">
                <ArrowLeft size={15} /> Continue Shopping
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default Checkout;
