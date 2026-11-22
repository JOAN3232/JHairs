
import express from "express";
import mongoose from "mongoose";

import Product from "../models/Product.js";
import requireAdmin from "../middleware/requireAdmin.js";

/**
 * JHAIRS — PRODUCT API ROUTES
 *
 * CUSTOMER ENDPOINTS:
 * GET /api/products
 * GET /api/products/:id
 *
 * ADMIN ENDPOINTS:
 * GET /api/products/admin/inventory
 * PUT /api/products/admin/inventory/:id
 *
 * Inventory editing requires a valid administrator JWT.
 */

const router = express.Router();

// ============================================
// HELPER — BUILD A VALID PRODUCT QUERY
// ============================================

function getProductQuery(id) {
  if (typeof id !== "string") {
    return null;
  }

  const cleanId = id.trim();

  // Support existing frontend IDs: 1, 2, 3...
  if (/^[1-9]\d*$/.test(cleanId)) {
    const legacyId = Number(cleanId);

    if (!Number.isSafeInteger(legacyId)) {
      return null;
    }

    return { legacyId };
  }

  // Also support MongoDB ObjectIds.
  if (mongoose.isObjectIdOrHexString(cleanId)) {
    return { _id: cleanId };
  }

  return null;
}

// ============================================
// HELPER — IDENTIFY ONE EXACT VARIATION
// ============================================

function variationKey(variation) {
  return JSON.stringify([
    variation.color,
    variation.length,
    variation.density,
    variation.laceType,
  ]);
}

// ============================================
// ADMIN — GET INVENTORY
// ============================================

/**
 * Returns all products, including inactive ones,
 * so administrators can manage their inventory.
 *
 * Only authenticated administrators can access it.
 */

router.get(
  "/admin/inventory",
  requireAdmin,
  async (req, res) => {
    try {
      // Retrieve products and their variation stock.
      const products = await Product.find({})
        .select(
          "legacyId name category image lengths colors " +
          "densities laceTypes inventory isActive featured"
        )
        .sort({ legacyId: 1 })
        .lean();

      return res.status(200).json({
        success: true,
        count: products.length,
        products,
      });
    } catch (error) {
      console.error(
        "JHAIRS: Unable to fetch admin inventory:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to retrieve inventory.",
      });
    }
  }
);

// ============================================
// ADMIN — UPDATE ONE VARIATION'S STOCK
// ============================================

/**
 * PUT /api/products/admin/inventory/:id
 *
 * Example request:
 *
 * {
 *   "color": "Natural Black",
 *   "length": 18,
 *   "density": "180%",
 *   "laceType": "13x4 Frontal",
 *   "stock": 10
 * }
 *
 * For a product without densities or lace types,
 * pass an empty string for those options.
 *
 * IMPORTANT:
 * This endpoint SETS the available stock quantity.
 * It does not deduct stock for customer purchases.
 */

router.put(
  "/admin/inventory/:id",
  requireAdmin,
  async (req, res) => {
    try {
      // ======================================
      // VALIDATE PRODUCT ID
      // ======================================

      const productQuery = getProductQuery(
        req.params.id
      );

      if (!productQuery) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID.",
        });
      }

      // ======================================
      // VALIDATE REQUEST BODY
      // ======================================

      const body = req.body;

      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid inventory request.",
        });
      }

      const {
        color,
        length,
        density = "",
        laceType = "",
        stock,
      } = body;

      // Colours must be provided as text.
      if (
        typeof color !== "string" ||
        !color.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Select a valid hair colour.",
        });
      }

      // Length must be a whole number.
      if (
        !Number.isSafeInteger(length) ||
        length < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Select a valid hair length.",
        });
      }

      // Density and lace type must be strings.
      if (
        typeof density !== "string" ||
        typeof laceType !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid variation options.",
        });
      }

      // Stock must never be negative or fractional.
      if (
        !Number.isSafeInteger(stock) ||
        stock < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Stock must be a non-negative whole number.",
        });
      }

      // Normalize text before comparing options.
      const selectedVariation = {
        color: color.trim(),
        length,
        density: density.trim(),
        laceType: laceType.trim(),
        stock,
      };

      // ======================================
      // FETCH THE PRODUCT
      // ======================================

      // Include __v for concurrency protection.
      const product = await Product.findOne(
        productQuery
      ).lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      // ======================================
      // VALIDATE COLOUR
      // ======================================

      const validColour = product.colors.some(
        (item) =>
          item.name === selectedVariation.color
      );

      if (!validColour) {
        return res.status(400).json({
          success: false,
          message:
            "This colour is not available for this product.",
        });
      }

      // ======================================
      // VALIDATE LENGTH
      // ======================================

      if (
        !product.lengths.includes(
          selectedVariation.length
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This length is not available for this product.",
        });
      }

      // ======================================
      // VALIDATE DENSITY
      // ======================================

      const validDensity =
        product.densities.length > 0
          ? product.densities.includes(
              selectedVariation.density
            )
          : selectedVariation.density === "";

      if (!validDensity) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid density for this product.",
        });
      }

      // ======================================
      // VALIDATE LACE TYPE
      // ======================================

      const validLaceType =
        product.laceTypes.length > 0
          ? product.laceTypes.includes(
              selectedVariation.laceType
            )
          : selectedVariation.laceType === "";

      if (!validLaceType) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid lace type for this product.",
        });
      }

      // ======================================
      // PREVENT DUPLICATE INVENTORY RECORDS
      // ======================================

      const inventory = [...(product.inventory || [])];

      const existingKeys = inventory.map(
        variationKey
      );

      // Detect duplicate entries already in MongoDB.
      if (
        new Set(existingKeys).size !==
        existingKeys.length
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Duplicate inventory records detected. " +
            "Inventory must be corrected before editing.",
        });
      }

      const selectedKey = variationKey(
        selectedVariation
      );

      const existingIndex = inventory.findIndex(
        (item) =>
          variationKey(item) === selectedKey
      );

      // ======================================
      // UPDATE OR CREATE THE VARIATION
      // ======================================

      if (existingIndex >= 0) {
        // Replace the stock of the existing variation.
        inventory[existingIndex] = {
          ...inventory[existingIndex],
          stock,
        };
      } else {
        // Create a new inventory entry.
        inventory.push(selectedVariation);
      }

      // ======================================
      // ATOMIC VERSION CHECK
      // ======================================

      /**
       * MongoDB applies this update atomically
       * to the single product document.
       *
       * The __v condition prevents two inventory
       * requests that read the same version from
       * silently overwriting each other.
       *
       * Future customer stock reservations must
       * follow compatible concurrency controls.
       */

      const currentVersion = product.__v ?? 0;

      const updateResult = await Product.updateOne(
        {
          _id: product._id,
          __v: currentVersion,
        },
        {
          $set: { inventory },
          $inc: { __v: 1 },
        },
        {
          runValidators: true,
        }
      );

      // Another request may have changed the product.
      if (updateResult.matchedCount !== 1) {
        return res.status(409).json({
          success: false,
          message:
            "Inventory changed during this request. " +
            "Refresh and try again.",
        });
      }

      // ======================================
      // CONFIRM SUCCESS
      // ======================================

      return res.status(200).json({
        success: true,
        message: "Inventory updated successfully.",
        productId: product.legacyId,
        variation: selectedVariation,
      });
    } catch (error) {
      console.error(
        "JHAIRS: Inventory update failed:",
        error
      );

      // Mongoose rejected invalid document data.
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Invalid inventory information.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to update inventory.",
      });
    }
  }
);

// ============================================
// CUSTOMER — GET ALL ACTIVE PRODUCTS
// ============================================

router.get("/", async (req, res) => {
  try {
    // Retrieve products visible to customers.
    const products = await Product.find({
      isActive: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error(
      "JHAIRS: Failed to fetch products:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve products.",
    });
  }
});

// ============================================
// CUSTOMER — GET ONE PRODUCT BY ID
// ============================================

router.get("/:id", async (req, res) => {
  try {
    // Accept both frontend IDs and MongoDB IDs.
    const productQuery = getProductQuery(
      req.params.id
    );

    if (!productQuery) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    // Customers can only retrieve active products.
    const product = await Product.findOne({
      ...productQuery,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error(
      "JHAIRS: Failed to fetch product:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve this product.",
    });
  }
});

// ============================================
// EXPORT PRODUCT ROUTER
// ============================================

export default router;
