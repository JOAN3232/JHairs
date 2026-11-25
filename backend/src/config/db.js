
import mongoose from "mongoose";

/**
 * JHAIRS — MONGODB DATABASE CONNECTION
 *
 * RESPONSIBILITIES:
 * 1. Read the MongoDB connection string.
 * 2. Validate database configuration.
 * 3. Connect to MongoDB Atlas.
 * 4. Configure safe database connection behaviour.
 * 5. Report connection errors without exposing credentials.
 */

// ==========================================
// DATABASE CONNECTION
// ==========================================

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  // Stop if the connection string is missing.
  if (!mongoURI || !mongoURI.trim()) {
    throw new Error("MONGODB_URI is missing from environment variables.");
  }

  try {
    // Connect to MongoDB Atlas.
    const connection = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 0,
    });

    console.log(
      `JHAIRS MongoDB connected: ${connection.connection.name}`
    );

    return connection;
  } catch (error) {
    // Do not print the connection string or credentials.
    console.error(
      "JHAIRS MongoDB connection failed:",
      error.message
    );

    throw error;
  }
};

// ==========================================
// DATABASE CONNECTION EVENTS
// ==========================================

mongoose.connection.on("disconnected", () => {
  console.warn("JHAIRS MongoDB disconnected.");
});

mongoose.connection.on("reconnected", () => {
  console.log("JHAIRS MongoDB reconnected.");
});

mongoose.connection.on("error", (error) => {
  console.error(
    "JHAIRS MongoDB connection error:",
    error.message
  );
});

// ==========================================
// EXPORT DATABASE CONNECTION
// ==========================================

export default connectDB;
