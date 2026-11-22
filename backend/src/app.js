
import express from "express";
import cors from "cors";

// ============================================
// EXISTING JHAIRS ROUTES
// ============================================

// Customer catalogue, product details, and inventory.
import productRoutes from "./routes/productRoutes.js";

// Public checkout quote and guest order creation.
import orderRoutes from "./routes/orderRoutes.js";

// Administrator authentication and login.
import adminAuthRoutes from "./routes/adminAuthRoutes.js";

// Administrator product management.
import adminProductRoutes from "./routes/adminProductRoutes.js";

// Secure Cloudinary product image uploads.
import adminUploadRoutes from "./routes/adminUploadRoutes.js";

// ============================================
// NEW — PROTECTED ADMIN ORDERS API
// ============================================

import adminOrderRoutes from "./routes/adminOrderRoutes.js";

/**
 * JHAIRS — EXPRESS APPLICATION
 *
 * PUBLIC FEATURES:
 * - Product catalogue.
 * - Product details and inventory checks.
 * - Checkout quotation.
 * - Guest order requests.
 *
 * ADMINISTRATOR FEATURES:
 * - Secure login and session verification.
 * - Product management.
 * - Inventory management.
 * - Cloudinary image uploads.
 * - Customer order management (read-only for now).
 */

// ============================================
// CREATE EXPRESS APPLICATION
// ============================================

const app = express();

// ============================================
// CONFIGURE GLOBAL MIDDLEWARE
// ============================================

// Allow our React development frontend.
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// Parse JSON request bodies.
// Multer handles image uploads separately.
app.use(
  express.json({
    limit: "100kb",
  })
);

// ============================================
// PUBLIC ROUTES
// ============================================

// Welcome message.
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Welcome to the JHAIRS API!",
  });
});

// Backend health check.
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "JHAIRS API is running successfully!",
  });
});

// Customer catalogue and inventory endpoints.
app.use("/api/products", productRoutes);

// Customer checkout and guest order creation.
app.use("/api/orders", orderRoutes);

// ============================================
// ADMINISTRATOR ROUTES
// ============================================

// Login and verify administrator sessions.
app.use("/api/admin", adminAuthRoutes);

// Product creation and editing.
app.use("/api/admin/products", adminProductRoutes);

// Upload product images to Cloudinary.
app.use("/api/admin/uploads", adminUploadRoutes);

// Protected customer order listing and details.
// Authentication is enforced inside adminOrderRoutes.
app.use("/api/admin/orders", adminOrderRoutes);

// ============================================
// UNKNOWN ROUTES
// ============================================

// Return JSON for unknown endpoints.
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ============================================
// EXPORT EXPRESS APPLICATION
// ============================================

export default app;
