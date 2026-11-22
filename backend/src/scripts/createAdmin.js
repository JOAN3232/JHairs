
import "dotenv/config";
import mongoose from "mongoose";

import Admin from "../models/Admin.js";

/**
 * JHAIRS — FIRST ADMIN SETUP
 *
 * PURPOSE:
 * - Connect to MongoDB Atlas.
 * - Create the first administrator.
 * - Hash the administrator's password.
 * - Prevent creating another first admin.
 *
 * This is a private command-line script.
 * It is NOT a public registration endpoint.
 */

async function createAdmin() {
  try {
    // ========================================
    // READ PRIVATE SETUP DETAILS
    // ========================================

    const name = process.env.ADMIN_SETUP_NAME?.trim();

    const email = process.env.ADMIN_SETUP_EMAIL
      ?.trim()
      .toLowerCase();

    const password = process.env.ADMIN_SETUP_PASSWORD;

    const mongoUri = process.env.MONGODB_URI;

    // ========================================
    // VALIDATE SETUP DETAILS
    // ========================================

    if (!mongoUri || !name || !email || !password) {
      throw new Error(
        "Missing MongoDB connection or admin setup details."
      );
    }

    // Require a valid-looking email address.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid admin email address.");
    }

    // Require a reasonably strong password.
    if (
      password.length < 12 ||
      password.length > 72
    ) {
      throw new Error(
        "Admin password must contain 12 to 72 characters."
      );
    }

    // ========================================
    // CONNECT TO MONGODB
    // ========================================

    await mongoose.connect(mongoUri);

    console.log("JHAIRS MongoDB connected.");

    // ========================================
    // CHECK FOR AN EXISTING ADMIN
    // ========================================

    // This script is only for the first admin.
    const existingAdmin = await Admin.exists({});

    if (existingAdmin) {
      console.log(
        "An administrator already exists. No new admin created."
      );

      return;
    }

    // ========================================
    // CREATE THE ADMIN ACCOUNT
    // ========================================

    const admin = new Admin({
      name,
      email,
      role: "ADMIN",
      isActive: true,
    });

    // Hash the password using our Admin model.
    await admin.setPassword(password);

    // Save the account in MongoDB.
    await admin.save();

    // Never print the password or its hash.
    console.log("JHAIRS administrator created successfully!");
    console.log(`Admin email: ${admin.email}`);
  } catch (error) {
    // Handle duplicate emails and setup errors.
    console.error(
      "JHAIRS admin setup failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    // Close the database connection cleanly.
    await mongoose.disconnect();
  }
}

// Execute the setup script.
createAdmin();
