
import { useCallback, useEffect, useState } from "react";

import {
  Navigate,
  NavLink,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

// ============================================
// CUSTOMER WEBSITE COMPONENTS
// ============================================

import Loader from "./components/Loader";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Categories from "./components/Categories";
import Products from "./components/Products";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer.jsx";

// ============================================
// CUSTOMER WEBSITE PAGES
// ============================================

import ProductDetails from "./pages/ProductDetails";
import Shop from "./pages/Shop";
import Checkout from "./pages/Checkout.jsx";
import Collections from "./pages/Collections.jsx";
import Contact from "./pages/Contact.jsx";

// ============================================
// ADMINISTRATOR PAGES
// ============================================

import AdminLogin from "./pages/AdminLogin.jsx";
import AdminOverview from "./pages/AdminOverview.jsx";
import AdminInventory from "./pages/AdminDashboard.jsx";
import AdminProducts from "./pages/AdminProducts.jsx";
import AdminOrders from "./pages/AdminOrders.jsx";
import PaymentReturn from "./pages/PaymentReturn.jsx";

// ============================================
// WHATSAPP SUPPORT BUTTON
// ============================================

function WhatsAppButton() {
  // JHAIRS customer support WhatsApp number.
  const whatsappNumber = "2349136466679";

  // Default message displayed when a customer opens WhatsApp.
  const message =
    "Hello JHAIRS! I'd love to make an enquiry about your hair collections.";

  // Build the WhatsApp chat URL.
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with JHAIRS on WhatsApp"
      className="
        fixed bottom-6 right-5 z-[100]
        flex h-14 w-14 items-center justify-center
        rounded-full bg-[#25D366] text-white
        shadow-xl transition-all duration-300
        hover:scale-110 hover:shadow-2xl
        sm:bottom-8 sm:right-8
      "
    >
      {/* WhatsApp icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3a8.5 8.5 0 0 1 8.5 8.5Z" />
      </svg>

      {/* Small notification indicator */}
      <span
        className="
          absolute right-0 top-0
          h-3.5 w-3.5 rounded-full
          border-2 border-white bg-[#16A34A]
        "
      />
    </a>
  );
}

// ============================================
// HOMEPAGE
// ============================================

function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <Products />
    </>
  );
}

// ============================================
// PAGE SCROLL HANDLING
// ============================================

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    // Scroll to a section if the URL contains a hash.
    if (location.hash) {
      const frame = requestAnimationFrame(() => {
        const target = document.getElementById(
          location.hash.slice(1)
        );

        target?.scrollIntoView({
          behavior: "smooth",
        });
      });

      return () => cancelAnimationFrame(frame);
    }

    // Scroll to the top when switching pages.
    window.scrollTo(0, 0);
  }, [
    location.pathname,
    location.search,
    location.hash,
  ]);

  return null;
}

// ============================================
// ADMINISTRATOR NAVIGATION
// ============================================

function AdminNavigation() {
  // All administrator pages in one navigation.
  const links = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
    },
    {
      label: "Products",
      path: "/admin/products",
    },
    {
      label: "Inventory",
      path: "/admin/inventory",
    },
    {
      label: "Orders",
      path: "/admin/orders",
    },
  ];

  return (
    <nav
      aria-label="Administrator navigation"
      className="
        border-b border-[#F0E5E9]
        bg-white/95 px-5 py-4
        font-body sm:px-10 lg:px-16
      "
    >
      <div
        className="
          mx-auto flex max-w-[1250px]
          flex-wrap items-center justify-between gap-4
        "
      >
        {/* Brand identity */}
        <div>
          <p className="font-heading text-2xl text-[#553747]">
            JHAIRS
          </p>

          <p
            className="
              text-[10px] uppercase
              tracking-[0.18em] text-[#B1849B]
            "
          >
            Administration
          </p>
        </div>

        {/* Administrator navigation links */}
        <div className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                [
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-[#553747] text-white"
                    : "text-[#705565] hover:bg-[#F9EDF2]",
                ].join(" ")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ============================================
// MAIN APPLICATION
// ============================================

function App() {
  const location = useLocation();

  // ==========================================
  // EXISTING SILK LOADER
  // ==========================================

  const [isLoading, setIsLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Begin the loader exit animation.
    const exitTimer = setTimeout(() => {
      setIsLeaving(true);
    }, 1800);

    // Finish loading after the animation.
    const finishTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  // ==========================================
  // ADMIN AUTHENTICATION
  // ==========================================

  // Restore the admin session after a page refresh.
  // sessionStorage keeps the session for this tab.
  const [adminSession, setAdminSession] = useState(() => {
    try {
      const savedSession = sessionStorage.getItem(
        "jhairsAdminSession"
      );

      return savedSession ? JSON.parse(savedSession) : null;
    } catch {
      // Remove invalid saved session data.
      sessionStorage.removeItem("jhairsAdminSession");
      return null;
    }
  });

  // Save the admin session after successful login.
  const handleAdminLogin = useCallback((session) => {
    try {
      sessionStorage.setItem(
        "jhairsAdminSession",
        JSON.stringify(session)
      );

      setAdminSession(session);
    } catch (error) {
      console.error(
        "Unable to save admin session:",
        error
      );
    }
  }, []);

  // Clear the session when signing out.
  const handleAdminLogout = useCallback(() => {
    sessionStorage.removeItem("jhairsAdminSession");
    setAdminSession(null);
  }, []);

  // ==========================================
  // SHOW EXISTING LOADER
  // ==========================================

  if (isLoading) {
    return <Loader isLeaving={isLeaving} />;
  }

  // ==========================================
  // SEPARATE ADMINISTRATOR ROUTES
  // ==========================================

  const isAdminArea =
    location.pathname === "/admin" ||
    location.pathname.startsWith("/admin/");

  if (isAdminArea) {
    // Never display admin navigation on login.
    const showAdminNavigation =
      Boolean(adminSession) &&
      location.pathname !== "/admin/login";

    return (
      <>
        {showAdminNavigation && <AdminNavigation />}

        <ScrollManager />

        <Routes>
          {/* ADMINISTRATOR LOGIN */}
          <Route
            path="/admin/login"
            element={
              adminSession ? (
                <Navigate
                  to="/admin/dashboard"
                  replace
                />
              ) : (
                <AdminLogin onLogin={handleAdminLogin} />
              )
            }
          />

          {/* ADMIN DASHBOARD OVERVIEW */}
          <Route
            path="/admin/dashboard"
            element={
              adminSession ? (
                <AdminOverview
                  session={adminSession}
                  onLogout={handleAdminLogout}
                />
              ) : (
                <Navigate
                  to="/admin/login"
                  replace
                />
              )
            }
          />

          {/* PRODUCT MANAGEMENT */}
          <Route
            path="/admin/products"
            element={
              adminSession ? (
                <AdminProducts
                  session={adminSession}
                  onLogout={handleAdminLogout}
                />
              ) : (
                <Navigate
                  to="/admin/login"
                  replace
                />
              )
            }
          />

          {/* INVENTORY MANAGEMENT */}
          <Route
            path="/admin/inventory"
            element={
              adminSession ? (
                <AdminInventory
                  session={adminSession}
                  onLogout={handleAdminLogout}
                />
              ) : (
                <Navigate
                  to="/admin/login"
                  replace
                />
              )
            }
          />

          {/* CUSTOMER ORDER MANAGEMENT */}
          <Route
            path="/admin/orders"
            element={
              adminSession ? (
                <AdminOrders
                  session={adminSession}
                  onLogout={handleAdminLogout}
                />
              ) : (
                <Navigate
                  to="/admin/login"
                  replace
                />
              )
            }
          />

          {/* DEFAULT ADMIN ADDRESS */}
          <Route
            path="/admin"
            element={
              <Navigate
                to={
                  adminSession
                    ? "/admin/dashboard"
                    : "/admin/login"
                }
                replace
              />
            }
          />

          {/* UNKNOWN ADMIN ADDRESS */}
          <Route
            path="*"
            element={
              <Navigate
                to={
                  adminSession
                    ? "/admin/dashboard"
                    : "/admin/login"
                }
                replace
              />
            }
          />
        </Routes>
      </>
    );
  }

  // ==========================================
  // CUSTOMER WEBSITE
  // ==========================================

  return (
    <>
      {/* Customer navigation and shopping bag */}
      <Navbar />
      <CartDrawer />

      {/* Floating WhatsApp customer support */}
      <WhatsAppButton />

      <ScrollManager />

      {/* Customer website routes */}
      <Routes>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/shop"
          element={<Shop />}
        />

        <Route
          path="/products/:id"
          element={<ProductDetails />}
        />

        <Route
          path="/checkout"
          element={<Checkout />}
        />

        <Route
          path="/collections"
          element={<Collections />}
        />

        <Route
          path="/contact"
          element={<Contact />}
        />

        <Route
          path="/payment/verify"
          element={<PaymentReturn />}
        />

        <Route
          path="*"
          element={<HomePage />}
        />
      </Routes>

      {/* Customer website footer */}
      <Footer />
    </>
  );
}

// ============================================
// EXPORT MAIN APPLICATION
// ============================================

export default App;
