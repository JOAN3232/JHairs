
import express from "express";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";

import Admin from "../models/Admin.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

/**
 * JHAIRS — ADMIN AUTHENTICATION ROUTES
 *
 * POST /api/admin/login
 * - Verify admin email and password.
 * - Issue a short-lived JWT.
 *
 * GET /api/admin/me
 * - Verify an existing admin session.
 * - Return non-sensitive admin details.
 *
 * No public administrator registration route.
 */

const router = express.Router();

// ==========================================
// LOGIN RATE LIMIT
// ==========================================

// Limit repeated login requests.
// This helps slow automated password guessing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  // Count failed attempts; successful requests
  // won't consume the five-attempt allowance.
  skipSuccessfulRequests: true,

  message: {
    success: false,
    message:
      "Too many login attempts. Please try again later.",
  },
});

// ==========================================
// POST /api/admin/login
// ==========================================

router.post("/login", loginLimiter, async (req, res) => {
  try {
    // Check the backend's JWT configuration.
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret || jwtSecret.length < 32) {
      console.error("JWT_SECRET is missing or too short.");

      return res.status(503).json({
        success: false,
        message: "Administrator login is unavailable.",
      });
    }

    // Read submitted login details.
    const { email, password } = req.body ?? {};

    // Validate basic input types and lengths.
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      email.length > 254 ||
      password.length > 200
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email and password.",
      });
    }

    // Normalize email to match the Admin model.
    const normalizedEmail = email.trim().toLowerCase();

    // Find the admin and explicitly include
    // the normally hidden password hash.
    const admin = await Admin.findOne({
      email: normalizedEmail,
    }).select("+passwordHash");

    // Use the same message for incorrect accounts,
    // incorrect passwords and inactive accounts.
    // This avoids disclosing whether an email exists.
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Compare the submitted password with bcrypt.
    const passwordMatches =
      await admin.verifyPassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Create an authentication token that expires
    // after 15 minutes.
    const token = jwt.sign(
      {
        role: "ADMIN",
      },
      jwtSecret,
      {
        algorithm: "HS256",
        subject: String(admin._id),
        issuer: "jhairs-api",
        audience: "jhairs-admin",
        expiresIn: "15m",
      }
    );

    // Return the JWT and safe account details.
    // Never return the password hash.
    return res.status(200).json({
      success: true,
      message: "Administrator login successful.",
      token,
      tokenType: "Bearer",
      expiresIn: 900,
      admin: {
        id: String(admin._id),
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("JHAIRS admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to complete administrator login.",
    });
  }
});

// ==========================================
// GET /api/admin/me
// ==========================================

// This endpoint requires a valid token.
router.get("/me", requireAdmin, (req, res) => {
  const admin = req.admin;

  return res.status(200).json({
    success: true,
    admin: {
      id: String(admin._id),
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});

// ==========================================
// EXPORT AUTH ROUTES
// ==========================================

export default router;
