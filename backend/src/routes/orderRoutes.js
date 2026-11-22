
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
 * - Does not save an order.
 *
 * POST /api/orders
 * - Checks customer and delivery details.
 * - Validates inventory and prices.
 * - Creates a PENDING / UNPAID order.
 * - Prevents duplicate submissions.
 *
 * IMPORTANT:
 * No payment is collected.
 * No inventory is reserved or deducted.
 */

const router = express.Router();

// ============================================
// ERROR HELPER
// ============================================

function orderError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
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
    return { legacyId: Number(productId) };
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

function calculateUnitPrice(product, selections) {
  const { length, color, density, laceType } =
    selections;

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

  const densityCost =
    density === "180%"
      ? 10000
      : density === "200%"
        ? 20000
        : 0;

  const laceCost =
    laceType === "5x5 Closure"
      ? 5000
      : laceType === "13x4 Frontal"
        ? 15000
        : 0;

  const colorCost =
    selectedColor?.extraPrice ?? 0;

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

function findVariationStock(product, selections) {
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

    if (
      !Number.isSafeInteger(length) ||
      !product.lengths.includes(length)
    ) {
      throw orderError(
        400,
        `Invalid hair length for ${product.name}.`
      );
    }

    const selectedColor = product.colors.find(
      (option) => option.name === color
    );

    if (!selectedColor) {
      throw orderError(
        400,
        `Invalid hair colour for ${product.name}.`
      );
    }

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
      { color, length, density, laceType }
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

    const variantKey = JSON.stringify([
      String(product._id),
      color,
      length,
      density,
      laceType,
    ]);

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

    if (combinedQuantity > stock) {
      throw orderError(
        409,
        `Only ${stock} unit(s) of ` +
        `${product.name} (${length}", ${color}) ` +
        "are currently available."
      );
    }

    quantitiesByVariant.set(
      variantKey,
      combinedQuantity
    );

    // ========================================
    // CALCULATE VERIFIED PRICE
    // ========================================

    const unitPrice = calculateUnitPrice(
      product,
      { length, color, density, laceType }
    );

    const lineTotal = unitPrice * quantity;

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

function requiredText(value, field, max = 150) {
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

function optionalText(value, field, max = 500) {
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

  const email = requiredText(
    customer.email,
    "email address",
    254
  ).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw orderError(
      400,
      "Please provide a valid email address."
    );
  }

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
      state: requiredText(
        address.state,
        "state or region",
        100
      ),
      country: requiredText(
        address.country,
        "country",
        100
      ),
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
 * information that the customer submitted.
 *
 * We deliberately include the customer,
 * address, delivery choice and cart items.
 *
 * IMPORTANT:
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

/**
 * Verify that the retry uses the same
 * request details as the original order.
 */
function respondWithExistingOrder(
  order,
  requestHash,
  res
) {
  if (order.orderRequestHash !== requestHash) {
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

function handleOrderError(error, res, action) {
  if (error.status) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

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
// QUOTE — NO ORDER IS SAVED
// ============================================

router.post("/quote", async (req, res) => {
  try {
    const verified = await validateShoppingBag(
      req.body?.items
    );

    return res.status(200).json({
      success: true,
      message:
        "Order quote calculated successfully.",
      currency: "NGN",
      items: verified.items,
      subtotal: verified.subtotal,
      deliveryFee: null,
      total: null,
      canPlaceOrder: false,
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
     * The frontend will generate a UUID for
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

    // Ensure the payload has the expected
    // structure before calculating its hash.
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
     * original order even if stock has changed
     * since the first submission.
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

    const guestDetails =
      validateGuestDetails(body);

    const verified =
      await validateShoppingBag(body.items);

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
        subtotal: verified.subtotal,
        deliveryFee: null,
        total: null,

        orderStatus: "PENDING",
        paymentStatus: "UNPAID",

        paymentReference: null,
        inventoryCommitted: false,

        // New idempotency fields.
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
       * If we hit a duplicate-key error,
       * recover the existing order instead.
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
      message:
        "Your order request has been received. " +
        "Payment and delivery are not yet confirmed.",
      order: formatOrderResponse(order),
      note:
        "No payment has been collected and " +
        "no inventory has been reserved or deducted.",
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
