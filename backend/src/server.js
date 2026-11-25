
import "dotenv/config";

import mongoose from "mongoose";

import app from "./app.js";
import connectDB from "./config/db.js";

/**
 * JHAIRS — BACKEND SERVER
 *
 * RESPONSIBILITIES:
 * 1. Load environment variables.
 * 2. Connect to MongoDB.
 * 3. Start the Express API.
 * 4. Handle startup errors.
 * 5. Handle graceful server shutdown.
 */

// ==========================================
// SERVER CONFIGURATION
// ==========================================

const PORT = process.env.PORT || 5000;

let server;
let isShuttingDown = false;

// ==========================================
// START SERVER
// ==========================================

const startServer = async () => {
  try {
    // Wait for MongoDB before accepting requests.
    await connectDB();

    // Start Express only after the database connects.
    server = app.listen(PORT, () => {
      console.log(
        `JHAIRS backend running on port ${PORT}`
      );
    });

    // Handle unexpected server errors.
    server.on("error", (error) => {
      console.error("JHAIRS server error:", error);

      process.exit(1);
    });
  } catch (error) {
    console.error(
      "JHAIRS backend startup failed:",
      error.message
    );

    process.exit(1);
  }
};

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

const shutdownServer = async (signal) => {
  // Prevent multiple shutdown operations.
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(
    `${signal} received. Shutting down JHAIRS backend...`
  );

  try {
    // Stop accepting new HTTP requests.
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }

    // Close the MongoDB connection.
    await mongoose.disconnect();

    console.log("JHAIRS backend shut down successfully.");

    process.exit(0);
  } catch (error) {
    console.error(
      "JHAIRS shutdown error:",
      error.message
    );

    process.exit(1);
  }
};

// ==========================================
// PROCESS SIGNAL HANDLERS
// ==========================================

process.on("SIGTERM", () => {
  shutdownServer("SIGTERM");
});

process.on("SIGINT", () => {
  shutdownServer("SIGINT");
});

// ==========================================
// START APPLICATION
// ==========================================

startServer();
