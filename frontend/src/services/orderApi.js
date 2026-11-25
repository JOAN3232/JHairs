
/**
 * JHAIRS — GUEST CHECKOUT API
 *
 * This file handles:
 * 1. Requesting verified order quotations.
 * 2. Sending the selected delivery state to the backend.
 * 3. Submitting guest order requests.
 * 4. Sending an idempotency request ID.
 * 5. Displaying backend validation errors.
 *
 * IMPORTANT:
 * - Product prices are calculated by the backend.
 * - Delivery fees are calculated by the backend.
 * - The frontend must never be trusted to determine final order totals.
 * - Orders are created as PENDING and UNPAID.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

/**
 * Converts frontend cart items into the format
 * expected by the backend order API.
 */
function prepareCartItems(cartItems) {
  return cartItems.map((item) => ({
    productId: item.productId,
    color: item.color,
    length: item.length,
    density: item.density || "",
    laceType: item.laceType || "",
    quantity: item.quantity,
  }));
}

/**
 * Safely reads the API response.
 * Handles invalid JSON and backend error messages.
 */
async function readApiResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server sent an unexpected response. Please try again."
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Unable to process your request."
    );
  }

  return data;
}

/**
 * REQUEST ORDER QUOTE
 *
 * Sends the cart items AND selected delivery state.
 *
 * The backend verifies:
 * - Product existence
 * - Selected variations
 * - Stock availability
 * - Product prices
 * - Delivery fee
 * - Total order amount
 *
 * No order is created at this stage.
 */
export async function fetchOrderQuote(
  cartItems,
  deliveryState
) {
  const items = prepareCartItems(cartItems);

  const response = await fetch(
    `${API_BASE_URL}/api/orders/quote`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        items,

        deliveryAddress: {
          state: deliveryState,
        },
      }),
    }
  );

  return readApiResponse(response);
}

/**
 * CREATE GUEST ORDER
 *
 * Submits the customer's order after checkout confirmation.
 *
 * The backend recalculates:
 * - Product subtotal
 * - Delivery fee
 * - Final total
 *
 * The frontend does not send trusted prices.
 */
export async function createGuestOrder({
  cartItems,
  customer,
  deliveryAddress,
  deliveryMethod,
  notes,
  orderRequestId,
}) {
  const items = prepareCartItems(cartItems);

  const response = await fetch(
    `${API_BASE_URL}/api/orders`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        items,
        customer,
        deliveryAddress,
        deliveryMethod,
        notes,

        // Prevent duplicate orders when a request
        // is repeated because of a network issue.
        orderRequestId,
      }),
    }
  );

  return readApiResponse(response);
}



// ============================================
// INITIALIZE PAYSTACK PAYMENT
// ============================================

export async function initializeGuestPayment(orderNumber) {
  const response = await fetch(`${API_BASE_URL}/api/payments/initialize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderNumber }),
  });

  return readApiResponse(response);
}

// ============================================
// VERIFY PAYSTACK PAYMENT
// ============================================

export async function verifyGuestPayment(reference) {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/verify/${encodeURIComponent(reference)}`
  );

  return readApiResponse(response);
}