
/**
 * JHAIRS — PRODUCT DATA
 *
 * Stores all our example hair products.
 *
 * Each colour can have:
 * - A name
 * - A matching product image
 * - An additional price
 *
 * These prices are illustrative, not actual
 * selling prices.
 */

export const products = [
  {
    // ========== PRODUCT 1: BONE STRAIGHT WIG ==========
    id: 1,
    name: "Bone Straight Wig",
    category: "Wigs",

    description:
      "Sleek, silky and luxurious bone straight human hair for an effortlessly elegant look.",

    // Default photograph shown on the product card.
    image: "/images/products/bone-straight-wig.png",

    // Starting price for the smallest length.
    basePrice: 85000,

    // Available lengths in inches.
    lengths: [12, 14, 16, 18, 20, 22, 24, 26, 28, 30],

    // Each colour has its own photo and price adjustment.
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
        image: "/images/products/bone-straight-honey-bronze.png",
        extraPrice: 12000,
      },
    ],

    // Available wig densities.
    densities: ["150%", "180%", "200%"],

    // Available lace options.
    laceTypes: ["4x4 Closure", "5x5 Closure", "13x4 Frontal"],

    featured: true,
  },

  {
    // ========== PRODUCT 2: BODY WAVE WIG ==========
    id: 2,
    name: "Body Wave Wig",
    category: "Wigs",

    description:
      "Beautiful, soft body waves with natural volume and a flawless luxury finish.",

    image: "/images/products/body-wave-wig.png",

    basePrice: 95000,

    lengths: [12, 14, 16, 18, 20, 22, 24, 26, 28, 30],

    colors: [
      {
        name: "Chocolate Brown",
        hex: "#59382D",
        image: "/images/products/body-wave-wig.png",
        extraPrice: 0,
      },
    ],

    densities: ["150%", "180%", "200%"],

    laceTypes: ["4x4 Closure", "5x5 Closure", "13x4 Frontal"],

    featured: true,
  },

  {
    // ========== PRODUCT 3: DEEP WAVE BUNDLES ==========
    id: 3,
    name: "Deep Wave Bundles",
    category: "Bundles",

    description:
      "Soft, bouncy deep wave bundles crafted for fullness, movement and versatility.",

    image: "/images/products/deep-wave-bundles.png",

    basePrice: 45000,

    lengths: [10, 12, 14, 16, 18, 20, 22, 24, 26],

    colors: [
      {
        name: "Natural Black",
        hex: "#191719",
        image: "/images/products/deep-wave-bundles.png",
        extraPrice: 0,
      },
    ],

    // Bundles do not require density or lace selections.
    densities: [],
    laceTypes: [],

    featured: true,
  },

  {
    // ========== PRODUCT 4: HD LACE CLOSURE ==========
    id: 4,
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
  },
];

/**
 * Find a product by its ID.
 *
 * Example:
 * getProductById(1) returns the Bone Straight Wig.
 */
export const getProductById = (id) => {
  return products.find((product) => product.id === Number(id));
};

/**
 * Retrieve all products marked as featured.
 */
export const getFeaturedProducts = () => {
  return products.filter((product) => product.featured);
};

/**
 * Display amounts in Nigerian naira.
 *
 * Example:
 * formatPrice(85000) returns ₦85,000.
 */
export const formatPrice = (price) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);
};
