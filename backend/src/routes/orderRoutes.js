import express from "express";
import mongoose from "mongoose";
import {
  createHash,
  randomBytes,
} from "node:crypto";

import Product from "../models/Product.js";
import Order from "../models/Order.js";

/**
 * JHAIRS — GUEST ORDER ROUTES
 *
 * POST /api/orders/quote
 * - Checks inventory and prices.
 * - Calculates delivery fees.
 * - Does not save an order.
 *
 * POST /api/orders
 * - Checks customer and delivery details.
 * - Validates inventory and prices.
 * - Calculates the final order total.
 * - Creates a PENDING / UNPAID order.
 * - Prevents duplicate submissions.
 *
 * IMPORTANT:
 * - No payment is collected.
 * - No inventory is reserved or deducted.
 */

const router = express.Router();

// ============================================
// NIGERIAN DELIVERY PRICING
// ============================================

// Initial JHAIRS delivery rates.
// Update these whenever courier prices change.
const DELIVERY_FEES = {
  LAGOS: 3500,
  OGUN: 4500,
  ABUJA: 5000,
  RIVERS: 4500,
  OTHER: 6000,
};

// Supported Nigerian states and FCT.
const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Federal Capital Territory",
];

// ============================================
// ERROR HELPER
// ============================================

function orderError(status, message) {
  const error = new Error(message);

  error.status = status;

  return error;
}

// ============================================
// NORMALIZE NIGERIAN STATE
// ============================================

function normalizeNigerianState(value) {
  if (typeof value !== "string") {
    throw orderError(
      400,
      "Please select a delivery state."
    );
  }

  const cleaned = value.trim().toLowerCase();

  // Accept common ways of writing Abuja/FCT.
  if (
    [
      "abuja",
      "fct",
      "f.c.t.",
      "federal capital territory",
    ].includes(cleaned)
  ) {
    return "Federal Capital Territory";
  }

  // Match the submitted state to the
  // standardized Nigerian state list.
  const state = NIGERIAN_STATES.find(
    (item) => item.toLowerCase() === cleaned
  );

  if (!state) {
    throw orderError(
      400,
      "Please select a valid Nigerian state."
    );
  }

  return state;
}

// ============================================
// CALCULATE DELIVERY FEE
// ============================================

function calculateDeliveryFee(state) {
  const normalizedState =
    normalizeNigerianState(state);

  if (normalizedState === "Lagos") {
    return DELIVERY_FEES.LAGOS;
  }

  if (normalizedState === "Ogun") {
    return DELIVERY_FEES.OGUN;
  }

  if (normalizedState === "Rivers") {
    return DELIVERY_FEES.RIVERS;
  }

  if (
    normalizedState ===
    "Federal Capital Territory"
  ) {
    return DELIVERY_FEES.ABUJA;
  }

  // All other Nigerian states.
  return DELIVERY_FEES.OTHER;
}

// ============================================
// FIND PRODUCT BY ID
// ============================================

function getProductQuery(productId) {
  // Existing numeric product IDs.
  if (
    typeof productId === "number" &&
    Number.isSafeInteger(productId) &&
    productId > 0
  ) {
    return { legacyId: productId };
  }

  // Numeric IDs sent as strings.
  if (
    typeof productId === "string" &&
    /^[1-9]\d*$/.test(productId) &&
    Number.isSafeInteger(Number(productId))
  ) {
    return {
      legacyId: Number(productId),
    };
  }

  // MongoDB ObjectIds.
  if (
    typeof productId === "string" &&
    mongoose.isObjectIdOrHexString(productId)
  ) {
    return { _id: productId };
  }

  return null;
}

// ============================================
// BACKEND PRODUCT PRICING
// ============================================

function calculateUnitPrice(
  product,
  selections
) {
  const {
    length,
    color,
    density,
    laceType,
  } = selections;

  // Find the selected colour.
  const selectedColor = product.colors.find(
    (option) => option.name === color
  );

  // Base length is the shortest available length.
  const startingLength = Math.min(
    ...product.lengths
  );

  // Every additional two inches costs ₦5,000.
  const extraLengthCost =
    ((length - startingLength) / 2) * 5000;

  // Density pricing.
  const densityCost =
    density === "180%"
      ? 10000
      : density === "200%"
        ? 20000
        : 0;

  // Lace pricing.
  const laceCost =
    laceType === "5x5 Closure"
      ? 5000
      : laceType === "13x4 Frontal"
        ? 15000
        : 0;

  // Colour pricing.
  const colorCost =
    selectedColor?.extraPrice ?? 0;

  // Calculate price using backend values only.
  return (
    product.basePrice +
    extraLengthCost +
    densityCost +
    laceCost +
    colorCost
  );
}

// ============================================
// FIND EXACT VARIATION STOCK
// ============================================

function findVariationStock(
  product,
  selections
) {
  const variation = (
    product.inventory || []
  ).find(
    (item) =>
      item.color === selections.color &&
      item.length === selections.length &&
      (item.density || "") ===
        selections.density &&
      (item.laceType || "") ===
        selections.laceType
  );

  return variation?.stock ?? 0;
}

// ============================================
// SHARED CART VALIDATION
// ============================================

async function validateShoppingBag(items) {
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 50
  ) {
    throw orderError(
      400,
      "Please provide a valid shopping bag."
    );
  }

  const validatedItems = [];

  // Prevent quantities being split across
  // duplicate entries to bypass stock limits.
  const quantitiesByVariant = new Map();

  for (const item of items) {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      throw orderError(
        400,
        "Invalid shopping bag item."
      );
    }

    const {
      productId,
      color,
      length,
      density = "",
      laceType = "",
      quantity,
    } = item;

    // Maximum of 20 units per cart line.
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    ) {
      throw orderError(
        400,
        "Quantity must be between 1 and 20."
      );
    }

    // Look up active products only.
    const query = getProductQuery(productId);

    if (!query) {
      throw orderError(
        400,
        "Invalid product ID in shopping bag."
      );
    }

    const product = await Product.findOne({
      ...query,
      isActive: true,
    });

    if (!product) {
      throw orderError(
        404,
        "A selected product is unavailable."
      );
    }

    // ========================================
    // VERIFY HAIR SELECTIONS
    // ========================================

    // Verify the selected length.
    if (
      !Number.isSafeInteger(length) ||
      !product.lengths.includes(length)
    ) {
      throw orderError(
        400,
        `Invalid hair length for ${product.name}.`
      );
    }

    // Verify the selected colour.
    const selectedColor = product.colors.find(
      (option) => option.name === color
    );

    if (!selectedColor) {
      throw orderError(
        400,
        `Invalid hair colour for ${product.name}.`
      );
    }

    // Verify the selected density.
    const validDensity =
      product.densities.includes(density) ||
      (
        product.densities.length === 0 &&
        density === ""
      );

    if (!validDensity) {
      throw orderError(
        400,
        `Invalid density for ${product.name}.`
      );
    }

    // Verify the selected lace type.
    const validLace =
      product.laceTypes.includes(laceType) ||
      (
        product.laceTypes.length === 0 &&
        laceType === ""
      );

    if (!validLace) {
      throw orderError(
        400,
        `Invalid lace type for ${product.name}.`
      );
    }

    // ========================================
    // VERIFY STOCK
    // ========================================

    const stock = findVariationStock(
      product,
      {
        color,
        length,
        density,
        laceType,
      }
    );

    if (
      !Number.isSafeInteger(stock) ||
      stock <= 0
    ) {
      throw orderError(
        409,
        `${product.name} (${length}", ${color}) ` +
          "is currently out of stock. " +
          "Please update your shopping bag."
      );
    }

    // Create a unique key for this variation.
    const variantKey = JSON.stringify([
      String(product._id),
      color,
      length,
      density,
      laceType,
    ]);

    // Calculate combined quantities when
    // the same variation appears more than once.
    const combinedQuantity =
      (quantitiesByVariant.get(variantKey) ?? 0) +
      quantity;

    if (combinedQuantity > 20) {
      throw orderError(
        400,
        `${product.name} exceeds the ` +
          "20-unit variation limit."
      );
    }

    // Ensure the requested quantity is in stock.
    if (combinedQuantity > stock) {
      throw orderError(
        409,
        `Only ${stock} unit(s) of ` +
          `${product.name} (${length}", ${color}) ` +
          "are currently available."
      );
    }

    // Store the combined quantity for this variation.
    quantitiesByVariant.set(
      variantKey,
      combinedQuantity
    );

    // ========================================
    // CALCULATE VERIFIED PRICE
    // ========================================

    const unitPrice = calculateUnitPrice(
      product,
      {
        length,
        color,
        density,
        laceType,
      }
    );

    const lineTotal = unitPrice * quantity;

    // Ensure all calculated prices are valid.
    if (
      !Number.isSafeInteger(unitPrice) ||
      unitPrice <= 0 ||
      !Number.isSafeInteger(lineTotal)
    ) {
      throw orderError(
        409,
        `Unable to quote ${product.name}.`
      );
    }

    // Add the validated item to the quote.
    validatedItems.push({
      productId: String(product._id),
      legacyId: product.legacyId,
      name: product.name,
      image:
        selectedColor.image || product.image,
      color,
      length,
      density,
      laceType,
      quantity,
      unitPrice,
      lineTotal,
      stock,
    });
  }

  // Calculate subtotal using verified prices.
  const subtotal = validatedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  if (!Number.isSafeInteger(subtotal)) {
    throw orderError(
      400,
      "Invalid order subtotal."
    );
  }

  return {
    items: validatedItems,
    subtotal,
  };
}

// ============================================
// CUSTOMER DETAILS VALIDATION
// ============================================

function requiredText(
  value,
  field,
  max = 150
) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > max
  ) {
    throw orderError(
      400,
      `Please provide a valid ${field}.`
    );
  }

  return value.trim();
}

function optionalText(
  value,
  field,
  max = 500
) {
  if (value === undefined || value === null) {
    return "";
  }

  if (
    typeof value !== "string" ||
    value.trim().length > max
  ) {
    throw orderError(
      400,
      `Please provide a valid ${field}.`
    );
  }

  return value.trim();
}

function validateGuestDetails(body) {
  const customer = body.customer;
  const address = body.deliveryAddress;

  if (
    !customer ||
    typeof customer !== "object" ||
    Array.isArray(customer) ||
    !address ||
    typeof address !== "object" ||
    Array.isArray(address)
  ) {
    throw orderError(
      400,
      "Customer and delivery details are required."
    );
  }

  // Validate and normalize email.
  const email = requiredText(
    customer.email,
    "email address",
    254
  ).toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw orderError(
      400,
      "Please provide a valid email address."
    );
  }

  // Validate phone number.
  const phone = requiredText(
    customer.phone,
    "phone number",
    30
  );

  if (!/^\+?[\d\s().-]{6,30}$/.test(phone)) {
    throw orderError(
      400,
      "Please provide a valid phone number."
    );
  }

  // Validate delivery method.
  const deliveryMethod =
    body.deliveryMethod ?? "standard";

  if (
    !["standard", "express"].includes(
      deliveryMethod
    )
  ) {
    throw orderError(
      400,
      "Invalid delivery method."
    );
  }

  // ==========================================
  // VALIDATE DELIVERY ADDRESS
  // ==========================================

  const validatedCountry = requiredText(
    address.country,
    "country",
    100
  );

  // Nigeria-only delivery.
  if (
    validatedCountry.trim().toLowerCase() !==
    "nigeria"
  ) {
    throw orderError(
      400,
      "Delivery is currently available " +
        "within Nigeria only."
    );
  }

  return {
    customer: {
      firstName: requiredText(
        customer.firstName,
        "first name",
        80
      ),

      lastName: requiredText(
        customer.lastName,
        "last name",
        80
      ),

      email,

      phone,
    },

    deliveryAddress: {
      address: requiredText(
        address.address,
        "street address",
        200
      ),

      apartment: optionalText(
        address.apartment,
        "apartment or landmark",
        150
      ),

      city: requiredText(
        address.city,
        "city",
        100
      ),

      // Validate and standardize Nigerian states.
      state: normalizeNigerianState(
        address.state
      ),

      // Standardize country.
      country: "Nigeria",
    },

    deliveryMethod,

    notes: optionalText(
      body.notes,
      "order notes",
      1000
    ),
  };
}

// ============================================
// ORDER REFERENCE GENERATION
// ============================================

function generateOrderNumber() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  const randomPart = randomBytes(8)
    .toString("hex")
    .toUpperCase();

  return `JH-${date}-${randomPart}`;
}

// ============================================
// DUPLICATE ORDER PROTECTION
// ============================================

/**
 * Generate a fingerprint for the exact order
 * information the customer submitted.
 *
 * This checks submission consistency.
 * It does not authenticate the customer.
 */

function createOrderRequestHash(body) {
  const items = body.items.map((item) => ({
    productId: item.productId,
    color: item.color,
    length: item.length,
    density: item.density ?? "",
    laceType: item.laceType ?? "",
    quantity: item.quantity,
  }));

  const requestData = {
    customer: body.customer,
    deliveryAddress: body.deliveryAddress,
    deliveryMethod:
      body.deliveryMethod ?? "standard",
    notes: body.notes ?? "",
    items,
  };

  return createHash("sha256")
    .update(JSON.stringify(requestData))
    .digest("hex");
}

// ============================================
// SAFE ORDER RESPONSE
// ============================================

/**
 * Return only safe confirmation details.
 * Never return a full MongoDB order document.
 */

function formatOrderResponse(order) {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    currency: "NGN",
    createdAt: order.createdAt,
  };
}

// ============================================
// EXISTING ORDER RECOVERY
// ============================================

function respondWithExistingOrder(
  order,
  requestHash,
  res
) {
  // Prevent a request ID from being reused
  // for a different checkout submission.
  if (
    order.orderRequestHash !== requestHash
  ) {
    return res.status(409).json({
      success: false,
      message:
        "This order request ID has already been " +
        "used with different details. " +
        "Please start a new order request.",
    });
  }

  // Exact retry: do not create another order.
  return res.status(200).json({
    success: true,
    reused: true,
    message:
      "This order request was already received.",
    order: formatOrderResponse(order),
    note:
      "No additional order was created.",
  });
}

// ============================================
// ERROR HANDLER
// ============================================

function handleOrderError(
  error,
  res,
  action
) {
  // Return expected validation errors.
  if (error.status) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  // Log unexpected server errors.
  console.error(
    `JHAIRS ${action} error:`,
    error
  );

  return res.status(500).json({
    success: false,
    message:
      "Something went wrong. Please try again.",
  });
}

// ============================================
// ORDER QUOTE — NO ORDER IS SAVED
// ============================================

router.post("/quote", async (req, res) => {
  try {
    // Validate cart and calculate verified prices.
    const verified = await validateShoppingBag(
      req.body?.items
    );

    // Accept the state from nested address
    // or directly from the request body.
    const deliveryState =
      req.body?.deliveryAddress?.state ??
      req.body?.state;

    // Calculate delivery using backend rates.
    const deliveryFee =
      calculateDeliveryFee(deliveryState);

    // Calculate the complete order total.
    const total =
      verified.subtotal + deliveryFee;

    return res.status(200).json({
      success: true,

      message:
        "Order quote calculated successfully.",

      currency: "NGN",

      items: verified.items,

      subtotal: verified.subtotal,

      deliveryFee,

      total,

      canPlaceOrder: true,

      note:
        "This is a quotation only. " +
        "No order has been placed, stock reserved, " +
        "or payment collected.",
    });
  } catch (error) {
    return handleOrderError(
      error,
      res,
      "quotation"
    );
  }
});

// ============================================
// CREATE GUEST ORDER — IDEMPOTENT
// ============================================

router.post("/", async (req, res) => {
  try {
    const body = req.body ?? {};

    // ========================================
    // REQUIRE A VALID REQUEST IDENTIFIER
    // ========================================

    /**
     * The frontend generates a UUID for
     * each new checkout submission.
     *
     * Retrying the same submission must use
     * the same UUID.
     */

    const requestId = body.orderRequestId;

    if (
      typeof requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        requestId
      )
    ) {
      throw orderError(
        400,
        "A valid order request ID is required."
      );
    }

    // Ensure the payload has the expected structure.
    if (
      !body.customer ||
      typeof body.customer !== "object" ||
      Array.isArray(body.customer) ||
      !body.deliveryAddress ||
      typeof body.deliveryAddress !== "object" ||
      Array.isArray(body.deliveryAddress) ||
      !Array.isArray(body.items) ||
      body.items.length === 0 ||
      body.items.length > 50 ||
      body.items.some(
        (item) =>
          !item ||
          typeof item !== "object" ||
          Array.isArray(item)
      )
    ) {
      throw orderError(
        400,
        "Invalid order request."
      );
    }

    // Hash the submitted customer, delivery
    // and cart data, excluding the request ID.
    const requestHash =
      createOrderRequestHash(body);

    // ========================================
    // CHECK WHETHER ORDER ALREADY EXISTS
    // ========================================

    /**
     * Check for an existing order BEFORE
     * revalidating live inventory.
     *
     * A legitimate retry should recover the
     * original order even if stock has changed.
     */

    const existingOrder = await Order.findOne({
      orderRequestId: requestId,
    }).select("+orderRequestHash");

    if (existingOrder) {
      return respondWithExistingOrder(
        existingOrder,
        requestHash,
        res
      );
    }

    // ========================================
    // VALIDATE NEW ORDER
    // ========================================

    // Validate customer and delivery details.
    const guestDetails =
      validateGuestDetails(body);

    // Verify product availability and pricing.
    const verified =
      await validateShoppingBag(body.items);

    // Calculate delivery fee from validated state.
    const deliveryFee = calculateDeliveryFee(
      guestDetails.deliveryAddress.state
    );

    // Calculate final order total.
    const total =
      verified.subtotal + deliveryFee;

    // Convert verified cart items to order format.
    const orderItems = verified.items.map(
      (item) => ({
        product: item.productId,
        name: item.name,
        image: item.image,
        color: item.color,
        length: item.length,
        density: item.density,
        laceType: item.laceType,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })
    );

    // ========================================
    // SAVE ONE PENDING ORDER
    // ========================================

    let order;

    try {
      order = await Order.create({
        orderNumber: generateOrderNumber(),

        ...guestDetails,

        items: orderItems,

        // Save all verified financial amounts.
        subtotal: verified.subtotal,
        deliveryFee,
        total,

        // Payment has not been integrated yet.
        orderStatus: "PENDING",
        paymentStatus: "UNPAID",

        paymentReference: null,

        // Inventory has not been committed.
        inventoryCommitted: false,

        // Idempotency fields.
        orderRequestId: requestId,
        orderRequestHash: requestHash,
      });
    } catch (error) {
      /**
       * Two identical requests can arrive
       * at the exact same moment.
       *
       * MongoDB's unique index allows only
       * one to create the order.
       *
       * Recover the existing order on conflict.
       */

      if (error.code === 11000) {
        const existing = await Order.findOne({
          orderRequestId: requestId,
        }).select("+orderRequestHash");

        if (existing) {
          return respondWithExistingOrder(
            existing,
            requestHash,
            res
          );
        }

        throw orderError(
          409,
          "An order reference conflict occurred. " +
            "Please retry your request."
        );
      }

      throw error;
    }

    // ========================================
    // RETURN NEW ORDER CONFIRMATION
    // ========================================

    return res.status(201).json({
      success: true,

      reused: false,

      // Correct message because payment
      // is not yet available.
      message:
        "Your order request has been submitted " +
        "successfully. Payment has not been " +
        "collected yet.",

      order: formatOrderResponse(order),

      note:
        "Payment has not been collected and " +
        "inventory has not been reserved or deducted.",
    });
  } catch (error) {
    return handleOrderError(
      error,
      res,
      "creation"
    );
  }
});

export default router;