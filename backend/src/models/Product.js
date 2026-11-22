
import mongoose from "mongoose";

/**
 * JHAIRS — PRODUCT MODEL
 *
 * Stores:
 * - Product information and pricing
 * - Hair colours, lengths, densities and lace types
 * - Inventory for individual product variations
 * - Featured and active product status
 *
 * Existing fields are preserved so the frontend
 * continues working as before.
 */

// ============================================
// HAIR COLOUR SCHEMA
// ============================================

const colorSchema = new mongoose.Schema(
  {
    // Name displayed to customers.
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Colour swatch on the Product Details page.
    hex: {
      type: String,
      required: true,
    },

    // Product photograph for this colour.
    image: {
      type: String,
      required: true,
    },

    // Additional amount for premium colours.
    extraPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    // No separate ID needed for a colour.
    _id: false,
  }
);

// ============================================
// PRODUCT VARIATION INVENTORY SCHEMA
// ============================================

/**
 * Each inventory record represents one specific
 * combination of product options.
 *
 * Example:
 * Natural Black + 18 inches + 180% density
 * + 13x4 Frontal = 2 wigs in stock.
 */
const inventorySchema = new mongoose.Schema(
  {
    // Hair colour of this variation.
    color: {
      type: String,
      required: true,
      trim: true,
    },

    // Hair length in inches.
    length: {
      type: Number,
      required: true,
      min: 1,
    },

    // Density, if applicable to the product.
    density: {
      type: String,
      default: "",
      trim: true,
    },

    // Lace type, if applicable.
    laceType: {
      type: String,
      default: "",
      trim: true,
    },

    // Quantity available for this exact variation.
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Stock must be a whole number.",
      },
    },
  },
  {
    // Inventory records are identified by their
    // variation fields rather than separate IDs.
    _id: false,
  }
);

// ============================================
// MAIN PRODUCT SCHEMA
// ============================================

const productSchema = new mongoose.Schema(
  {
    // Original frontend product ID.
    // Example: Bone Straight Wig = 1.
    legacyId: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },

    // Product name.
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Hair category.
    category: {
      type: String,
      required: true,
      enum: [
        "Wigs",
        "Bundles",
        "Closures",
        "Frontals",
      ],
    },

    // Product description.
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Starting price in Nigerian naira.
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // Default product photograph.
    image: {
      type: String,
      required: true,
    },

    // Selectable hair lengths.
    lengths: {
      type: [Number],
      default: [],
    },

    // Selectable colour variations.
    colors: {
      type: [colorSchema],
      default: [],
    },

    // Selectable densities.
    densities: {
      type: [String],
      default: [],
    },

    // Selectable lace types.
    laceTypes: {
      type: [String],
      default: [],
    },

    // ========================================
    // ORIGINAL STOCK FIELD
    // ========================================

    // Keep this field for backwards compatibility.
    // It is NOT the authoritative stock count for
    // individual product variations.
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ========================================
    // VARIATION-LEVEL INVENTORY
    // ========================================

    // Stores stock for each unique combination
    // of colour, length, density and lace type.
    //
    // An empty array means no variation inventory
    // has been configured yet.
    inventory: {
      type: [inventorySchema],
      default: [],
    },

    // ========================================
    // PRODUCT VISIBILITY
    // ========================================

    // Show this product in the featured collection.
    featured: {
      type: Boolean,
      default: false,
    },

    // Control whether the product is displayed.
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

// ============================================
// EXPORT PRODUCT MODEL
// ============================================

const Product = mongoose.model(
  "Product",
  productSchema
);

export default Product;
