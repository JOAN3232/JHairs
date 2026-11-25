
import express from "express";
import cors from "cors";

// ============================================
// EXISTING JHAIRS ROUTES
// ============================================

import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import adminProductRoutes from "./routes/adminProductRoutes.js";
import adminUploadRoutes from "./routes/adminUploadRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";

// ============================================
// CREATE EXPRESS APPLICATION
// ============================================

const app = express();

// ============================================
// CONFIGURE CORS
// ============================================

// Allow the local frontend and configured production frontend.
// FRONTEND_URL can contain one origin.
// FRONTEND_URLS can contain multiple comma-separated origins.
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || "").split(","),
]
  .filter(Boolean)
  .map((origin) => origin.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server
      // requests and local health checks.
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        return callback(null, true);
      }

      // Do not grant browser access to unapproved origins.
      return callback(null, false);
    },
  }),
);

// ============================================
// PARSE JSON REQUEST BODIES
// ============================================

// Preserve the exact raw body for the Paystack webhook.
// Paystack's signature must be checked against the original bytes.
app.use(
  express.json({
    limit: "100kb",
    verify: (req, res, buffer) => {
      const requestPath = req.originalUrl.split("?")[0];

      if (requestPath === "/api/payments/webhook") {
        req.rawBody = Buffer.from(buffer);
      }
    },
  }),
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

// Customer catalogue and inventory.
app.use("/api/products", productRoutes);

// Customer checkout and guest order creation.
app.use("/api/orders", orderRoutes);

// Payment initialization, verification and Paystack webhook.
app.use("/api/payments", paymentRoutes);

// ============================================
// ADMINISTRATOR ROUTES
// ============================================

// Administrator login and session verification.
app.use("/api/admin", adminAuthRoutes);

// Administrator product management.
app.use("/api/admin/products", adminProductRoutes);

// Secure product image uploads.
app.use("/api/admin/uploads", adminUploadRoutes);

// Protected order management.
app.use("/api/admin/orders", adminOrderRoutes);

// ============================================
// UNKNOWN ROUTES
// ============================================

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
