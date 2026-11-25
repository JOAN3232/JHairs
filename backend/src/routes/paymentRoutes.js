
import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";

import Order from "../models/Order.js";
import Product from "../models/Product.js";

import {
  sendCustomerOrderEmail,
  sendAdminOrderEmail,
} from "../services/emailService.js";

const router = express.Router();

const PAYSTACK_API_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

const INITIALIZATION_LOCK_TIMEOUT = 2 * 60 * 1000;
const EMAIL_LOCK_TIMEOUT = 5 * 60 * 1000;

// ============================================
// PAYSTACK API HELPER
// ============================================

const paystackRequest = async (url, options = {}) => {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("Paystack is not configured.");
  }

  const response = await fetch(`${PAYSTACK_API_URL}${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(20000),
  });

  const result = await response.json();

  if (!response.ok || !result.status) {
    throw new Error(result.message || "Paystack request failed.");
  }

  return result.data;
};

// ============================================
// PAYMENT VALIDATION
// ============================================

// Every transaction must match the saved order.
// The status is checked separately so pending payments
// can be recovered without being mistaken for successful payments.
const validatePaystackPayment = (paymentData, order, reference) => {
  return (
    paymentData.reference === reference &&
    Number(paymentData.amount) === Math.round(order.total * 100) &&
    paymentData.currency === "NGN" &&
    String(paymentData.metadata?.orderNumber) ===
      String(order.orderNumber)
  );
};

// ============================================
// NORMALIZE INVENTORY VARIATIONS
// ============================================

const normalizeVariationValue = (value) => value || "";

// ============================================
// SEND PAID ORDER EMAIL NOTIFICATIONS
// ============================================

// Customer confirmation is only sent when inventory is committed.
// Admin is notified even when stock needs manual attention.
const sendPaidOrderNotifications = async (orderNumber) => {
  const order = await Order.findOne({ orderNumber });

  if (!order || order.paymentStatus !== "PAID") {
    return;
  }

  const staleLockTime = new Date(
    Date.now() - EMAIL_LOCK_TIMEOUT
  );

  const processEmail = async ({
    sentField,
    sendingField,
    sendFunction,
    emailLabel,
    extraFilter = {},
  }) => {
    const claimedAt = new Date();

    try {
      const claimedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          paymentStatus: "PAID",
          [sentField]: null,
          ...extraFilter,
          $or: [
            { [sendingField]: null },
            { [sendingField]: { $lt: staleLockTime } },
          ],
        },
        {
          $set: {
            [sendingField]: claimedAt,
          },
        },
        {
          returnDocument: "after",
        }
      );

      if (!claimedOrder) {
        return;
      }

      const sent = await sendFunction(claimedOrder);

      if (sent) {
        await Order.updateOne(
          {
            _id: claimedOrder._id,
            [sendingField]: claimedAt,
          },
          {
            $set: {
              [sentField]: new Date(),
              [sendingField]: null,
            },
          }
        );

        console.log(`${emailLabel} sent for ${orderNumber}.`);
      } else {
        await Order.updateOne(
          {
            _id: claimedOrder._id,
            [sendingField]: claimedAt,
          },
          {
            $set: {
              [sendingField]: null,
            },
          }
        );

        console.error(`${emailLabel} failed for ${orderNumber}.`);
      }
    } catch (error) {
      console.error(`${emailLabel} error:`, error.message);

      try {
        await Order.updateOne(
          {
            _id: order._id,
            [sendingField]: claimedAt,
          },
          {
            $set: {
              [sendingField]: null,
            },
          }
        );
      } catch (releaseError) {
        console.error(
          `Unable to release ${emailLabel} lock:`,
          releaseError.message
        );
      }
    }
  };

  // Customer confirmation waits until stock is committed.
  await processEmail({
    sentField: "customerConfirmationSentAt",
    sendingField: "customerConfirmationSendingAt",
    sendFunction: sendCustomerOrderEmail,
    emailLabel: "Customer confirmation",
    extraFilter: {
      inventoryCommitted: true,
    },
  });

  // Admin receives notification for every successful payment.
  await processEmail({
    sentField: "adminNotificationSentAt",
    sendingField: "adminNotificationSendingAt",
    sendFunction: sendAdminOrderEmail,
    emailLabel: "Admin order notification",
  });
};

// ============================================
// COMMIT PAYMENT AND DEDUCT INVENTORY
// ============================================

const confirmPaidOrder = async (orderNumber, reference) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({
        orderNumber,
      }).session(session);

      if (!order) {
        throw new Error("Order not found.");
      }

      // Prevent duplicate inventory deductions.
      if (
        order.paymentStatus === "PAID" &&
        order.inventoryCommitted
      ) {
        return;
      }

      if (order.paymentReference !== reference) {
        throw new Error("Payment reference does not match.");
      }

      const groupedItems = new Map();

      // Combine identical variations to deduct their total quantity once.
      for (const item of order.items) {
        const productId = String(item.product);
        const color = normalizeVariationValue(item.color);
        const length = normalizeVariationValue(item.length);
        const density = normalizeVariationValue(item.density);
        const laceType = normalizeVariationValue(item.laceType);

        const key = JSON.stringify([
          productId,
          color,
          length,
          density,
          laceType,
        ]);

        if (!groupedItems.has(key)) {
          groupedItems.set(key, {
            productId,
            color,
            length,
            density,
            laceType,
            quantity: 0,
          });
        }

        groupedItems.get(key).quantity += item.quantity;
      }

      // Deduct stock inside one MongoDB transaction.
      // If any variation is unavailable, all deductions roll back.
      for (const item of groupedItems.values()) {
        const optionalMatch = (value) =>
          value === "" ? { $in: ["", null] } : value;

        const result = await Product.updateOne(
          {
            _id: item.productId,
            inventory: {
              $elemMatch: {
                color: item.color,
                length: item.length,
                density: optionalMatch(item.density),
                laceType: optionalMatch(item.laceType),
                stock: { $gte: item.quantity },
              },
            },
          },
          {
            $inc: {
              "inventory.$[variant].stock": -item.quantity,
              __v: 1,
            },
          },
          {
            arrayFilters: [
              {
                "variant.color": item.color,
                "variant.length": item.length,
                "variant.density": optionalMatch(item.density),
                "variant.laceType": optionalMatch(item.laceType),
              },
            ],
            session,
          }
        );

        if (result.modifiedCount !== 1) {
          throw new Error(
            `INSUFFICIENT_STOCK: ${item.color} ${item.length}`
          );
        }
      }

      // Mark the order paid only after every stock deduction succeeds.
      order.paymentStatus = "PAID";
      order.inventoryCommitted = true;
      order.paymentIssue = null;

      await order.save({ session });
    });

    return {
      success: true,
      inventoryIssue: false,
    };
  } catch (error) {
    // MongoDB rolls back the transaction if any variation fails.
    if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
      await Order.updateOne(
        {
          orderNumber,
          paymentReference: reference,
          inventoryCommitted: false,
        },
        {
          $set: {
            paymentStatus: "PAID",
            paymentIssue: "INVENTORY_UNAVAILABLE",
          },
        }
      );

      return {
        success: true,
        inventoryIssue: true,
        message:
          "Payment succeeded, but stock requires administrative review.",
      };
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

// ============================================
// VERIFY A PAYMENT DIRECTLY WITH PAYSTACK
// ============================================

const verifyOrderPayment = async (order, reference) => {
  const paymentData = await paystackRequest(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );

  if (!validatePaystackPayment(paymentData, order, reference)) {
    throw new Error("Payment details do not match this order.");
  }

  return paymentData;
};

// ============================================
// INITIALIZE PAYSTACK PAYMENT
// ============================================

// POST /api/payments/initialize
router.post("/initialize", async (req, res) => {
  let claimedOrderId = null;
  let initializationLock = null;

  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: "Payment service is not configured.",
      });
    }

    const { orderNumber } = req.body ?? {};

    if (
      typeof orderNumber !== "string" ||
      !orderNumber.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid order number is required.",
      });
    }

    const order = await Order.findOne({
      orderNumber: orderNumber.trim(),
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.orderStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cancelled orders cannot be paid for.",
      });
    }

    if (order.paymentStatus === "PAID") {
      await sendPaidOrderNotifications(order.orderNumber);

      return res.status(400).json({
        success: false,
        message: "This order has already been paid for.",
      });
    }

    // Recover an existing transaction before initializing another.
    if (
      order.paymentStatus === "PENDING" &&
      order.paymentReference
    ) {
      const previousPayment = await verifyOrderPayment(
        order,
        order.paymentReference
      );

      if (previousPayment.status === "success") {
        const confirmation = await confirmPaidOrder(
          order.orderNumber,
          order.paymentReference
        );

        await sendPaidOrderNotifications(order.orderNumber);

        return res.status(200).json({
          success: true,
          alreadyPaid: true,
          paid: true,
          reference: order.paymentReference,
          inventoryIssue: confirmation.inventoryIssue,
          message: confirmation.message || "Payment has been confirmed.",
        });
      }

      if (
        previousPayment.status === "ongoing" ||
        previousPayment.status === "pending"
      ) {
        if (!order.paymentAuthorizationUrl) {
          return res.status(409).json({
            success: false,
            message:
              "Your previous payment is still processing. Please verify its status before retrying.",
          });
        }

        return res.status(200).json({
          success: true,
          authorizationUrl: order.paymentAuthorizationUrl,
          reference: order.paymentReference,
          existingPayment: true,
        });
      }

      if (
        previousPayment.status === "failed" ||
        previousPayment.status === "abandoned"
      ) {
        await Order.updateOne(
          {
            _id: order._id,
            paymentReference: order.paymentReference,
            paymentStatus: "PENDING",
          },
          {
            $set: {
              paymentStatus: "FAILED",
              paymentAuthorizationUrl: null,
            },
          }
        );

        order.paymentStatus = "FAILED";
      } else {
        return res.status(409).json({
          success: false,
          message:
            "The previous payment has an unresolved status.",
        });
      }
    }

    if (
      order.paymentStatus !== "UNPAID" &&
      order.paymentStatus !== "FAILED"
    ) {
      return res.status(400).json({
        success: false,
        message: "This order cannot be paid for.",
      });
    }

    // Atomically claim the order before contacting Paystack.
    // This prevents simultaneous requests creating multiple transactions.
    const now = new Date();
    const staleInitializationTime = new Date(
      Date.now() - INITIALIZATION_LOCK_TIMEOUT
    );

    initializationLock = now;

    const claimedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        paymentStatus: {
          $in: ["UNPAID", "FAILED"],
        },
        $or: [
          { paymentInitializationStartedAt: null },
          {
            paymentInitializationStartedAt: {
              $lt: staleInitializationTime,
            },
          },
        ],
      },
      {
        $set: {
          paymentInitializationStartedAt: initializationLock,
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (!claimedOrder) {
      return res.status(409).json({
        success: false,
        message:
          "Payment initialization is already in progress. Please wait and try again.",
      });
    }

    claimedOrderId = claimedOrder._id;

    const amountInKobo = Math.round(claimedOrder.total * 100);
    const reference = `JHAIRS-${claimedOrder.orderNumber}-${Date.now()}`;

    // Initialize the transaction with Paystack.
    const paymentData = await paystackRequest(
      "/transaction/initialize",
      {
        method: "POST",
        body: JSON.stringify({
          email: claimedOrder.customer.email,
          amount: amountInKobo,
          currency: "NGN",
          reference,
          callback_url: `${FRONTEND_URL}/payment/verify`,
          metadata: {
            orderNumber: claimedOrder.orderNumber,
          },
        }),
      }
    );

    // Save the transaction only if this request still owns the lock.
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: claimedOrderId,
        paymentInitializationStartedAt: initializationLock,
        paymentStatus: {
          $in: ["UNPAID", "FAILED"],
        },
      },
      {
        $set: {
          paymentReference: reference,
          paymentAuthorizationUrl: paymentData.authorization_url,
          paymentStatus: "PENDING",
          paymentIssue: null,
          paymentInitializationStartedAt: null,
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (!updatedOrder) {
      return res.status(409).json({
        success: false,
        message:
          "Payment was initialized but the order could not be updated. Please contact support before attempting another payment.",
      });
    }

    // The lock has been released by the successful update.
    claimedOrderId = null;
    initializationLock = null;

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully.",
      authorizationUrl: paymentData.authorization_url,
      reference,
    });
  } catch (error) {
    console.error("Paystack initialization error:", error.message);

    // Release the initialization lock if this request still owns it.
    if (claimedOrderId && initializationLock) {
      try {
        await Order.updateOne(
          {
            _id: claimedOrderId,
            paymentInitializationStartedAt: initializationLock,
          },
          {
            $set: {
              paymentInitializationStartedAt: null,
            },
          }
        );
      } catch (releaseError) {
        console.error(
          "Unable to release payment initialization lock:",
          releaseError.message
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: "Unable to initialize payment.",
    });
  }
});

// ============================================
// VERIFY PAYSTACK PAYMENT
// ============================================

// GET /api/payments/verify/:reference
router.get("/verify/:reference", async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: "Payment service is not configured.",
      });
    }

    const { reference } = req.params;

    const order = await Order.findOne({
      paymentReference: reference,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Payment reference not found.",
      });
    }

    if (
      order.paymentStatus === "PAID" &&
      order.inventoryCommitted
    ) {
      await sendPaidOrderNotifications(order.orderNumber);

      return res.status(200).json({
        success: true,
        paid: true,
        inventoryIssue: false,
        message: "Payment has already been confirmed.",
      });
    }

    // Verify directly with Paystack before updating the order.
    const paymentData = await verifyOrderPayment(order, reference);

    if (paymentData.status !== "success") {
      if (
        paymentData.status === "failed" ||
        paymentData.status === "abandoned"
      ) {
        await Order.updateOne(
          {
            _id: order._id,
            paymentReference: reference,
            paymentStatus: "PENDING",
          },
          {
            $set: {
              paymentStatus: "FAILED",
              paymentAuthorizationUrl: null,
            },
          }
        );
      }

      return res.status(400).json({
        success: false,
        paid: false,
        paymentStatus: paymentData.status,
        message: "Payment has not been completed.",
      });
    }

    const confirmation = await confirmPaidOrder(
      order.orderNumber,
      reference
    );

    await sendPaidOrderNotifications(order.orderNumber);

    return res.status(200).json({
      success: true,
      paid: true,
      inventoryIssue: confirmation.inventoryIssue,
      message: confirmation.inventoryIssue
        ? confirmation.message
        : "Payment verified successfully.",
    });
  } catch (error) {
    console.error("Paystack verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment.",
    });
  }
});

// ============================================
// PAYSTACK WEBHOOK
// ============================================

// POST /api/payments/webhook
// app.js must preserve the raw request body for signature checking.
router.post("/webhook", async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.sendStatus(503);
    }

    const signature = req.headers["x-paystack-signature"];
    const rawBody = req.rawBody;

    if (
      typeof signature !== "string" ||
      !/^[a-f0-9]{128}$/i.test(signature) ||
      !Buffer.isBuffer(rawBody)
    ) {
      return res.sendStatus(400);
    }

    // Verify the webhook signature using the Paystack secret.
    const expectedSignature = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    const receivedBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return res.sendStatus(401);
    }

    const event = JSON.parse(rawBody.toString("utf8"));

    // Ignore events unrelated to successful payments.
    if (event.event !== "charge.success") {
      return res.sendStatus(200);
    }

    const reference = event.data?.reference;

    if (
      typeof reference !== "string" ||
      !reference.trim()
    ) {
      return res.sendStatus(400);
    }

    const order = await Order.findOne({
      paymentReference: reference,
    });

    // Ignore transactions that do not belong to this application.
    if (!order) {
      return res.sendStatus(200);
    }

    // Never trust the webhook payload alone.
    // Verify the transaction directly with Paystack.
    const paymentData = await verifyOrderPayment(
      order,
      reference
    );

    if (paymentData.status !== "success") {
      return res.sendStatus(200);
    }

    const confirmation = await confirmPaidOrder(
      order.orderNumber,
      reference
    );

    await sendPaidOrderNotifications(order.orderNumber);

    console.log(
      `Paystack webhook processed for ${order.orderNumber}.`,
      confirmation.inventoryIssue
        ? "Inventory review required."
        : ""
    );

    return res.sendStatus(200);
  } catch (error) {
    console.error("Paystack webhook error:", error.message);

    // A server error allows Paystack to retry the webhook.
    return res.sendStatus(500);
  }
});

export default router;
