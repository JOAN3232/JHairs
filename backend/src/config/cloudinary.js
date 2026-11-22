
import { v2 as cloudinary } from "cloudinary";

/**
 * JHAIRS — CLOUDINARY CONFIGURATION
 *
 * Connects our backend to Cloudinary
 * using credentials stored in .env.
 *
 * API credentials must never be
 * exposed to the React frontend.
 */

// Configure Cloudinary using environment variables.
cloudinary.config({
  // Your Cloudinary cloud name.
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,

  // Your private Cloudinary API key.
  api_key: process.env.CLOUDINARY_API_KEY,

  // Your private Cloudinary API secret.
  api_secret: process.env.CLOUDINARY_API_SECRET,

  // Generate secure HTTPS image URLs.
  secure: true,
});

// Export the configured Cloudinary client
// for use in our image upload routes.
export default cloudinary;
