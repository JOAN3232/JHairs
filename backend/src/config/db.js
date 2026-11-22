
import mongoose from "mongoose";

/**
 * JHAIRS — MONGODB DATABASE CONNECTION
 *
 * This file connects our backend to MongoDB Atlas
 * using Mongoose.
 */

// Create an asynchronous database connection function.
const connectDB = async () => {
  try {
    // Read the connection string from our .env file.
    const mongoURI = process.env.MONGODB_URI;

    // Stop if the MongoDB connection string is missing.
    if (!mongoURI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    // Connect to MongoDB Atlas.
    const connection = await mongoose.connect(mongoURI);

    // Display a success message when connected.
    console.log(
      `JHAIRS MongoDB connected: ${connection.connection.name}`
    );
  } catch (error) {
    // Display a safe error message without printing credentials.
    console.error(
      "JHAIRS MongoDB connection failed:",
      error.message
    );

    // Stop the server if the database cannot connect.
    process.exit(1);
  }
};

// Export the function for use in server.js.
export default connectDB;
