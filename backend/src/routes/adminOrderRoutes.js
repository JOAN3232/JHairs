
import express from "express";

import Order from "../models/Order.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

import {
  sendCustomerOrderEmail,
  sendAdminOrderEmail,
  sendDeliveryNotificationEmail,
} from "../services/emailService.js";

/**
 * JHAIRS — ADMIN ORDER ROUTES
 *
 * GET   /api/admin/orders
 * GET   /api/admin/orders/:id
 * PATCH /api/admin/orders/:id/status
 * POST  /api/admin/orders/:id/resend-notifications
 *
 * SECURITY:
 * - Every route requires an authenticated administrator.
 * - Payment status and inventory cannot be changed here.
 * - Status history is recorded with each update.
 * - Concurrent status changes are protected.
 * - Email retries use atomic sending locks.
 * - Previously successful emails are not resent.
 * - Customer confirmation requires committed inventory.
 * - Admin payment alerts remain available when inventory fails.
 */

const router = express.Router();

// Protect every route in this router.
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
  return /^[a-f\d]{24}$/i.test(id)
    ? { _id: id }
    : { orderNumber: id };
}

// ============================================
// SAFE EMAIL SENDING HELPER
// ============================================

/**
 * Claims an email sending lock before sending.
 *
 * Each email type has its own sent timestamp and
 * sending timestamp in the Order model.
 *
 * This prevents simultaneous requests from sending
 * duplicate emails and allows failed emails to retry.
 */

async function sendTrackedEmailSafely({
  orderId,
  sentField,
  sendingField,
  sendEmail,
  extraFilter = {},
}) {
  const now = new Date();

  const staleLockTime = new Date(
    now.getTime() - 5 * 60 * 1000
  );

  try {
    // Atomically claim the email sending lock.
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        ...extraFilter,
        [sentField]: null,

        // Recover locks left behind by failed requests.
        $or: [
          { [sendingField]: null },
          {
            [sendingField]: {
              $lt: staleLockTime,
            },
          },
        ],
      },
      {
        $set: {
          [sendingField]: now,
        },
      },
      {
        returnDocument: "after",
      }
    );

    // Already sent, currently being sent, or not eligible.
    if (!order) {
      return "NOT_SENT";
    }

    // Send the email through the existing Brevo service.
    const emailSent = await sendEmail(order);

    if (!emailSent) {
      // Release the lock so an administrator can retry later.
      await Order.updateOne(
        {
          _id: orderId,
          [sendingField]: now,
          [sentField]: null,
        },
        {
          $set: {
            [sendingField]: null,
          },
        }
      );

      console.error(
        `${sentField} email failed for order ${order.orderNumber}.`
      );

      return "FAILED";
    }

    // Record successful submission and release the lock.
    await Order.updateOne(
      {
        _id: orderId,
        [sendingField]: now,
      },
      {
        $set: {
          [sentField]: new Date(),
          [sendingField]: null,
        },
      }
    );

    console.log(
      `${sentField} email sent for order ${order.orderNumber}.`
    );

    return "SENT";
  } catch (error) {
    console.error(`${sentField} email error:`, error);

    // Attempt to release the lock after an error.
    try {
      await Order.updateOne(
        {
          _id: orderId,
          [sendingField]: now,
          [sentField]: null,
        },
        {
          $set: {
            [sendingField]: null,
          },
        }
      );
    } catch (releaseError) {
      console.error(
        `Unable to release ${sendingField} lock:`,
        releaseError
      );
    }

    return "FAILED";
  }
}

// ============================================
// INDIVIDUAL EMAIL HELPERS
// ============================================

// Customer confirmation requires both successful payment
// and successfully committed inventory.
async function sendCustomerConfirmationSafely(orderId) {
  return sendTrackedEmailSafely({
    orderId,
    sentField: "customerConfirmationSentAt",
    sendingField: "customerConfirmationSendingAt",
    sendEmail: sendCustomerOrderEmail,
    extraFilter: {
      paymentStatus: "PAID",
      inventoryCommitted: true,
    },
  });
}

// Admin must receive payment notifications even when
// inventory could not be committed.
async function sendAdminNotificationSafely(orderId) {
  return sendTrackedEmailSafely({
    orderId,
    sentField: "adminNotificationSentAt",
    sendingField: "adminNotificationSendingAt",
    sendEmail: sendAdminOrderEmail,
    extraFilter: {
      paymentStatus: "PAID",
    },
  });
}

// Delivery notifications require payment, committed stock,
// and an order that has actually been shipped.
async function sendDeliveryEmailSafely(orderId) {
  return sendTrackedEmailSafely({
    orderId,
    sentField: "deliveryNotificationSentAt",
    sendingField: "deliveryNotificationSendingAt",
    sendEmail: sendDeliveryNotificationEmail,
    extraFilter: {
      orderStatus: "SHIPPED",
      paymentStatus: "PAID",
      inventoryCommitted: true,
    },
  });
}

// ============================================
// ORDER RESPONSE HELPERS
// ============================================

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
    paymentIssue: order.paymentIssue,
    inventoryCommitted: order.inventoryCommitted,

    statusHistory: order.statusHistory || [],

    // Email notification tracking.
    customerConfirmationSentAt:
      order.customerConfirmationSentAt,

    adminNotificationSentAt:
      order.adminNotificationSentAt,

    deliveryNotificationSentAt:
      order.deliveryNotificationSentAt,

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

    if (previousStatus === status) {
      return res.status(409).json({
        success: false,
        message: "This order already has that status.",
      });
    }

    const allowedNextStatuses =
      ALLOWED_TRANSITIONS[previousStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.status(409).json({
        success: false,
        message:
          `Cannot change an order from ${previousStatus} to ${status}.`,
      });
    }

    // Processing requires verified payment and committed inventory.
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

    // Shipping also requires verified payment and committed inventory.
    if (status === "SHIPPED") {
      if (
        order.paymentStatus !== "PAID" ||
        order.inventoryCommitted !== true
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This order cannot be shipped until payment is verified and inventory is committed.",
        });
      }
    }

    // Do not cancel a paid, payment-pending, or stock-committed order.
    if (status === "CANCELLED") {
      const cancellationAllowed =
        ["UNPAID", "FAILED"].includes(order.paymentStatus) &&
        order.inventoryCommitted === false;

      if (!cancellationAllowed) {
        return res.status(409).json({
          success: false,
          message:
            "This order requires a separate payment or inventory review before cancellation.",
        });
      }
    }

    const historyEntry = {
      from: previousStatus,
      to: status,
      changedBy: req.admin._id,
      changedAt: new Date(),
    };

    // Prevent concurrent administrators from overwriting changes.
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
        returnDocument: "after",
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

    // ========================================
    // SEND OUT-FOR-DELIVERY EMAIL
    // ========================================

    let deliveryEmailStatus = "NOT_APPLICABLE";

    if (
      previousStatus === "PROCESSING" &&
      updatedOrder.orderStatus === "SHIPPED"
    ) {
      deliveryEmailStatus = await sendDeliveryEmailSafely(
        updatedOrder._id
      );
    }

    return res.status(200).json({
      success: true,

      message:
        deliveryEmailStatus === "FAILED"
          ? "Order status updated, but the delivery email could not be sent. It can be retried."
          : "Order status updated successfully.",

      deliveryEmailStatus,

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
// POST /api/admin/orders/:id/resend-notifications
// RETRY UNSENT ORDER EMAILS
// ============================================

router.post("/:id/resend-notifications", async (req, res) => {
  try {
    const order = await Order.findOne(orderLookup(req.params.id))
      .select(
        "orderNumber orderStatus paymentStatus inventoryCommitted customerConfirmationSentAt adminNotificationSentAt deliveryNotificationSentAt"
      )
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Do not retry payment-related notifications before payment is verified.
    if (order.paymentStatus !== "PAID") {
      return res.status(409).json({
        success: false,
        message:
          "Order notifications can only be retried after payment has been verified.",
      });
    }

    const results = {
      customerConfirmation: "NOT_APPLICABLE",
      adminNotification: "NOT_APPLICABLE",
      deliveryNotification: "NOT_APPLICABLE",
    };

    // Only send customer confirmation after inventory is committed.
    if (order.inventoryCommitted === true) {
      if (!order.customerConfirmationSentAt) {
        results.customerConfirmation =
          await sendCustomerConfirmationSafely(order._id);
      } else {
        results.customerConfirmation = "ALREADY_SENT";
      }
    } else {
      results.customerConfirmation = "WAITING_FOR_INVENTORY";
    }

    // Admin must still receive payment alerts when stock is unavailable.
    if (!order.adminNotificationSentAt) {
      results.adminNotification =
        await sendAdminNotificationSafely(order._id);
    } else {
      results.adminNotification = "ALREADY_SENT";
    }

    // Delivery email is only eligible for shipped orders with committed stock.
    if (
      order.orderStatus === "SHIPPED" &&
      order.inventoryCommitted === true
    ) {
      if (!order.deliveryNotificationSentAt) {
        results.deliveryNotification =
          await sendDeliveryEmailSafely(order._id);
      } else {
        results.deliveryNotification = "ALREADY_SENT";
      }
    }

    const hasFailure = Object.values(results).includes("FAILED");

    const hasSentEmail = Object.values(results).includes("SENT");

    const message = hasFailure
      ? "Some notifications could not be sent. You can retry them again."
      : hasSentEmail
        ? "Unsent notifications were processed successfully."
        : !order.inventoryCommitted
          ? "The admin notification was processed. Customer confirmation is waiting for inventory resolution."
          : "There are no eligible unsent notifications to retry.";

    return res.status(200).json({
      success: true,
      message,
      results,
    });
  } catch (error) {
    console.error("JHAIRS admin notification retry error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retry order notifications right now.",
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
