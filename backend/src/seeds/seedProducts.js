
import "dotenv/config";

import mongoose from "mongoose";
import Product from "../models/Product.js";
import connectDB from "../config/db.js";

/**
 * JHAIRS — SAFE INITIAL PRODUCT SEED
 *
 * PURPOSE:
 * - Insert the four original JHAIRS products.
 * - Preserve products already in MongoDB.
 * - Never overwrite admin-edited product details.
 * - Never overwrite inventory quantities.
 * - Never modify new admin-created products.
 *
 * IMPORTANT:
 * This is an INITIAL seed, not a catalogue
 * synchronization or product-editing script.
 */

// ============================================
// ORIGINAL JHAIRS PRODUCT DATA
// ============================================

const initialProducts = [
  {
    legacyId: 1,
    name: "Bone Straight Wig",
    category: "Wigs",

    description:
      "Sleek, silky and luxurious bone straight human hair for an effortlessly elegant look.",

    image: "/images/products/bone-straight-wig.png",

    basePrice: 85000,

    lengths: [
      12, 14, 16, 18, 20,
      22, 24, 26, 28, 30,
    ],

    colors: [
      {
        name: "Natural Black",
        hex: "#191719",
        image: "/images/products/bone-straight-wig.png",
        extraPrice: 0,
      },
      {
        name: "Honey Blonde",
        hex: "#D9B77D",
        image: "/images/products/bone-straight-blonde.png",
        extraPrice: 15000,
      },
      {
        name: "Honey Bronze",
        hex: "#B87741",
        image:
          "/images/products/bone-straight-honey-bronze.png",
        extraPrice: 12000,
      },
    ],

    densities: ["150%", "180%", "200%"],

    laceTypes: [
      "4x4 Closure",
      "5x5 Closure",
      "13x4 Frontal",
    ],

    featured: true,
    isActive: true,
    stock: 0,
    inventory: [],
  },

  {
    legacyId: 2,
    name: "Body Wave Wig",
    category: "Wigs",

    description:
      "Beautiful, soft body waves with natural volume and a flawless luxury finish.",

    image: "/images/products/body-wave-wig.png",

    basePrice: 95000,

    lengths: [
      12, 14, 16, 18, 20,
      22, 24, 26, 28, 30,
    ],

    colors: [
      {
        name: "Chocolate Brown",
        hex: "#59382D",
        image: "/images/products/body-wave-wig.png",
        extraPrice: 0,
      },
    ],

    densities: ["150%", "180%", "200%"],

    laceTypes: [
      "4x4 Closure",
      "5x5 Closure",
      "13x4 Frontal",
    ],

    featured: true,
    isActive: true,
    stock: 0,
    inventory: [],
  },

  {
    legacyId: 3,
    name: "Deep Wave Bundles",
    category: "Bundles",

    description:
      "Soft, bouncy deep wave bundles crafted for fullness, movement and versatility.",

    image: "/images/products/deep-wave-bundles.png",

    basePrice: 45000,

    lengths: [
      10, 12, 14, 16, 18,
      20, 22, 24, 26,
    ],

    colors: [
      {
        name: "Natural Black",
        hex: "#191719",
        image: "/images/products/deep-wave-bundles.png",
        extraPrice: 0,
      },
    ],

    // Bundles have no density or lace options.
    densities: [],
    laceTypes: [],

    featured: true,
    isActive: true,
    stock: 0,
    inventory: [],
  },

  {
    legacyId: 4,
    name: "HD Lace Closure",
    category: "Closures",

    description:
      "Premium HD lace closure designed for a natural-looking, seamless installation.",

    image: "/images/products/hd-lace-closure.png",

    basePrice: 35000,

    lengths: [10, 12, 14, 16, 18, 20, 22],

    colors: [
      {
        name: "Natural Black",
        hex: "#191719",
        image: "/images/products/hd-lace-closure.png",
        extraPrice: 0,
      },
    ],

    densities: [],
    laceTypes: [],

    featured: true,
    isActive: true,
    stock: 0,
    inventory: [],
  },
];

// ============================================
// SAFE SEED FUNCTION
// ============================================

async function seedProducts() {
  try {
    // Connect to MongoDB Atlas.
    await connectDB();

    // Insert each original product only if
    // its legacyId is not already in MongoDB.
    for (const product of initialProducts) {
      const result = await Product.updateOne(
        {
          legacyId: product.legacyId,
        },
        {
          // Applied ONLY during insertion.
          // Existing products remain unchanged.
          $setOnInsert: product,
        },
        {
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      // Show whether MongoDB inserted or skipped.
      if (result.upsertedCount === 1) {
        console.log(
          `Created: ${product.name}`
        );
      } else {
        console.log(
          `Already exists, preserved: ${product.name}`
        );
      }
    }

    console.log(
      "JHAIRS initial product seed completed safely!"
    );
  } catch (error) {
    // Display a safe error message.
    console.error(
      "JHAIRS product seeding failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    // Close the database connection gracefully.
    await mongoose.disconnect();
  }
}

// Run the seed only when this script is executed.
seedProducts();
