
import {
  useCallback,
  useEffect,
  useState,
} from "react";

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

// Existing administrator login and overview.
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminOverview from "./pages/AdminOverview.jsx";

// Existing inventory editor.
// The file remains AdminDashboard.jsx.
import AdminInventory from "./pages/AdminDashboard.jsx";

// Existing product management.
import AdminProducts from "./pages/AdminProducts.jsx";

// NEW — Order Management.
import AdminOrders from "./pages/AdminOrders.jsx";

/**
 * JHAIRS — MAIN APPLICATION
 *
 * CUSTOMER:
 * - Luxury silk loader.
 * - Home, Shop, Collections and Product Details.
 * - Contact, cart drawer and guest checkout.
 *
 * ADMINISTRATOR:
 * - JWT-based login.
 * - Dashboard overview.
 * - Product management.
 * - Inventory management.
 * - NEW: Customer order management.
 *
 * All existing customer and admin routes
 * are preserved.
 */

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
    // Scroll to a section if the URL contains
    // a hash such as /#products.
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
// MINIMAL LUXURY ADMIN NAVIGATION
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

    // NEW — Orders navigation link.
    {
      label: "Orders",
      path: "/admin/orders",
    },
  ];

  return (
    <nav
      aria-label="Administrator navigation"
      className="border-b border-[#F0E5E9] bg-white/95 px-5 py-4 font-body sm:px-10 lg:px-16"
    >
      <div className="mx-auto flex max-w-[1250px] flex-wrap items-center justify-between gap-4">
        {/* Brand identity */}
        <div>
          <p className="font-heading text-2xl text-[#553747]">
            JHAIRS
          </p>

          <p className="text-[10px] uppercase tracking-[0.18em] text-[#B1849B]">
            Administration
          </p>
        </div>

        {/* Protected admin navigation links */}
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

  // Preserve the existing admin token in
  // React memory only.
  const [adminSession, setAdminSession] =
    useState(null);

  // Called after successful administrator login.
  const handleAdminLogin = useCallback((session) => {
    setAdminSession(session);
  }, []);

  // Clear the session when signing out or
  // when the backend rejects an expired JWT.
  const handleAdminLogout = useCallback(() => {
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
    // Never display admin navigation on the
    // public administrator login page.
    const showAdminNavigation =
      Boolean(adminSession) &&
      location.pathname !== "/admin/login";

    return (
      <>
        {showAdminNavigation && (
          <AdminNavigation />
        )}

        <ScrollManager />

        <Routes>
          {/* ===================================
              ADMINISTRATOR LOGIN
             =================================== */}

          <Route
            path="/admin/login"
            element={
              adminSession ? (
                <Navigate
                  to="/admin/dashboard"
                  replace
                />
              ) : (
                <AdminLogin
                  onLogin={handleAdminLogin}
                />
              )
            }
          />

          {/* ===================================
              ADMIN DASHBOARD OVERVIEW
             =================================== */}

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

          {/* ===================================
              PRODUCT MANAGEMENT
             =================================== */}

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

          {/* ===================================
              INVENTORY MANAGEMENT
             =================================== */}

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

          {/* ===================================
              NEW — CUSTOMER ORDER MANAGEMENT
             =================================== */}

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

          {/* ===================================
              DEFAULT ADMIN ADDRESS
             =================================== */}

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

          {/* ===================================
              UNKNOWN ADMIN ADDRESS
             =================================== */}

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
  // EXISTING CUSTOMER WEBSITE
  // ==========================================

  return (
    <>
      {/* Customer navigation and shopping bag */}
      <Navbar />
      <CartDrawer />

      <ScrollManager />

      {/* All customer routes remain unchanged */}
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
          path="*"
          element={<HomePage />}
        />
      </Routes>

      <Footer />
    </>
  );
}

// ============================================
// EXPORT MAIN APPLICATION
// ============================================

export default App;
