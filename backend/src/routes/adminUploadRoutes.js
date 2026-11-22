
import express from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { rateLimit } from "express-rate-limit";

// Reuse our existing administrator authentication.
import requireAdmin from "../middleware/requireAdmin.js";

// Reuse the Cloudinary configuration we just created.
import cloudinary from "../config/cloudinary.js";

/**
 * JHAIRS — SECURE PRODUCT IMAGE UPLOAD
 *
 * Endpoint: POST /api/admin/uploads/image
 *
 * FEATURES:
 * - Requires a valid administrator JWT.
 * - Accepts JPG, PNG and WebP images.
 * - Limits each image to 5 MB.
 * - Checks the actual file format.
 * - Uploads images to Cloudinary.
 * - Returns a secure image URL.
 */

// Create the Express router.
const router = express.Router();

// ============================================
// CONFIGURE FILE UPLOADS
// ============================================

// Store the image temporarily in server memory.
const upload = multer({
  storage: multer.memoryStorage(),

  // Limit upload size and request complexity.
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
    parts: 1,
  },
}).single("image");

// Accept only supported image formats.
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// ============================================
// RATE LIMITING
// ============================================

// Limit upload requests from the same IP.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many uploads. Please try again later.",
  },
});

// ============================================
// CLOUDINARY UPLOAD HELPER
// ============================================

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    // Create a secure Cloudinary upload stream.
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "jhairs/products",
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(
            new Error("Cloudinary did not return an image URL.")
          );
          return;
        }

        resolve(result);
      }
    );

    // Send the image buffer into the stream.
    stream.end(buffer);
  });
}

// ============================================
// ADMIN — UPLOAD PRODUCT IMAGE
// ============================================

router.post(
  "/image",

  // Block requests without a valid admin token.
  requireAdmin,

  // Limit excessive upload attempts.
  uploadLimiter,

  // Receive the uploaded image.
  (req, res) => {
    upload(req, res, async (uploadError) => {
      try {
        // Reject invalid multipart uploads.
        if (uploadError) {
          if (uploadError.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              success: false,
              message: "Image must be 5 MB or smaller.",
            });
          }

          return res.status(400).json({
            success: false,
            message: "Invalid image upload.",
          });
        }

        // Require an uploaded file.
        if (!req.file?.buffer) {
          return res.status(400).json({
            success: false,
            message: "Please select an image.",
          });
        }

        // Check the actual image file format.
        const detectedType = await fileTypeFromBuffer(
          req.file.buffer
        );

        if (
          !detectedType ||
          !allowedTypes.has(detectedType.mime)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Only JPG, PNG and WebP images are allowed.",
          });
        }

        // Check configuration before uploading.
        if (
          !process.env.CLOUDINARY_CLOUD_NAME ||
          !process.env.CLOUDINARY_API_KEY ||
          !process.env.CLOUDINARY_API_SECRET
        ) {
          return res.status(503).json({
            success: false,
            message: "Cloudinary is not configured.",
          });
        }

        // Upload to the JHAIRS Cloudinary folder.
        const result = await uploadToCloudinary(
          req.file.buffer
        );

        // Return the image URL to React.
        return res.status(201).json({
          success: true,
          message: "Image uploaded successfully.",
          image: {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
          },
        });
      } catch (error) {
        // Log server-side errors without revealing
        // private Cloudinary credentials to users.
        console.error(
          "JHAIRS image upload error:",
          error.message
        );

        return res.status(500).json({
          success: false,
          message:
            "Unable to upload image. Please try again.",
        });
      }
    });
  }
);

// Export the route for registration in app.js.
export default router;
