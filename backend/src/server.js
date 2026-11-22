
import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";

/**
 * JHAIRS — BACKEND SERVER
 *
 * This file:
 * 1. Loads environment variables.
 * 2. Connects to MongoDB Atlas.
 * 3. Starts our Express API server.
 */

// Use the port from .env, or 5000 as the default.
const PORT = process.env.PORT || 5000;

// Start our backend only after MongoDB is connected.
const startServer = async () => {
  // Wait for the MongoDB connection to succeed.
  await connectDB();

  // Start Express after connecting successfully.
  app.listen(PORT, () => {
    console.log(
      `JHAIRS backend running on port ${PORT}`
    );
  });
};

// Run the server startup function.
startServer();
