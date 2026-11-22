
import "dotenv/config";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";

/**
 * JHAIRS — UPDATE ADMIN PASSWORD
 *
 * Finds an existing admin by email.
 * Hashes the new password securely.
 * Updates only that admin's password.
 *
 * Does not create or delete accounts.
 */

async function updateAdminPassword() {
  try {
    // Read credentials from our private .env file.
    const email = process.env.ADMIN_SETUP_EMAIL
      ?.trim()
      .toLowerCase();

    const newPassword =
      process.env.ADMIN_SETUP_PASSWORD;

    // Make sure all required settings exist.
    if (
      !process.env.MONGODB_URI ||
      !email ||
      !newPassword
    ) {
      throw new Error(
        "Missing MONGODB_URI, ADMIN_SETUP_EMAIL or ADMIN_SETUP_PASSWORD."
      );
    }

    // Require a sufficiently long password.
    if (
      newPassword.length < 12 ||
      newPassword.length > 72
    ) {
      throw new Error(
        "Password must be between 12 and 72 characters."
      );
    }

    // Connect to MongoDB Atlas.
    await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log("JHAIRS MongoDB connected.");

    // Find the existing administrator.
    // Explicitly include passwordHash,
    // which is normally hidden from queries.
    const admin = await Admin.findOne({
      email,
    }).select("+passwordHash");

    // Never create a new admin if none exists.
    if (!admin) {
      throw new Error(
        "Admin account not found. Check ADMIN_SETUP_EMAIL."
      );
    }

    // Use the Admin model's bcrypt method.
    await admin.setPassword(newPassword);

    // Save the new password hash.
    await admin.save();

    console.log(
      "JHAIRS admin password updated successfully!"
    );
  } catch (error) {
    console.error(
      "Password update failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    // Close MongoDB connection.
    await mongoose.disconnect();
  }
}

// Execute the script.
updateAdminPassword();
