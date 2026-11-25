
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useCart } from "../context/useCart.js";
import { verifyGuestPayment } from "../services/orderApi.js";

// ============================================
// JHAIRS — PAYSTACK PAYMENT RETURN PAGE
// ============================================

// Customer support details.
const WHATSAPP_NUMBER = "2349136466679";
const SUPPORT_EMAIL = "agujoan86@gmail.com";

function PaymentReturn() {
  // Read the transaction reference returned by Paystack.
  const [searchParams] = useSearchParams();

  const reference =
    searchParams.get("reference") ||
    searchParams.get("trxref");

  // Access the shopping bag's clearCart function.
  const { clearCart } = useCart();

  // Track the payment verification result.
  const [status, setStatus] = useState(
    reference ? "verifying" : "error"
  );

  const [message, setMessage] = useState(
    reference
      ? "Please wait while we confirm your payment."
      : "We couldn't find your payment reference. Please contact our support team."
  );

  // Prevent duplicate verification calls.
  const verificationStarted = useRef(false);

  // Automatically include the payment reference in support messages.
  const supportMessage = reference
    ? `Hello JHAIRS, I need help with my payment.\n\nPayment Reference: ${reference}\n\nPlease assist me with my transaction.`
    : "Hello JHAIRS, I need help with a payment. I couldn't find my payment reference.";

  const whatsappSupportLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    supportMessage
  )}`;

  // ============================================
  // PAYMENT VERIFICATION
  // ============================================

  useEffect(() => {
    if (!reference || verificationStarted.current) return;

    verificationStarted.current = true;

    const verifyPayment = async () => {
      try {
        // Verify the transaction through our backend.
        const response = await verifyGuestPayment(reference);

        // Only proceed if the backend confirms payment.
        if (!response?.paid) {
          throw new Error(
            response?.message ||
              "Your payment could not be confirmed."
          );
        }

        // Payment succeeded, so clear the shopping bag.
        clearCart();

        // Payment succeeded, but inventory needs attention.
        if (response.inventoryIssue) {
          setStatus("attention");
          setMessage(
            response.message ||
              "Your payment was received, but we need to review your order availability. Our team will follow up with you."
          );
          return;
        }

        // Everything was successful.
        setStatus("success");
        setMessage(
          response.message ||
            "Your payment has been confirmed successfully."
        );
      } catch (error) {
        // Do not clear the shopping bag if verification fails.
        setStatus("error");
        setMessage(
          error.message ||
            "We couldn't verify your payment. Please contact our support team."
        );
      }
    };

    verifyPayment();
  }, [reference, clearCart]);

  // ============================================
  // PAGE UI
  // ============================================

  return (
    <main className="min-h-[70vh] bg-[#FFFAFC] px-5 py-20 font-body">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">

        {/* Brand identity */}
        <p className="mb-3 font-heading text-sm tracking-[0.35em] text-[#B1849B]">
          JHAIRS
        </p>

        {/* Verification status icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F9EDF2]">
          {status === "verifying" && (
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#E8CBD8] border-t-[#A66F89]" />
          )}

          {status === "success" && (
            <span className="text-4xl text-[#A66F89]">✓</span>
          )}

          {status === "attention" && (
            <span className="text-4xl text-[#B1849B]">!</span>
          )}

          {status === "error" && (
            <span className="text-4xl text-[#A66F89]">×</span>
          )}
        </div>

        {/* Status heading */}
        <h1 className="mb-4 font-heading text-3xl text-[#553747] sm:text-4xl">
          {status === "verifying" && "Verifying Your Payment"}
          {status === "success" && "Payment Confirmed"}
          {status === "attention" && "Payment Received"}
          {status === "error" && "Payment Verification Issue"}
        </h1>

        {/* Status explanation */}
        <p className="max-w-md text-sm leading-7 text-[#806B76]">
          {message}
        </p>

        {/* Transaction reference */}
        {reference && (
          <div className="mt-8 w-full rounded-xl border border-[#F0E5E9] bg-white p-5 text-left">
            <p className="mb-2 text-xs uppercase tracking-widest text-[#B1849B]">
              Payment Reference
            </p>

            <p className="break-all text-sm text-[#553747]">
              {reference}
            </p>
          </div>
        )}

        {/* Successful payment message */}
        {status === "success" && (
          <p className="mt-6 text-sm leading-7 text-[#806B76]">
            Thank you for shopping with JHAIRS. Your order payment
            has been verified and your shopping bag has been cleared.
          </p>
        )}

        {/* Inventory review message */}
        {status === "attention" && (
          <p className="mt-6 text-sm leading-7 text-[#806B76]">
            Your payment was successful and your shopping bag has
            been cleared. Please keep your payment reference for
            future communication.
          </p>
        )}

        {/* ============================================
            CUSTOMER SUPPORT
        ============================================ */}

        {(status === "error" || status === "attention") && (
          <div className="mt-8 w-full rounded-2xl border border-[#F0E5E9] bg-white p-6">
            <h2 className="font-heading text-lg text-[#553747]">
              Need Help With Your Payment?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#806B76]">
              Contact our support team directly. Your payment
              reference will be included automatically in your
              WhatsApp message.
            </p>

            {/* WhatsApp support button */}
            <a
              href={whatsappSupportLink}
              target="_blank"
              rel="noopener noreferrer"
              className="
                mt-5 flex w-full items-center
                justify-center gap-2 rounded-full
                bg-[#25D366] px-6 py-3.5
                text-sm font-medium text-white
                transition hover:bg-[#1EBE5D]
              "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>

              Chat With Us on WhatsApp
            </a>

            {/* Email support alternative */}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                "JHAIRS Payment Support"
              )}&body=${encodeURIComponent(supportMessage)}`}
              className="
                mt-3 flex w-full items-center
                justify-center rounded-full
                border border-[#E8CBD8]
                px-6 py-3 text-sm
                text-[#553747]
                transition hover:bg-[#F9EDF2]
              "
            >
              Email Customer Support
            </a>
          </div>
        )}

        {/* ============================================
            NAVIGATION ACTIONS
        ============================================ */}

        {status !== "verifying" && (
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/shop"
              className="rounded-full bg-[#553747] px-7 py-3 text-sm text-white transition hover:bg-[#70485D]"
            >
              Continue Shopping
            </Link>

            <Link
              to="/"
              className="rounded-full border border-[#E8CBD8] px-7 py-3 text-sm text-[#553747] transition hover:bg-[#F9EDF2]"
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default PaymentReturn;
