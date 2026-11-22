
/**
 * JHAIRS — PRODUCT API SERVICE
 *
 * This file communicates with our Express backend.
 *
 * It:
 * - Requests products from MongoDB through our API.
 * - Checks for unsuccessful responses.
 * - Converts legacyId into the numeric ID expected
 *   by our existing React product components.
 */

// Use our local backend while developing.
// We can configure the deployed backend URL later.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

/**
 * Retrieve all active products from the backend.
 *
 * The optional signal lets React cancel a request
 * when the Shop page is closed.
 */
export async function fetchProducts(signal) {
  // Send a GET request to our Express Product API.
  const response = await fetch(
    `${API_BASE_URL}/api/products`,
    { signal }
  );

  // Handle HTTP errors.
  if (!response.ok) {
    throw new Error(
      `Unable to load products (HTTP ${response.status}).`
    );
  }

  // Convert the JSON response into JavaScript data.
  const data = await response.json();

  // Check that the backend returned the expected format.
  if (!data.success || !Array.isArray(data.products)) {
    throw new Error("Invalid product data received.");
  }

  // Convert each database product into the format
  // our existing frontend components already use.
  return data.products.map((product) => ({
    ...product,

    // Preserve existing /products/1, /products/2 routes.
    id: product.legacyId,
  }));
}



/**
 * Fetch one JHAIRS product from MongoDB.
 *
 * Supports both:
 * - Existing frontend IDs such as 1, 2, 3.
 * - MongoDB document IDs.
 *
 * Converts legacyId to id so our existing
 * shopping bag and product routes still work.
 */
export async function fetchProductById(id, signal) {
  // Request the product from our Express backend.
  const response = await fetch(
    `${API_BASE_URL}/api/products/${encodeURIComponent(id)}`,
    { signal }
  );

  // Give missing products their own error type.
  if (response.status === 404) {
    const error = new Error("Product not found.");
    error.status = 404;
    throw error;
  }

  // Handle other unsuccessful requests.
  if (!response.ok) {
    throw new Error(
      `Unable to load product (HTTP ${response.status}).`
    );
  }

  // Read the JSON sent by Express.
  const data = await response.json();

  // Confirm the backend returned a product.
  if (!data.success || !data.product) {
    throw new Error("Invalid product data received.");
  }

  // Preserve the numeric product ID used by our
  // existing ProductCard and CartContext.
  return {
    ...data.product,
    id: data.product.legacyId,
  };
}
