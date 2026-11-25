
/**
 * JHAIRS — EMAIL SERVICE
 *
 * Sends:
 * 1. Customer order confirmation emails.
 * 2. Admin new-order notification emails.
 * 3. Customer out-for-delivery notifications.
 *
 * Uses the Brevo Transactional Email API.
 * No additional npm package is required.
 */

// ============================================
// BREVO CONFIGURATION
// ============================================

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// ============================================
// HTML SAFETY HELPER
// ============================================

// Escape customer-provided values before inserting
// them into HTML email templates.
const escapeHtml = (value = "") => {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
};

// ============================================
// EMAIL FORMATTING HELPERS
// ============================================

// Format order amounts as Nigerian Naira.
const formatPrice = (amount) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

// Format the customer's delivery address.
const formatAddress = (address = {}) => {
  return [
    address.address,
    address.apartment,
    address.city,
    address.state,
    address.country,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(", ");
};

// Build the purchased products list.
const buildOrderItems = (items = []) => {
  return items.map((item) => {
    const variations = [
      item.color && `Colour: ${escapeHtml(item.color)}`,
      item.length && `Length: ${escapeHtml(item.length)} inches`,
      item.density && `Density: ${escapeHtml(item.density)}`,
      item.laceType && `Lace: ${escapeHtml(item.laceType)}`,
    ]
      .filter(Boolean)
      .join(" | ");

    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;">
          <strong>${escapeHtml(item.name)}</strong>
          <br />
          <small>${variations}</small>
          <br />
          Quantity: ${Number(item.quantity) || 0}
        </td>
        <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">
          ${formatPrice(item.lineTotal)}
        </td>
      </tr>
    `;
  }).join("");
};

// ============================================
// SEND TRANSACTIONAL EMAIL
// ============================================

const sendEmail = async ({
  to,
  subject,
  htmlContent,
  textContent,
}) => {
  // Read environment variables when sending, not when importing.
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

  // Validate the required configuration and recipient.
  if (!BREVO_API_KEY || !SENDER_EMAIL || !to) {
    console.error("Brevo email configuration or recipient is missing.");
    return false;
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",

      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },

      body: JSON.stringify({
        sender: {
          name: "JHAIRS",
          email: SENDER_EMAIL,
        },

        to: [
          {
            email: to,
          },
        ],

        subject,
        htmlContent,
        textContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();

      console.error("Brevo email error:", errorData);
      return false;
    }

    console.log(`Email accepted by Brevo for ${to}.`);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error.message);
    return false;
  }
};

// ============================================
// CUSTOMER ORDER CONFIRMATION
// ============================================

const sendCustomerConfirmation = async (order) => {
  const customerName = escapeHtml(
    `${order.customer.firstName} ${order.customer.lastName}`
  );

  const orderNumber = escapeHtml(order.orderNumber);
  const itemsHtml = buildOrderItems(order.items);
  const address = formatAddress(order.deliveryAddress);

  const subject = `JHAIRS — Order ${order.orderNumber} Confirmed`;

  const htmlContent = `
    <div style="font-family:Arial,sans-serif;color:#40313a;max-width:650px;margin:auto;line-height:1.6;">
      <div style="background:#f8e8ef;padding:30px;text-align:center;">
        <h1 style="color:#8c526b;margin:0;">JHAIRS</h1>
        <p style="margin-bottom:0;">Luxury Hair. Timeless Beauty.</p>
      </div>

      <div style="padding:30px 20px;">
        <h2>Hello ${customerName},</h2>

        <p>
          Thank you for shopping with JHAIRS!
          Your payment has been confirmed and your order
          has been successfully received.
        </p>

        <p>
          We're preparing your order for delivery.
          We'll keep you informed as it progresses.
        </p>

        <h3 style="color:#8c526b;">Order Details</h3>

        <p><strong>Order number:</strong> ${orderNumber}</p>
        <p><strong>Payment status:</strong> PAID</p>

        <table style="width:100%;border-collapse:collapse;">
          ${itemsHtml}
        </table>

        <p><strong>Subtotal:</strong> ${formatPrice(order.subtotal)}</p>
        <p><strong>Delivery fee:</strong> ${formatPrice(order.deliveryFee)}</p>

        <h3 style="color:#8c526b;">
          Total: ${formatPrice(order.total)}
        </h3>

        <h3 style="color:#8c526b;">Delivery Address</h3>
        <p>${address}</p>

        <p>
          Thank you for choosing JHAIRS. We appreciate your trust
          and can't wait for you to enjoy your purchase!
        </p>

        <p>
          Need assistance? Contact us on
          <a href="https://wa.me/2349136466679">WhatsApp</a>
          or email
          <a href="mailto:agujoan86@gmail.com">our support team</a>.
        </p>
      </div>

      <div style="background:#f8e8ef;padding:20px;text-align:center;">
        <p style="margin:0;">With love, JHAIRS 💗</p>
      </div>
    </div>
  `;

  const textContent = `
Hello ${order.customer.firstName},

Thank you for shopping with JHAIRS!

Your payment has been confirmed and your order has been received.

Order number: ${order.orderNumber}
Total: ${formatPrice(order.total)}

Your order is being prepared for delivery.
We'll keep you informed as it progresses.

Delivery address: ${address}

Thank you for choosing JHAIRS!
  `;

  return sendEmail({
    to: order.customer.email,
    subject,
    htmlContent,
    textContent,
  });
};

// ============================================
// ADMIN NEW ORDER NOTIFICATION
// ============================================

const sendAdminNotification = async (order) => {
  const orderNumber = escapeHtml(order.orderNumber);

  const customerName = escapeHtml(
    `${order.customer.firstName} ${order.customer.lastName}`
  );

  const address = formatAddress(order.deliveryAddress);
  const itemsHtml = buildOrderItems(order.items);

  const subject = `JHAIRS — New Paid Order ${order.orderNumber}`;

  const inventoryWarning = order.inventoryCommitted
    ? ""
    : `
      <p style="background:#fff0e6;padding:12px;color:#9a4b16;">
        <strong>Attention:</strong> Payment succeeded, but inventory
        requires administrative review.
      </p>
    `;

  const htmlContent = `
    <div style="font-family:Arial,sans-serif;color:#40313a;max-width:650px;margin:auto;line-height:1.6;">
      <div style="background:#f8e8ef;padding:25px;">
        <h1 style="color:#8c526b;margin:0;">JHAIRS ADMIN</h1>
        <p>A new customer payment has been confirmed.</p>
      </div>

      <div style="padding:25px;">
        <h2>New Paid Order</h2>

        <p><strong>Order number:</strong> ${orderNumber}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${escapeHtml(order.customer.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(order.customer.phone)}</p>
        <p><strong>Payment reference:</strong> ${escapeHtml(order.paymentReference)}</p>
        <p><strong>Payment status:</strong> PAID</p>

        ${inventoryWarning}

        <h3>Purchased Products</h3>

        <table style="width:100%;border-collapse:collapse;">
          ${itemsHtml}
        </table>

        <p><strong>Subtotal:</strong> ${formatPrice(order.subtotal)}</p>
        <p><strong>Delivery fee:</strong> ${formatPrice(order.deliveryFee)}</p>
        <h3>Total: ${formatPrice(order.total)}</h3>

        <h3>Delivery Information</h3>
        <p>${address}</p>
        <p><strong>Delivery method:</strong> ${escapeHtml(order.deliveryMethod)}</p>
        <p><strong>Customer notes:</strong> ${escapeHtml(order.notes || "None")}</p>
      </div>
    </div>
  `;

  const textContent = `
New paid JHAIRS order!

Order: ${order.orderNumber}
Customer: ${order.customer.firstName} ${order.customer.lastName}
Email: ${order.customer.email}
Phone: ${order.customer.phone}
Payment reference: ${order.paymentReference}
Total: ${formatPrice(order.total)}

Delivery address: ${address}
Delivery method: ${order.deliveryMethod}
Customer notes: ${order.notes || "None"}

Inventory committed: ${order.inventoryCommitted ? "Yes" : "No"}
  `;

  return sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject,
    htmlContent,
    textContent,
  });
};

// ============================================
// CUSTOMER OUT-FOR-DELIVERY NOTIFICATION
// ============================================

const sendDeliveryNotification = async (order) => {
  const customerName = escapeHtml(
    `${order.customer.firstName} ${order.customer.lastName}`
  );

  const orderNumber = escapeHtml(order.orderNumber);
  const itemsHtml = buildOrderItems(order.items);
  const address = formatAddress(order.deliveryAddress);

  const subject = `JHAIRS — Your Order ${order.orderNumber} Is Out for Delivery!`;

  const htmlContent = `
    <div style="font-family:Arial,sans-serif;color:#40313a;max-width:650px;margin:auto;line-height:1.6;">
      <div style="background:#f8e8ef;padding:30px;text-align:center;">
        <h1 style="color:#8c526b;margin:0;">JHAIRS</h1>
        <p style="margin-bottom:0;">Luxury Hair. Timeless Beauty.</p>
      </div>

      <div style="padding:30px 20px;">
        <h2>Hello ${customerName},</h2>

        <h2 style="color:#8c526b;">
          Your order is out for delivery! 💗
        </h2>

        <p>
          Good news! Your JHAIRS order has been dispatched
          and is now on its way to you.
        </p>

        <p>
          Please keep your phone available so our delivery
          team can contact you if necessary.
        </p>

        <h3 style="color:#8c526b;">Delivery Details</h3>

        <p><strong>Order number:</strong> ${orderNumber}</p>
        <p><strong>Delivery address:</strong> ${address}</p>

        <h3 style="color:#8c526b;">Your Order</h3>

        <table style="width:100%;border-collapse:collapse;">
          ${itemsHtml}
        </table>

        <p>
          If you need assistance with your delivery,
          please contact our support team.
        </p>

        <p>
          <a
            href="https://wa.me/2349136466679"
            style="display:inline-block;background:#8c526b;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;"
          >
            Contact JHAIRS on WhatsApp
          </a>
        </p>

        <p>
          Thank you for choosing JHAIRS.
          We hope you love your purchase!
        </p>
      </div>

      <div style="background:#f8e8ef;padding:20px;text-align:center;">
        <p style="margin:0;">With love, JHAIRS 💗</p>
      </div>
    </div>
  `;

  const textContent = `
Hello ${order.customer.firstName},

Good news! Your JHAIRS order is now out for delivery.

Order number: ${order.orderNumber}
Delivery address: ${address}

Please keep your phone available so our delivery team
can contact you if necessary.

Need assistance?
WhatsApp: https://wa.me/2349136466679
Email: agujoan86@gmail.com

Thank you for choosing JHAIRS!
  `;

  return sendEmail({
    to: order.customer.email,
    subject,
    htmlContent,
    textContent,
  });
};

// ============================================
// EXPORT INDIVIDUAL EMAIL FUNCTIONS
// ============================================

// Each email can be retried independently.
export const sendCustomerOrderEmail = async (order) => {
  return sendCustomerConfirmation(order);
};

export const sendAdminOrderEmail = async (order) => {
  return sendAdminNotification(order);
};

export const sendDeliveryNotificationEmail = async (order) => {
  return sendDeliveryNotification(order);
};
