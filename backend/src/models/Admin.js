
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * JHAIRS — ADMIN MODEL
 *
 * This model stores information about
 * authorised JHAIRS administrators.
 *
 * SECURITY:
 * - Passwords are hashed before storage.
 * - The original password is never saved.
 * - Password hashes are hidden from normal queries.
 * - Admin email addresses must be unique.
 *
 * Guest customers do not use this model.
 */

// ==========================================
// CREATE ADMIN SCHEMA
// ==========================================

const adminSchema = new mongoose.Schema(
  {
    // Name of the store administrator.
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Unique administrator email address.
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Store the hashed password only.
    // select: false prevents accidental exposure
    // when querying admin records.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    // Administrator role.
    role: {
      type: String,
      enum: ["ADMIN"],
      default: "ADMIN",
    },

    // Allows us to disable an admin account.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    // Automatically track creation and updates.
    timestamps: true,
  }
);

// ==========================================
// PASSWORD HASHING METHOD
// ==========================================

/**
 * Hash a password using bcrypt.
 *
 * This method will be used when creating
 * an administrator or updating a password.
 */
adminSchema.methods.setPassword = async function (
  plainPassword
) {
  // Use bcrypt with a cost factor of 12.
  this.passwordHash = await bcrypt.hash(
    plainPassword,
    12
  );
};

// ==========================================
// PASSWORD VERIFICATION METHOD
// ==========================================

/**
 * Compare a submitted password against
 * the securely stored password hash.
 *
 * Returns true if they match.
 */
adminSchema.methods.verifyPassword =
  async function (plainPassword) {
    return bcrypt.compare(
      plainPassword,
      this.passwordHash
    );
  };

// ==========================================
// EXPORT ADMIN MODEL
// ==========================================

const Admin = mongoose.model(
  "Admin",
  adminSchema
);

export default Admin;
