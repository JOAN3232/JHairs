
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

/**
 * JHAIRS — ADMIN AUTHENTICATION MIDDLEWARE
 *
 * Protects private administrator endpoints.
 *
 * Checks:
 * 1. A Bearer token was provided.
 * 2. The token has a valid signature.
 * 3. The admin account still exists.
 * 4. The admin account is active.
 *
 * The client cannot gain admin access just
 * by changing a frontend role or URL.
 */

  async function requireAdmin(req, res, next) {
  try {
    // Read the Authorization header.
    const authorization = req.headers.authorization;

    // Require the standard Bearer token format.
    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Administrator authentication required.",
      });
    }

    // Extract the token from the header.
    const token = authorization.slice(7).trim();

    // Make sure our signing secret is configured.
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    // Verify the signature, expiry and algorithm.
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
        issuer: "jhairs-api",
        audience: "jhairs-admin",
      }
    );

    // Check that this token belongs to an admin.
    if (
      payload.role !== "ADMIN" ||
      !payload.sub
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid administrator session.",
      });
    }

    // Check the latest admin status in MongoDB.
    // This prevents deleted or disabled admins
    // from continuing to access private APIs.
    const admin = await Admin.findById(payload.sub);

    if (!admin || !admin.isActive || admin.role !== "ADMIN") {
      return res.status(401).json({
        success: false,
        message: "Administrator session is no longer valid.",
      });
    }

    // Attach authenticated admin information
    // for the protected route to use.
    req.admin = admin;

    // Continue to the protected endpoint.
    return next();
  } catch (error) {
    // Invalid and expired JWTs are normal auth errors.
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired administrator session.",
      });
    }

    // Unexpected problems should not expose secrets.
    console.error("JHAIRS admin authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to authenticate administrator.",
    });
  }
}
// Named export used by adminAuthRoutes.js.
export { requireAdmin };

// Default export used by productRoutes.js.
export default requireAdmin;
