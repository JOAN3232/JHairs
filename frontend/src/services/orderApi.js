
/**
 * JHAIRS — GUEST CHECKOUT API
 *
 * This file handles:
 *
 * 1. Requesting verified order quotations.
 * 2. Submitting guest order requests.
 * 3. Sending an idempotency request ID.
 * 4. Displaying backend validation errors.
 *
 * IMPORTANT:
 * - Prices are calculated by the backend.
 * - Inventory is verified by the backend.
 * - Orders are saved as PENDING / UNPAID.
 * - No payment is collected here.
 */

// ============================================
// BACKEND API URL
// ============================================

// Use the configured production URL when available.
// Otherwise, connect to our local Express server.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

// ============================================
// HELPER — PREPARE CART ITEMS
// ============================================

/**
 * Send only product identifiers, selected
 * variations and quantities.
 *
 * Never send browser-calculated prices
 * as authoritative order amounts.
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

// ============================================
// HELPER — HANDLE API RESPONSES
// ============================================

async function readApiResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server sent an unexpected response. Please try again."
    );
  }

  // Pass backend validation messages
  // directly to the calling page.
  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
        "Unable to process your request."
    );
  }

  return data;
}

// ============================================
// REQUEST AN ORDER QUOTATION
// ============================================

/**
 * Validates products, prices and available
 * inventory without creating an order.
 */
export async function fetchOrderQuote(cartItems) {
  const items = prepareCartItems(cartItems);

  const response = await fetch(
    `${API_BASE_URL}/api/orders/quote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    }
  );

  return readApiResponse(response);
}

// ============================================
// CREATE A GUEST ORDER REQUEST
// ============================================

/**
 * Sends the reviewed cart and customer details
 * to the JHAIRS backend.
 *
 * Each new order needs an orderRequestId.
 * Retrying the SAME order must reuse its ID.
 *
 * The backend is responsible for verifying
 * products and preventing duplicate orders.
 */
export async function createGuestOrder({
  cartItems,
  customer,
  deliveryAddress,
  deliveryMethod,
  notes,
  orderRequestId,
}) {
  // Ensure the caller supplies a properly
  // formatted UUID.
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    typeof orderRequestId !== "string" ||
    !uuidPattern.test(orderRequestId)
  ) {
    throw new Error(
      "A valid order request ID is required."
    );
  }

  // Prepare selected product variations.
  const items = prepareCartItems(cartItems);

  // Submit the order request.
  const response = await fetch(
    `${API_BASE_URL}/api/orders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderRequestId,
        customer,
        deliveryAddress,
        deliveryMethod,
        notes,
        items,
      }),
    }
  );

  // Return the saved order's reference,
  // statuses and verified subtotal.
  return readApiResponse(response);
}
