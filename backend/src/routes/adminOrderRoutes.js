
import express from "express";

import Order from "../models/Order.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

/**
 * JHAIRS — ADMIN ORDER ROUTES
 *
 * GET /api/admin/orders
 *   List, search, filter and paginate orders.
 *
 * GET /api/admin/orders/:id
 *   Retrieve complete order information.
 *
 * PATCH /api/admin/orders/:id/status
 *   Safely update an order's fulfilment status.
 *
 * SECURITY:
 * - Every route requires an authenticated administrator.
 * - Payment status cannot be changed here.
 * - Stock cannot be deducted here.
 * - Status history is recorded with each update.
 * - Concurrent status changes are protected.
 */

const router = express.Router();

// Protect the entire router.
router.use(requireAdmin);

// ============================================
// STATUS CONFIGURATION
// ============================================

const ORDER_STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

const PAYMENT_STATUSES = new Set([
  "UNPAID",
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

// Define legal next steps.
// We do not allow skipping fulfilment stages.
const ALLOWED_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

// ============================================
// SHARED HELPERS
// ============================================

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlainString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function orderLookup(id) {
  // Accept either a MongoDB ObjectId or an order reference.
  return /^[a-f\d]{24}$/i.test(id)
    ? { _id: id }
    : { orderNumber: id };
}

// Return a compact order representation for the list.
function toOrderSummary(order) {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,

    customer: {
      firstName: order.customer?.firstName ?? "",
      lastName: order.customer?.lastName ?? "",
      email: order.customer?.email ?? "",
    },

    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,

    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,

    itemCount: (order.items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    ),

    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

// Return full order information for the details panel.
function toOrderDetails(order) {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,

    customer: order.customer,
    deliveryAddress: order.deliveryAddress,
    deliveryMethod: order.deliveryMethod,
    notes: order.notes,

    items: (order.items || []).map((item) => ({
      productId: item.product,
      name: item.name,
      image: item.image,
      color: item.color,
      length: item.length,
      density: item.density,
      laceType: item.laceType,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),

    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,

    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference,
    inventoryCommitted: order.inventoryCommitted,

    // NEW — Audit history.
    statusHistory: order.statusHistory || [],

    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

// ============================================
// GET /api/admin/orders
// LIST CUSTOMER ORDERS
// ============================================

router.get("/", async (req, res) => {
  try {
    const rawPage = req.query.page ?? "1";
    const rawLimit = req.query.limit ?? "10";

    // Accept whole-number pagination parameters only.
    if (
      !/^\d+$/.test(String(rawPage)) ||
      !/^\d+$/.test(String(rawLimit))
    ) {
      return res.status(400).json({
        success: false,
        message: "Page and limit must be positive whole numbers.",
      });
    }

    const page = Number(rawPage);
    const limit = Number(rawLimit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be 1–100000 and limit must be 1–50.",
      });
    }

    const { orderStatus, paymentStatus, search } = req.query;

    // Validate order-status filter.
    if (
      orderStatus !== undefined &&
      (!isPlainString(orderStatus) ||
        !ORDER_STATUSES.has(orderStatus))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status filter.",
      });
    }

    // Validate payment-status filter.
    if (
      paymentStatus !== undefined &&
      (!isPlainString(paymentStatus) ||
        !PAYMENT_STATUSES.has(paymentStatus))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status filter.",
      });
    }

    // Validate the search query.
    if (
      search !== undefined &&
      (typeof search !== "string" ||
        search.trim().length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Search must be text of at most 100 characters.",
      });
    }

    // Build the MongoDB query.
    const filter = {};

    if (orderStatus) {
      filter.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (search?.trim()) {
      const expression = new RegExp(
        escapeRegex(search.trim()),
        "i"
      );

      filter.$or = [
        { orderNumber: expression },
        { "customer.firstName": expression },
        { "customer.lastName": expression },
        { "customer.email": expression },
        { "customer.phone": expression },
      ];
    }

    // Retrieve results and count in parallel.
    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .select("-orderRequestHash -orderRequestId -__v")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      orders: orders.map(toOrderSummary),

      pagination: {
        page,
        limit,
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
      },
    });
  } catch (error) {
    console.error("JHAIRS admin orders list error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load orders right now.",
    });
  }
});

// ============================================
// PATCH /api/admin/orders/:id/status
// SAFELY CHANGE ORDER STATUS
// ============================================

router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body ?? {};

    // Accept only one valid status field.
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body) ||
      Object.keys(req.body).length !== 1 ||
      typeof status !== "string" ||
      !ORDER_STATUSES.has(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide one valid order status.",
      });
    }

    // Read the current saved order.
    const order = await Order.findOne(orderLookup(id))
      .select(
        "orderNumber orderStatus paymentStatus inventoryCommitted statusHistory"
      )
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const previousStatus = order.orderStatus;

    // Reject repeated status updates.
    if (previousStatus === status) {
      return res.status(409).json({
        success: false,
        message: "This order already has that status.",
      });
    }

    // Enforce allowed order-status transitions.
    const allowedNextStatuses =
      ALLOWED_TRANSITIONS[previousStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.status(409).json({
        success: false,
        message:
          `Cannot change an order from ${previousStatus} to ${status}.`,
      });
    }

    // ========================================
    // PAYMENT AND STOCK SAFEGUARDS
    // ========================================

    // A CONFIRMED order is only an acknowledged
    // customer request. It does not mean paid.
    //
    // PROCESSING and later stages require a
    // completed payment and committed inventory.
    if (status === "PROCESSING") {
      if (
        order.paymentStatus !== "PAID" ||
        order.inventoryCommitted !== true
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This order cannot be processed until payment is verified and inventory is committed.",
        });
      }
    }

    // Do not cancel a paid, payment-pending, or
    // stock-committed order through this simple route.
    //
    // Those cases require dedicated refund and
    // inventory-restoration workflows.
    if (status === "CANCELLED") {
      const cancellationAllowed =
        ["UNPAID", "FAILED"].includes(
          order.paymentStatus
        ) && order.inventoryCommitted === false;

      if (!cancellationAllowed) {
        return res.status(409).json({
          success: false,
          message:
            "This order requires a separate payment or inventory review before cancellation.",
        });
      }
    }

    // ========================================
    // RECORD AUDIT HISTORY ATOMICALLY
    // ========================================

    const historyEntry = {
      from: previousStatus,
      to: status,
      changedBy: req.admin._id,
      changedAt: new Date(),
    };

    // Use a conditional update so two administrators
    // cannot overwrite each other's status changes.
    //
    // Payment and inventory conditions are also
    // checked against the current database values.
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        orderStatus: previousStatus,
        paymentStatus: order.paymentStatus,
        inventoryCommitted: order.inventoryCommitted,
      },
      {
        $set: {
          orderStatus: status,
        },

        $push: {
          statusHistory: historyEntry,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "orderNumber orderStatus paymentStatus inventoryCommitted statusHistory updatedAt"
    );

    if (!updatedOrder) {
      return res.status(409).json({
        success: false,
        message:
          "This order changed while you were editing it. Refresh and try again.",
      });
    }

    // Return only safe order-management details.
    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",

      order: {
        id: String(updatedOrder._id),
        orderNumber: updatedOrder.orderNumber,
        orderStatus: updatedOrder.orderStatus,
        paymentStatus: updatedOrder.paymentStatus,
        inventoryCommitted: updatedOrder.inventoryCommitted,
        statusHistory: updatedOrder.statusHistory,
        updatedAt: updatedOrder.updatedAt,
      },
    });
  } catch (error) {
    console.error("JHAIRS admin order status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update the order status.",
    });
  }
});

// ============================================
// GET /api/admin/orders/:id
// VIEW COMPLETE ORDER DETAILS
// ============================================

router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findOne(
      orderLookup(req.params.id)
    )
      .select("-orderRequestHash -orderRequestId -__v")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      order: toOrderDetails(order),
    });
  } catch (error) {
    console.error("JHAIRS admin order detail error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load this order right now.",
    });
  }
});

// ============================================
// EXPORT ADMIN ORDERS ROUTER
// ============================================

export default router;
