
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ClipboardList,
  LoaderCircle,
  LogOut,
  Mail,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TriangleAlert,
  X,
} from "lucide-react";

/**
 * JHAIRS — ADMIN ORDER MANAGEMENT
 *
 * FEATURES:
 * - Protected administrator order retrieval.
 * - Customer order listing.
 * - Search and status filters.
 * - Server-side pagination.
 * - Detailed customer and delivery information.
 * - Protected order-status updates.
 * - Order-status history.
 * - Email notification tracking.
 * - Admin retry for failed or unsent emails.
 * - Automatic refresh after successful actions.
 *
 * SECURITY:
 * - Uses existing administrator JWT.
 * - Backend validates all status changes.
 * - No payment-status modifications.
 * - No inventory deductions.
 * - Email retries are handled by protected backend routes.
 */

// ============================================
// API CONFIGURATION
// ============================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

const PAGE_SIZE = 10;

// ============================================
// ALLOWED ORDER STATUS TRANSITIONS
// ============================================

const NEXT_STATUSES = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

// ============================================
// FORMAT CURRENCY
// ============================================

function formatMoney(amount) {
  if (amount === null || amount === undefined) {
    return "To be confirmed";
  }

  const number = Number(amount);

  if (!Number.isFinite(number)) {
    return "To be confirmed";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(number);
}

// ============================================
// FORMAT DATE
// ============================================

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// ============================================
// CUSTOMER NAME
// ============================================

function customerName(customer) {
  return (
    [customer?.firstName, customer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unknown Customer"
  );
}

// ============================================
// READ API RESPONSES
// ============================================

async function readResponse(response) {
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    const error = new Error(
      data?.message || "Unable to complete request."
    );

    error.status = response.status;

    throw error;
  }

  return data;
}

// ============================================
// ORDER AND PAYMENT STATUS BADGES
// ============================================

function StatusBadge({ status }) {
  const styles = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    UNPAID: "border-amber-200 bg-amber-50 text-amber-700",

    CONFIRMED: "border-blue-200 bg-blue-50 text-blue-700",
    PROCESSING: "border-blue-200 bg-blue-50 text-blue-700",

    SHIPPED: "border-purple-200 bg-purple-50 text-purple-700",

    DELIVERED: "border-green-200 bg-green-50 text-green-700",
    PAID: "border-green-200 bg-green-50 text-green-700",

    CANCELLED: "border-red-200 bg-red-50 text-red-700",
    FAILED: "border-red-200 bg-red-50 text-red-700",

    REFUNDED: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-medium ${
        styles[status] ||
        "border-[#EADCE2] bg-[#FBF5F7] text-[#705565]"
      }`}
    >
      {status || "UNKNOWN"}
    </span>
  );
}

// ============================================
// EMAIL NOTIFICATION STATUS
// ============================================

function EmailStatus({ label, sentAt, notApplicable = false }) {
  // A notification can be marked as not applicable.
  if (notApplicable) {
    return (
      <div className="flex items-start justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#553747]">
            {label}
          </p>

          <p className="mt-1 text-xs text-[#A3959B]">
            Not applicable to this order yet
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-medium text-slate-600">
          Not applicable
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#553747]">
          {label}
        </p>

        <p className="mt-1 text-xs text-[#A3959B]">
          {sentAt
            ? `Sent ${formatDate(sentAt)}`
            : "No successful send recorded"}
        </p>
      </div>

      {sentAt ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-[10px] font-medium text-green-700">
          <CheckCircle2 size={12} />
          Sent
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-medium text-amber-700">
          <Clock3 size={12} />
          Pending
        </span>
      )}
    </div>
  );
}

// ============================================
// ORDER DETAILS PANEL
// ============================================

function OrderDetails({
  order,
  loading,
  error,
  updating,
  updateError,
  updateSuccess,
  resending,
  resendError,
  resendSuccess,
  onUpdateStatus,
  onResendNotifications,
  onClose,
}) {
  /**
   * The administrator chooses a new status.
   *
   * The parent provides a React key containing
   * the order ID and current status.
   *
   * This resets the selection naturally whenever
   * the order or its current status changes.
   */
  const [nextStatus, setNextStatus] = useState("");

  // ==========================================
  // AVAILABLE ORDER STATUS OPTIONS
  // ==========================================

  const possibleStatuses = order
    ? NEXT_STATUSES[order.orderStatus] || []
    : [];

  // Processing requires payment and committed stock.
  const canProcess =
    order?.paymentStatus === "PAID" &&
    order?.inventoryCommitted === true;

  // Cancellation is only available for eligible
  // unpaid orders without committed inventory.
  const canCancel =
    ["UNPAID", "FAILED"].includes(order?.paymentStatus) &&
    order?.inventoryCommitted === false;

  const availableStatuses = possibleStatuses.filter(
    (status) => {
      if (status === "PROCESSING") {
        return canProcess;
      }

      if (status === "CANCELLED") {
        return canCancel;
      }

      return true;
    }
  );

  // ==========================================
  // EMAIL NOTIFICATION ELIGIBILITY
  // ==========================================

  const isPaid = order?.paymentStatus === "PAID";

  const deliveryEmailApplicable =
    order?.orderStatus === "SHIPPED" &&
    order?.inventoryCommitted === true;

  // Check whether any eligible notification
  // has not yet been successfully recorded.
  const hasUnsentNotifications =
    isPaid &&
    (
      !order?.customerConfirmationSentAt ||
      !order?.adminNotificationSentAt ||
      (
        deliveryEmailApplicable &&
        !order?.deliveryNotificationSentAt
      )
    );

  // ==========================================
  // CONFIRM AN ORDER STATUS CHANGE
  // ==========================================

  function handleSubmit(event) {
    event.preventDefault();

    if (
      !order ||
      updating ||
      !availableStatuses.includes(nextStatus)
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Change order ${order.orderNumber} from ${order.orderStatus} to ${nextStatus}?`
    );

    if (confirmed) {
      onUpdateStatus(nextStatus);
    }
  }

  // ==========================================
  // DETAILS PANEL UI
  // ==========================================

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-[#2D1D26]/45"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !updating &&
          !resending
        ) {
          onClose();
        }
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Order details"
        className="flex h-full w-full max-w-[560px] flex-col bg-[#FFFCFA] shadow-2xl"
      >
        {/* =====================================
            PANEL HEADER
           ===================================== */}

        <header className="flex items-center justify-between border-b border-[#F0E5E9] px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B1849B]">
              JHAIRS Administration
            </p>

            <h2 className="mt-2 font-heading text-2xl text-[#553747]">
              Order Details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={updating || resending}
            aria-label="Close order details"
            className="rounded-full border border-[#EADCE2] bg-white p-3 text-[#705565] hover:bg-[#F9EDF2] disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </header>

        {/* =====================================
            SCROLLABLE ORDER INFORMATION
           ===================================== */}

        <div className="flex-1 overflow-y-auto px-6 py-7">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-3 py-20 text-sm text-[#917F87]">
              <LoaderCircle
                size={20}
                className="animate-spin"
              />

              Loading order details...
            </div>
          )}

          {/* Detail loading error */}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {/* Actual order information */}
          {!loading && !error && order && (
            <div className="space-y-7">
              {/* =================================
                  ORDER REFERENCE
                 ================================= */}

              <section className="rounded-[22px] border border-[#F0DCE6] bg-[#F9EDF2] p-5">
                <p className="text-xs text-[#917F87]">
                  Order Reference
                </p>

                <h3 className="mt-2 break-all font-heading text-xl text-[#553747]">
                  {order.orderNumber}
                </h3>

                <p className="mt-3 text-xs text-[#917F87]">
                  Placed {formatDate(order.createdAt)}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <StatusBadge status={order.orderStatus} />
                  <StatusBadge status={order.paymentStatus} />
                </div>
              </section>

              {/* =================================
                  ORDER STATUS MANAGEMENT
                 ================================= */}

              <section className="rounded-[22px] border border-[#F0DCE6] bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-[#F8EDF2] p-3 text-[#A6758D]">
                    <ClipboardList size={20} />
                  </div>

                  <div>
                    <h3 className="font-heading text-xl text-[#553747]">
                      Manage Order Status
                    </h3>

                    <p className="mt-2 text-xs leading-6 text-[#917F87]">
                      Update this order using the available
                      next steps.
                    </p>
                  </div>
                </div>

                {/* Current status */}
                <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-[#FBF5F7] p-4">
                  <span className="text-xs text-[#856F7B]">
                    Current Status
                  </span>

                  <StatusBadge status={order.orderStatus} />
                </div>

                {/* Status change form */}
                {availableStatuses.length > 0 ? (
                  <form
                    onSubmit={handleSubmit}
                    className="mt-5 space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="jhairs-next-status"
                        className="mb-2 block text-sm font-medium text-[#654A58]"
                      >
                        New Status
                      </label>

                      <select
                        id="jhairs-next-status"
                        value={nextStatus}
                        onChange={(event) =>
                          setNextStatus(event.target.value)
                        }
                        disabled={updating}
                        className="w-full rounded-xl border border-[#EBDDE4] bg-[#FFFCFA] px-4 py-3.5 text-sm text-[#553747] outline-none focus:border-[#BB8CA3] disabled:opacity-60"
                      >
                        <option value="">
                          Select Next Status
                        </option>

                        {availableStatuses.map((status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!nextStatus || updating || resending}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#553747] px-5 py-3.5 text-sm font-medium text-white hover:bg-[#80566B] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updating ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}

                      {updating
                        ? "Updating Order..."
                        : "Update Order Status"}
                    </button>
                  </form>
                ) : (
                  <p className="mt-5 rounded-xl bg-[#FBF5F7] p-4 text-xs leading-6 text-[#856F7B]">
                    {order.orderStatus === "CANCELLED" ||
                    order.orderStatus === "DELIVERED"
                      ? "This order has reached a final status."
                      : "No further status changes are currently available. Payment or inventory verification may be required."}
                  </p>
                )}

                {/* Status update error */}
                {updateError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  >
                    {updateError}
                  </p>
                )}

                {/* Status update success */}
                {updateSuccess && (
                  <p
                    role="status"
                    className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
                  >
                    <CheckCircle2 size={17} />
                    {updateSuccess}
                  </p>
                )}

                {/* Security reminder */}
                <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-[#917F87]">
                  <ShieldCheck
                    size={15}
                    className="mt-1 shrink-0"
                  />

                  Payment status and product inventory
                  cannot be changed from this page.
                </p>
              </section>

              {/* =================================
                  EMAIL NOTIFICATION MANAGEMENT
                 ================================= */}

              <section className="rounded-[22px] border border-[#F0DCE6] bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-[#F8EDF2] p-3 text-[#A6758D]">
                    <Mail size={20} />
                  </div>

                  <div>
                    <h3 className="font-heading text-xl text-[#553747]">
                      Email Notifications
                    </h3>

                    <p className="mt-2 text-xs leading-6 text-[#917F87]">
                      Monitor the notification emails associated
                      with this order.
                    </p>
                  </div>
                </div>

                {!isPaid ? (
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <Clock3
                      size={18}
                      className="mt-0.5 shrink-0 text-amber-700"
                    />

                    <p className="text-xs leading-6 text-amber-800">
                      Email notifications become eligible after
                      successful payment verification.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-5 divide-y divide-[#F0E5E9]">
                      <EmailStatus
                        label="Customer Order Confirmation"
                        sentAt={order.customerConfirmationSentAt}
                      />

                      <EmailStatus
                        label="Admin New Order Notification"
                        sentAt={order.adminNotificationSentAt}
                      />

                      <EmailStatus
                        label="Out-for-Delivery Notification"
                        sentAt={order.deliveryNotificationSentAt}
                        notApplicable={!deliveryEmailApplicable}
                      />
                    </div>

                    {/* Retry notification emails */}
                    {hasUnsentNotifications && (
                      <button
                        type="button"
                        onClick={onResendNotifications}
                        disabled={resending || updating}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#553747] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#80566B] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {resending ? (
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <RefreshCw size={17} />
                        )}

                        {resending
                          ? "Retrying Emails..."
                          : "Retry Failed Emails"}
                      </button>
                    )}

                    {/* All eligible notifications have been sent */}
                    {!hasUnsentNotifications && (
                      <div className="mt-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-xs text-green-700">
                        <CheckCircle2 size={17} />

                        All currently applicable notification
                        emails have been recorded as sent.
                      </div>
                    )}
                  </>
                )}

                {/* Retry error */}
                {resendError && (
                  <p
                    role="alert"
                    className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  >
                    <TriangleAlert
                      size={17}
                      className="mt-0.5 shrink-0"
                    />

                    {resendError}
                  </p>
                )}

                {/* Retry success */}
                {resendSuccess && (
                  <p
                    role="status"
                    className="mt-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
                  >
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0"
                    />

                    {resendSuccess}
                  </p>
                )}

                <p className="mt-4 text-[11px] leading-5 text-[#A3959B]">
                  Successfully recorded emails will not be sent
                  again through the retry action.
                </p>
              </section>

              {/* =================================
                  STATUS HISTORY
                 ================================= */}

              <section>
                <div className="flex items-center gap-2">
                  <Clock3
                    size={20}
                    className="text-[#A6758D]"
                  />

                  <h3 className="font-heading text-xl text-[#553747]">
                    Status History
                  </h3>
                </div>

                {(order.statusHistory || []).length === 0 ? (
                  <p className="mt-4 rounded-xl border border-[#F0E5E9] bg-white p-5 text-sm text-[#917F87]">
                    No status changes have been recorded yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-4 border-l-2 border-[#EADCE2] pl-5">
                    {[...(order.statusHistory || [])]
                      .reverse()
                      .map((entry, index) => (
                        <div
                          key={`${entry.changedAt}-${index}`}
                          className="relative rounded-xl border border-[#F0E5E9] bg-white p-4"
                        >
                          <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-white bg-[#B1849B]" />

                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={entry.from} />

                            <ArrowRight
                              size={15}
                              className="text-[#B1849B]"
                            />

                            <StatusBadge status={entry.to} />
                          </div>

                          <p className="mt-3 text-xs text-[#917F87]">
                            {formatDate(entry.changedAt)}
                          </p>

                          <p className="mt-1 text-xs text-[#A3959B]">
                            Updated by an administrator
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </section>

              {/* =================================
                  CUSTOMER INFORMATION
                 ================================= */}

              <section>
                <h3 className="font-heading text-xl text-[#553747]">
                  Customer Information
                </h3>

                <div className="mt-4 space-y-2 rounded-2xl border border-[#F0E5E9] bg-white p-5 text-sm">
                  <p className="font-medium text-[#553747]">
                    {customerName(order.customer)}
                  </p>

                  <p className="break-all text-[#856F7B]">
                    {order.customer?.email || "No email"}
                  </p>

                  <p className="text-[#856F7B]">
                    {order.customer?.phone || "No phone"}
                  </p>
                </div>
              </section>

              {/* =================================
                  DELIVERY INFORMATION
                 ================================= */}

              <section>
                <h3 className="font-heading text-xl text-[#553747]">
                  Delivery Information
                </h3>

                <div className="mt-4 space-y-2 rounded-2xl border border-[#F0E5E9] bg-white p-5 text-sm text-[#856F7B]">
                  <p className="font-medium capitalize text-[#553747]">
                    {order.deliveryMethod || "Standard"} Delivery
                  </p>

                  <p>
                    {order.deliveryAddress?.address || "Not provided"}
                  </p>

                  {order.deliveryAddress?.apartment && (
                    <p>{order.deliveryAddress.apartment}</p>
                  )}

                  <p>
                    {[
                      order.deliveryAddress?.city,
                      order.deliveryAddress?.state,
                      order.deliveryAddress?.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </section>

              {/* =================================
                  PURCHASED HAIR PRODUCTS
                 ================================= */}

              <section>
                <h3 className="font-heading text-xl text-[#553747]">
                  Purchased Items
                </h3>

                <div className="mt-4 space-y-3">
                  {(order.items || []).map((item, index) => (
                    <div
                      key={`${item.productId}-${index}`}
                      className="flex gap-4 rounded-2xl border border-[#F0E5E9] bg-white p-4"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-20 w-20 shrink-0 rounded-xl bg-[#FBF3F6] object-contain"
                        />
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#FBF3F6] text-[#B1849B]">
                          <Package size={24} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-[#553747]">
                          {item.name}
                        </h4>

                        <p className="mt-1 text-xs leading-6 text-[#917F87]">
                          {[
                            item.color,
                            item.length
                              ? `${item.length} inches`
                              : "",
                            item.density,
                            item.laceType,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>

                        <p className="mt-2 text-xs text-[#856F7B]">
                          Qty: {item.quantity}
                        </p>

                        <p className="mt-1 text-sm font-medium text-[#553747]">
                          {formatMoney(item.lineTotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* =================================
                  ORDER PRICE SUMMARY
                 ================================= */}

              <section className="rounded-2xl border border-[#F0E5E9] bg-white p-5">
                <h3 className="font-heading text-xl text-[#553747]">
                  Order Summary
                </h3>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#917F87]">
                      Subtotal
                    </span>

                    <span className="text-[#553747]">
                      {formatMoney(order.subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-[#917F87]">
                      Delivery
                    </span>

                    <span className="text-[#553747]">
                      {formatMoney(order.deliveryFee)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-t border-[#F0E5E9] pt-4 font-medium">
                    <span className="text-[#553747]">
                      Total
                    </span>

                    <span className="text-[#553747]">
                      {formatMoney(order.total)}
                    </span>
                  </div>
                </div>
              </section>

              {/* =================================
                  CUSTOMER NOTES
                 ================================= */}

              {order.notes && (
                <section>
                  <h3 className="font-heading text-xl text-[#553747]">
                    Customer Notes
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-[#FBF5F7] p-5 text-sm leading-7 text-[#856F7B]">
                    {order.notes}
                  </p>
                </section>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ============================================
// MAIN ADMIN ORDERS PAGE
// ============================================

function AdminOrders({ session, onLogout }) {
  // ==========================================
  // ORDER LIST STATE
  // ==========================================

  const [orders, setOrders] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    totalOrders: 0,
    totalPages: 0,
  });

  const [page, setPage] = useState(1);

  // Search and filters.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  // List loading and error states.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Trigger a fresh list request.
  const [refreshKey, setRefreshKey] = useState(0);

  // ==========================================
  // SELECTED ORDER STATE
  // ==========================================

  const [selectedOrderId, setSelectedOrderId] =
    useState(null);

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [detailError, setDetailError] =
    useState("");

  // Status update states.
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");

  // Email retry states.
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState("");
  const [resendSuccess, setResendSuccess] = useState("");

  // ==========================================
  // LOAD CUSTOMER ORDERS FROM MONGODB
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      setIsLoading(true);
      setError("");

      try {
        // Build pagination and search parameters.
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });

        if (search) {
          params.set("search", search);
        }

        if (orderStatus) {
          params.set("orderStatus", orderStatus);
        }

        if (paymentStatus) {
          params.set("paymentStatus", paymentStatus);
        }

        // Authenticated API request.
        const response = await fetch(
          `${API_BASE_URL}/api/admin/orders?${params}`,
          {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },

            signal: controller.signal,
            cache: "no-store",
          }
        );

        // Log out if authentication has expired.
        if (response.status === 401) {
          if (!controller.signal.aborted) {
            onLogout();
          }

          return;
        }

        const data = await readResponse(response);

        if (controller.signal.aborted) return;

        // Save the orders returned by MongoDB.
        setOrders(
          Array.isArray(data.orders) ? data.orders : []
        );

        setPagination(
          data.pagination || {
            page,
            limit: PAGE_SIZE,
            totalOrders: 0,
            totalPages: 0,
          }
        );
      } catch (requestError) {
        if (
          controller.signal.aborted ||
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    return () => controller.abort();
  }, [
    session.token,
    onLogout,
    page,
    search,
    orderStatus,
    paymentStatus,
    refreshKey,
  ]);

  // ==========================================
  // LOAD SELECTED ORDER DETAILS
  // ==========================================

  useEffect(() => {
    if (!selectedOrderId) return;

    const controller = new AbortController();

    async function loadDetails() {
      setSelectedOrder(null);
      setDetailError("");
      setDetailLoading(true);

      setUpdateError("");
      setUpdateSuccess("");
      setResendError("");
      setResendSuccess("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(
            selectedOrderId
          )}`,
          {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },

            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (response.status === 401) {
          if (!controller.signal.aborted) {
            onLogout();
          }

          return;
        }

        const data = await readResponse(response);

        if (!controller.signal.aborted) {
          setSelectedOrder(data.order);
        }
      } catch (requestError) {
        if (
          controller.signal.aborted ||
          requestError.name === "AbortError"
        ) {
          return;
        }

        setDetailError(requestError.message);
      } finally {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      }
    }

    loadDetails();

    return () => controller.abort();
  }, [selectedOrderId, session.token, onLogout]);

  // ==========================================
  // UPDATE ORDER STATUS
  // ==========================================

  async function handleUpdateStatus(nextStatus) {
    if (!selectedOrder || updating || resending) return;

    const orderId = selectedOrder.id;

    setUpdating(true);
    setUpdateError("");
    setUpdateSuccess("");

    try {
      // Send the requested status change to
      // our protected backend endpoint.
      const response = await fetch(
        `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(
          orderId
        )}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },

          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await readResponse(response);

      // Update the currently open order panel.
      setSelectedOrder((previous) => {
        if (previous?.id !== orderId) {
          return previous;
        }

        return {
          ...previous,

          orderStatus: data.order.orderStatus,
          paymentStatus: data.order.paymentStatus,

          inventoryCommitted:
            data.order.inventoryCommitted,

          statusHistory:
            data.order.statusHistory || [],

          updatedAt: data.order.updatedAt,
        };
      });

      // Fetch the updated list again.
      setRefreshKey((previous) => previous + 1);

      setUpdateSuccess(
        "Order status updated successfully!"
      );
    } catch (requestError) {
      setUpdateError(
        requestError.status === 409
          ? `${requestError.message} Refresh the order if needed.`
          : requestError.message
      );
    } finally {
      setUpdating(false);
    }
  }

  // ==========================================
  // RETRY UNSENT EMAIL NOTIFICATIONS
  // ==========================================

  async function handleResendNotifications() {
    if (!selectedOrder || resending || updating) return;

    const orderId = selectedOrder.id;

    setResending(true);
    setResendError("");
    setResendSuccess("");

    try {
      // Call the protected backend retry endpoint.
      const response = await fetch(
        `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(
          orderId
        )}/resend-notifications`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }
      );

      // End the session if the administrator token
      // is no longer valid.
      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await readResponse(response);

      // Show the backend's retry result.
      setResendSuccess(
        data.message ||
          "Email notification retry request completed."
      );

      // Retrieve the latest order details so the
      // notification timestamps are immediately updated.
      const detailsResponse = await fetch(
        `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(
          orderId
        )}`,
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },

          cache: "no-store",
        }
      );

      if (detailsResponse.status === 401) {
        onLogout();
        return;
      }

      const detailsData = await readResponse(detailsResponse);

      setSelectedOrder(detailsData.order);

      // Refresh the main order list as well.
      setRefreshKey((previous) => previous + 1);
    } catch (requestError) {
      setResendError(requestError.message);
    } finally {
      setResending(false);
    }
  }

  // ==========================================
  // SEARCH HANDLER
  // ==========================================

  function handleSearch(event) {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  }

  // ==========================================
  // REFRESH HANDLER
  // ==========================================

  function handleRefresh() {
    setRefreshKey((previous) => previous + 1);
  }

  // ==========================================
  // CLOSE ORDER DETAILS
  // ==========================================

  function handleCloseDetails() {
    if (updating || resending) return;

    setSelectedOrderId(null);
    setSelectedOrder(null);

    setDetailError("");
    setUpdateError("");
    setUpdateSuccess("");

    setResendError("");
    setResendSuccess("");
  }

  // ==========================================
  // MAIN PAGE DESIGN
  // ==========================================

  return (
    <main className="min-h-screen bg-[#FFFCFA] font-body">
      <div className="mx-auto max-w-[1250px] px-5 py-8 sm:px-10 lg:px-12">
        {/* =====================================
            PAGE HEADER
           ===================================== */}

        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#F0E5E9] pb-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B1849B]">
              JHAIRS Administration
            </p>

            <h1 className="mt-2 font-heading text-3xl text-[#553747] sm:text-4xl">
              Order Management
            </h1>

            <p className="mt-3 text-sm text-[#917F87]">
              Beautifully organised, from order request
              to delivery.
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-full border border-[#EADCE2] bg-white px-5 py-3 text-sm text-[#705565] hover:bg-[#FFF5F8]"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </header>

        {/* =====================================
            BACK TO DASHBOARD
           ===================================== */}

        <div className="pt-7">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[#A6758D] hover:text-[#553747]"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        {/* =====================================
            WELCOME PANEL
           ===================================== */}

        <section className="pt-7">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[26px] border border-[#F0DCE6] bg-[#F9EDF2] p-7 sm:p-9">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#A6758D]">
                <ShoppingBag size={23} />
              </div>

              <h2 className="mt-5 font-heading text-2xl text-[#553747] sm:text-3xl">
                Your Orders Studio
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-7 text-[#856F7B]">
                Track customer requests, purchased hair
                variations and fulfilment progress.
              </p>
            </div>

            {/* Matching order count */}
            <div className="rounded-2xl border border-white/80 bg-white/80 px-6 py-5">
              <p className="text-xs text-[#917F87]">
                Matching Orders
              </p>

              <p className="mt-2 font-heading text-4xl text-[#553747]">
                {pagination.totalOrders.toLocaleString()}
              </p>
            </div>
          </div>
        </section>

        {/* =====================================
            CUSTOMER ORDERS
           ===================================== */}

        <section className="pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B1849B]">
                Customer Requests
              </p>

              <h2 className="mt-2 font-heading text-2xl text-[#553747] sm:text-3xl">
                All Orders
              </h2>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-[#EADCE2] bg-white px-5 py-3 text-sm text-[#705565] hover:bg-[#FFF5F8] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />

              Refresh
            </button>
          </div>

          {/* ==================================
              SEARCH AND FILTERS
             ================================== */}

          <div className="mt-7 rounded-[22px] border border-[#F0E5E9] bg-white p-5 sm:p-6">
            <form
              onSubmit={handleSearch}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B1849B]"
                />

                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(event.target.value)
                  }
                  placeholder="Search order number or customer..."
                  maxLength={100}
                  className="w-full rounded-xl border border-[#EBDDE4] bg-[#FFFCFA] py-3.5 pl-12 pr-4 text-sm text-[#553747] outline-none focus:border-[#BB8CA3]"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-[#553747] px-6 py-3.5 text-sm font-medium text-white hover:bg-[#80566B]"
              >
                Search Orders
              </button>
            </form>

            {/* Filter selectors */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="jhairs-order-filter"
                  className="mb-2 block text-xs font-medium text-[#856F7B]"
                >
                  Order Status
                </label>

                <select
                  id="jhairs-order-filter"
                  value={orderStatus}
                  onChange={(event) => {
                    setPage(1);
                    setOrderStatus(event.target.value);
                  }}
                  className="w-full rounded-xl border border-[#EBDDE4] bg-[#FFFCFA] px-4 py-3.5 text-sm text-[#553747] outline-none focus:border-[#BB8CA3]"
                >
                  <option value="">
                    All Order Statuses
                  </option>

                  <option value="PENDING">
                    Pending
                  </option>

                  <option value="CONFIRMED">
                    Confirmed
                  </option>

                  <option value="PROCESSING">
                    Processing
                  </option>

                  <option value="SHIPPED">
                    Shipped
                  </option>

                  <option value="DELIVERED">
                    Delivered
                  </option>

                  <option value="CANCELLED">
                    Cancelled
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="jhairs-payment-filter"
                  className="mb-2 block text-xs font-medium text-[#856F7B]"
                >
                  Payment Status
                </label>

                <select
                  id="jhairs-payment-filter"
                  value={paymentStatus}
                  onChange={(event) => {
                    setPage(1);
                    setPaymentStatus(event.target.value);
                  }}
                  className="w-full rounded-xl border border-[#EBDDE4] bg-[#FFFCFA] px-4 py-3.5 text-sm text-[#553747] outline-none focus:border-[#BB8CA3]"
                >
                  <option value="">
                    All Payment Statuses
                  </option>

                  <option value="UNPAID">
                    Unpaid
                  </option>

                  <option value="PENDING">
                    Payment Pending
                  </option>

                  <option value="PAID">
                    Paid
                  </option>

                  <option value="FAILED">
                    Failed
                  </option>

                  <option value="REFUNDED">
                    Refunded
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* ==================================
              ERROR STATE
             ================================== */}

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
            >
              <TriangleAlert size={19} />

              <span>{error}</span>
            </div>
          )}

          {/* ==================================
              LOADING STATE
             ================================== */}

          {isLoading && (
            <div className="mt-7 flex items-center justify-center gap-3 rounded-[22px] border border-[#F0E5E9] bg-white py-20 text-sm text-[#917F87]">
              <LoaderCircle
                size={21}
                className="animate-spin"
              />

              Loading customer orders...
            </div>
          )}

          {/* ==================================
              EMPTY STATE
             ================================== */}

          {!isLoading && !error && orders.length === 0 && (
            <div className="mt-7 rounded-[22px] border border-[#F0E5E9] bg-white px-6 py-16 text-center">
              <ClipboardList
                size={32}
                className="mx-auto text-[#B1849B]"
              />

              <h3 className="mt-5 font-heading text-2xl text-[#553747]">
                No Orders Found
              </h3>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#917F87]">
                Orders matching your search and filters
                will appear here.
              </p>
            </div>
          )}

          {/* ==================================
              CUSTOMER ORDER CARDS
             ================================== */}

          {!isLoading && !error && orders.length > 0 && (
            <div className="mt-7 space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[22px] border border-[#F0E5E9] bg-white p-5 shadow-[0_8px_26px_rgba(84,55,70,0.03)] sm:p-6"
                >
                  {/* Order reference and status */}
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B1849B]">
                        Order Reference
                      </p>

                      <h3 className="mt-2 break-all font-heading text-lg text-[#553747] sm:text-xl">
                        {order.orderNumber}
                      </h3>

                      <p className="mt-2 text-xs text-[#917F87]">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        status={order.orderStatus}
                      />

                      <StatusBadge
                        status={order.paymentStatus}
                      />
                    </div>
                  </div>

                  {/* Order summary information */}
                  <div className="mt-5 grid grid-cols-1 gap-4 border-y border-[#F0E5E9] py-5 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-[#A3959B]">
                        Customer
                      </p>

                      <p className="mt-1 text-sm font-medium text-[#553747]">
                        {customerName(order.customer)}
                      </p>

                      <p className="mt-1 break-all text-xs text-[#917F87]">
                        {order.customer?.email}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#A3959B]">
                        Quantity
                      </p>

                      <p className="mt-1 text-sm font-medium text-[#553747]">
                        {order.itemCount} item(s)
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#A3959B]">
                        Subtotal
                      </p>

                      <p className="mt-1 text-sm font-medium text-[#553747]">
                        {formatMoney(order.subtotal)}
                      </p>
                    </div>
                  </div>

                  {/* View order button */}
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOrderId(order.id)
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-[#553747] px-5 py-3 text-sm text-white hover:bg-[#80566B]"
                    >
                      View Order

                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ==================================
              PAGINATION
             ================================== */}

          {!isLoading &&
            !error &&
            pagination.totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-[#917F87]">
                  Page {pagination.page} of{" "}
                  {pagination.totalPages}
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((previous) => previous - 1)
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-[#EADCE2] bg-white px-4 py-2.5 text-sm text-[#705565] disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />

                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      page >= pagination.totalPages
                    }
                    onClick={() =>
                      setPage((previous) => previous + 1)
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-[#EADCE2] bg-white px-4 py-2.5 text-sm text-[#705565] disabled:opacity-40"
                  >
                    Next

                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
        </section>

        {/* =====================================
            FOOTER
           ===================================== */}

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-[#F0E5E9] py-7">
          <p className="font-heading text-xl text-[#553747]">
            JHAIRS.
          </p>

          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 text-xs text-[#A6758D] hover:text-[#553747]"
          >
            Return to Dashboard

            <ArrowRight size={15} />
          </Link>
        </footer>
      </div>

      {/* =====================================
          SELECTED ORDER DETAILS

          The key resets the local selected
          status whenever the order or its
          current status changes.
         ===================================== */}

      {selectedOrderId && (
        <OrderDetails
          key={`${selectedOrderId}-${selectedOrder?.orderStatus || "loading"}`}
          order={selectedOrder}
          loading={detailLoading}
          error={detailError}
          updating={updating}
          updateError={updateError}
          updateSuccess={updateSuccess}
          resending={resending}
          resendError={resendError}
          resendSuccess={resendSuccess}
          onUpdateStatus={handleUpdateStatus}
          onResendNotifications={handleResendNotifications}
          onClose={handleCloseDetails}
        />
      )}
    </main>
  );
}

export default AdminOrders;
