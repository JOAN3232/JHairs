
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";

/**
 * JHAIRS — ADMIN LOGIN PAGE
 *
 * This page:
 * - Collects admin email and password.
 * - Sends them to our protected backend.
 * - Saves the returned token in React memory
 *   through the onLogin callback.
 * - Redirects to the admin dashboard.
 *
 * No customer registration is required.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

function AdminLogin({ onLogin }) {
  // Navigate after a successful login.
  const navigate = useNavigate();

  // Login form inputs.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Show or hide the entered password.
  const [showPassword, setShowPassword] = useState(false);

  // Request state and error handling.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ===========================================
  // ADMIN LOGIN REQUEST
  // ===========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      // Send admin credentials to our Express API.
      const response = await fetch(
        `${API_BASE_URL}/api/admin/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      // Reject unsuccessful login attempts.
      if (!response.ok || !data.success || !data.token) {
        throw new Error(
          data.message || "Unable to sign in."
        );
      }

      // Store session details in App's memory.
      // The token is NOT saved in localStorage.
      onLogin({
        token: data.token,
        admin: data.admin,
      });

      // Enter the admin dashboard.
      navigate("/admin/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      console.error(
        "JHAIRS admin login failed:",
        requestError.message
      );

      setError(
        requestError.message ||
          "Unable to connect. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===========================================
  // ADMIN LOGIN DESIGN
  // ===========================================

  return (
    <main
      className="
        flex min-h-screen items-center
        justify-center bg-[#FFFCFA]
        px-5 py-12 font-body
      "
    >
      <div className="w-full max-w-[460px]">
        {/* Return to the customer website */}
        <Link
          to="/"
          className="
            mb-9 inline-flex items-center
            gap-2 text-sm text-plum/60
            transition-colors hover:text-rose
          "
        >
          <ArrowLeft size={17} />
          Back to Store
        </Link>

        {/* Login card */}
        <div
          className="
            rounded-[32px]
            border border-rose/10
            bg-white px-6 py-10
            shadow-[0_20px_70px_rgba(75,46,57,0.07)]
            sm:px-10 sm:py-12
          "
        >
          {/* Brand icon */}
          <div
            className="
              mx-auto flex h-14 w-14
              items-center justify-center
              rounded-full bg-blush/40
              text-rose
            "
          >
            <LockKeyhole
              size={25}
              strokeWidth={1.5}
            />
          </div>

          {/* Brand heading */}
          <div className="mt-6 text-center">
            <p
              className="
                text-[11px] font-medium uppercase
                tracking-[0.22em] text-rose
              "
            >
              JHAIRS Private Access
            </p>

            <h1
              className="
                mt-3 font-heading text-4xl
                font-medium text-plum
                sm:text-5xl
              "
            >
              Welcome Back.
            </h1>

            <p
              className="
                mt-3 text-sm leading-7
                text-plum/60
              "
            >
              Sign in to manage your JHAIRS store.
            </p>
          </div>

          {/* =================================== */}
          {/* ADMIN LOGIN FORM                    */}
          {/* =================================== */}

          <form
            onSubmit={handleSubmit}
            className="mt-9 space-y-5"
          >
            {/* Email field */}
            <div>
              <label
                htmlFor="admin-email"
                className="
                  mb-2 block text-sm
                  font-medium text-plum
                "
              >
                Email Address
              </label>

              <div
                className="
                  flex items-center gap-3
                  rounded-2xl border
                  border-plum/10 bg-ivory
                  px-4 focus-within:border-rose
                "
              >
                <Mail
                  size={18}
                  className="shrink-0 text-rose"
                />

                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Admin email"
                  className="
                    w-full min-w-0 bg-transparent
                    py-4 text-base text-plum
                    outline-none
                    placeholder:text-plum/35
                  "
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="admin-password"
                className="
                  mb-2 block text-sm
                  font-medium text-plum
                "
              >
                Password
              </label>

              <div
                className="
                  flex items-center gap-3
                  rounded-2xl border
                  border-plum/10 bg-ivory
                  px-4 focus-within:border-rose
                "
              >
                <LockKeyhole
                  size={18}
                  className="shrink-0 text-rose"
                />

                <input
                  id="admin-password"
                  type={
                    showPassword ? "text" : "password"
                  }
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  className="
                    w-full min-w-0 bg-transparent
                    py-4 text-base text-plum
                    outline-none
                    placeholder:text-plum/35
                  "
                />

                {/* Toggle password visibility */}
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="shrink-0 text-plum/50 hover:text-rose"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p
                role="alert"
                className="
                  rounded-2xl border
                  border-red-200 bg-red-50
                  px-4 py-3 text-sm
                  leading-6 text-red-700
                "
              >
                {error}
              </p>
            )}

            {/* Sign-in button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                mt-2 flex w-full
                items-center justify-center
                gap-3 rounded-full bg-plum
                px-6 py-4 text-sm
                font-medium text-white
                transition-colors hover:bg-rose
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {isSubmitting
                ? "Signing In..."
                : "Sign In to Dashboard"}

              {!isSubmitting && (
                <ArrowRight size={18} />
              )}
            </button>
          </form>

          {/* Login-only security note */}
          <p
            className="
              mt-8 text-center text-xs
              leading-6 text-plum/45
            "
          >
            Authorised JHAIRS administrators only.
          </p>
        </div>

        {/* Branding */}
        <p
          className="
            mt-8 text-center text-xs
            uppercase tracking-[0.16em]
            text-plum/40
          "
        >
          ✦ Luxury in Every Strand ✦
        </p>
      </div>
    </main>
  );
}

export default AdminLogin;
