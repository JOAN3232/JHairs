import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  ArrowRight,
  Boxes,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Package,
  ShieldCheck,
  ShoppingBag,
  TriangleAlert,
} from "lucide-react";

/**
 * JHAIRS — ADMIN OVERVIEW
 *
 * DESIGN:
 * - Minimal luxury aesthetic.
 * - Ivory background with subtle blush accents.
 * - Compact cards and elegant plum typography.
 * - Clean, professional dashboard layout.
 *
 * FEATURES:
 * - Verifies admin authentication.
 * - Retrieves real inventory from MongoDB.
 * - Displays inventory statistics.
 * - Displays product stock summaries.
 * - Links to the separate Inventory page.
 * - Supports administrator logout.
 */

// ============================================
// API CONFIGURATION
// ============================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// ============================================
// STATISTICS CARD
// ============================================

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div
      className="
        rounded-[22px]
        border border-[#F0E5E9]
        bg-white p-6
        shadow-[0_8px_26px_rgba(84,55,70,0.035)]
        transition-shadow duration-300
        hover:shadow-[0_12px_30px_rgba(84,55,70,0.075)]
      "
    >
      {/* Subtle icon background */}
      <div
        className="
          flex h-11 w-11
          items-center justify-center
          rounded-xl bg-[#F8EDF2]
          text-[#A6758D]
        "
      >
        <Icon size={20} strokeWidth={1.6} />
      </div>

      {/* Statistic */}
      <p
        className="
          mt-6 text-sm
          font-medium text-[#8A7881]
        "
      >
        {title}
      </p>

      <h3
        className="
          mt-2 font-heading
          text-4xl text-[#553747]
        "
      >
        {Number(value).toLocaleString()}
      </h3>

      <p
        className="
          mt-2 text-xs
          leading-6 text-[#A3959B]
        "
      >
        {description}
      </p>
    </div>
  );
}

// ============================================
// MANAGEMENT CARD
// ============================================

function ManagementCard({ icon: Icon, title, description, available, link }) {
  return (
    <div
      className="
        rounded-[24px]
        border border-[#F0E5E9]
        bg-white p-7
        shadow-[0_8px_26px_rgba(84,55,70,0.035)]
      "
    >
      {/* Feature icon */}
      <div
        className="
          flex h-12 w-12
          items-center justify-center
          rounded-xl bg-[#F8EDF2]
          text-[#A6758D]
        "
      >
        <Icon size={23} strokeWidth={1.6} />
      </div>

      {/* Feature information */}
      <h3
        className="
          mt-6 font-heading
          text-[27px] text-[#553747]
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-3 text-sm leading-7
          text-[#917F87]
        "
      >
        {description}
      </p>

      {/* Link only to implemented features */}
      {available ? (
        <Link
          to={link}
          className="
            mt-6 inline-flex
            items-center gap-2
            text-xs font-semibold
            uppercase tracking-[0.1em]
            text-[#A6758D]
            transition-colors
            hover:text-[#553747]
          "
        >
          {title === "Products"
            ? "Manage Products"
            : title === "Orders"
              ? "View Orders"
              : "Manage Stock"}

          <ArrowRight size={15} />
        </Link>
      ) : (
        <p
          className="
            mt-6 text-xs font-medium
            uppercase tracking-[0.1em]
            text-[#B6A7AE]
          "
        >
          Coming Soon
        </p>
      )}
    </div>
  );
}

// ============================================
// MAIN ADMIN OVERVIEW
// ============================================

function AdminOverview({ session, onLogout }) {
  // ==========================================
  // DASHBOARD DATA
  // ==========================================

  const [pageState, setPageState] = useState({
    status: "loading",
    products: [],
    error: "",
  });

  // ==========================================
  // VERIFY ADMIN AND FETCH INVENTORY
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        // Verify that the current JWT is valid.
        const authResponse = await fetch(`${API_BASE_URL}/api/admin/me`, {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
          signal: controller.signal,
        });

        // An expired session must sign in again.
        if (authResponse.status === 401) {
          if (!controller.signal.aborted) {
            onLogout();
          }
          return;
        }

        if (!authResponse.ok) {
          throw new Error("Unable to verify your admin session.");
        }

        const authData = await authResponse.json();

        if (!authData.success) {
          throw new Error("Administrator verification failed.");
        }

        // Retrieve actual inventory from MongoDB.
        const inventoryResponse = await fetch(
          `${API_BASE_URL}/api/products/admin/inventory`,
          {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
            signal: controller.signal,
          },
        );

        if (inventoryResponse.status === 401) {
          if (!controller.signal.aborted) {
            onLogout();
          }
          return;
        }

        const inventoryData = await inventoryResponse.json();

        if (
          !inventoryResponse.ok ||
          !inventoryData.success ||
          !Array.isArray(inventoryData.products)
        ) {
          throw new Error(
            inventoryData.message || "Unable to retrieve inventory.",
          );
        }

        // Store the products returned by our API.
        if (!controller.signal.aborted) {
          setPageState({
            status: "ready",
            products: inventoryData.products,
            error: "",
          });
        }
      } catch (error) {
        if (controller.signal.aborted || error.name === "AbortError") {
          return;
        }

        setPageState({
          status: "error",
          products: [],
          error: error.message || "Unable to load the dashboard.",
        });
      }
    }

    loadDashboard();

    // Cancel unfinished requests on navigation.
    return () => controller.abort();
  }, [session.token, onLogout]);

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (pageState.status === "loading") {
    return (
      <main
        className="
          flex min-h-screen
          items-center justify-center
          bg-[#FFFCFA] font-body
        "
      >
        <div
          className="
            flex items-center gap-3
            text-sm text-[#917F87]
          "
        >
          <LoaderCircle size={20} className="animate-spin" />
          Loading JHAIRS Dashboard...
        </div>
      </main>
    );
  }

  // ==========================================
  // ERROR SCREEN
  // ==========================================

  if (pageState.status === "error") {
    return (
      <main
        className="
          flex min-h-screen flex-col
          items-center justify-center
          gap-5 bg-[#FFFCFA]
          px-5 text-center font-body
        "
      >
        <TriangleAlert size={27} className="text-[#A6758D]" />

        <h1
          className="
            font-heading text-3xl
            text-[#553747]
          "
        >
          Dashboard Unavailable
        </h1>

        <p
          className="
            max-w-sm text-sm
            leading-7 text-[#917F87]
          "
        >
          {pageState.error}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="
            rounded-full bg-[#553747]
            px-6 py-3 text-sm text-white
            hover:bg-[#80566B]
          "
        >
          Try Again
        </button>
      </main>
    );
  }

  // ==========================================
  // CALCULATE INVENTORY STATISTICS
  // ==========================================

  const products = pageState.products;

  // Include both active and inactive products.
  const totalProducts = products.length;

  // Gather already-configured inventory records.
  const variations = products.flatMap((product) => product.inventory || []);

  // Total quantity across configured variations.
  const totalStock = variations.reduce((total, item) => total + item.stock, 0);

  // Count variations with 1 to 4 units.
  const lowStock = variations.filter(
    (item) => item.stock > 0 && item.stock < 5,
  ).length;

  // Count configured variations with no units.
  const outOfStock = variations.filter((item) => item.stock === 0).length;

  // Count configured inventory combinations.
  const configuredVariations = variations.length;

  // ==========================================
  // STATISTICS CONFIGURATION
  // ==========================================

  const statistics = [
    {
      title: "Total Products",
      value: totalProducts,
      description: "Products in your catalogue",
      icon: Package,
    },
    {
      title: "Available Stock",
      value: totalStock,
      description: "Units in configured variations",
      icon: Boxes,
    },
    {
      title: "Low Stock",
      value: lowStock,
      description: "Variations with 1–4 units",
      icon: TriangleAlert,
    },
    {
      title: "Out of Stock",
      value: outOfStock,
      description: "Configured variations with 0 units",
      icon: ShoppingBag,
    },
  ];

  // ==========================================
  // MAIN PAGE DESIGN
  // ==========================================

  return (
    <main
      className="
        min-h-screen
        bg-[#FFFCFA]
        font-body
      "
    >
      <div
        className="
          mx-auto max-w-[1250px]
          px-5 py-8
          sm:px-10 lg:px-12
        "
      >
        {/* ================================= */}
        {/* PAGE HEADER                       */}
        {/* ================================= */}

        <header
          className="
            flex flex-wrap
            items-center justify-between
            gap-5 border-b
            border-[#F0E5E9] pb-7
          "
        >
          <div>
            <p
              className="
                text-[11px] font-semibold
                uppercase tracking-[0.18em]
                text-[#B1849B]
              "
            >
              JHAIRS Administration
            </p>

            <h1
              className="
                mt-2 font-heading
                text-3xl text-[#553747]
                sm:text-4xl
              "
            >
              Store Dashboard
            </h1>
          </div>

          {/* Administrator logout */}
          <button
            type="button"
            onClick={onLogout}
            className="
              inline-flex items-center
              gap-2 rounded-full
              border border-[#EADCE2]
              bg-white px-5 py-3
              text-sm text-[#705565]
              transition-colors
              hover:border-[#CFA7B9]
              hover:bg-[#FFF5F8]
            "
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </header>

        {/* ================================= */}
        {/* WELCOME SECTION                   */}
        {/* ================================= */}

        <section className="pt-10">
          <div
            className="
              rounded-[26px]
              border border-[#F0DCE6]
              bg-[#F9EDF2]
              p-7 sm:p-9
            "
          >
            <div
              className="
                flex h-11 w-11
                items-center justify-center
                rounded-xl bg-white
                text-[#A6758D]
              "
            >
              <LayoutDashboard size={21} />
            </div>

            <h2
              className="
                mt-5 font-heading
                text-3xl text-[#553747]
                sm:text-4xl
              "
            >
              Welcome back, {session.admin?.name || "Administrator"}.
            </h2>

            <p
              className="
                mt-3 max-w-[580px]
                text-sm leading-7
                text-[#856F7B]
              "
            >
              Here's a quick look at your JHAIRS collection. Manage your stock
              and keep everything organised in one place.
            </p>

            <p
              className="
                mt-5 inline-flex
                items-center gap-2
                text-xs text-[#99798A]
              "
            >
              <ShieldCheck size={16} />
              Authenticated Administrator
            </p>
          </div>
        </section>

        {/* ================================= */}
        {/* INVENTORY OVERVIEW                */}
        {/* ================================= */}

        <section className="pt-12">
          <div
            className="
              flex flex-wrap items-end
              justify-between gap-4
            "
          >
            <div>
              <p
                className="
                  text-[11px] font-semibold
                  uppercase tracking-[0.16em]
                  text-[#B1849B]
                "
              >
                Store Statistics
              </p>

              <h2
                className="
                  mt-2 font-heading
                  text-2xl text-[#553747]
                  sm:text-3xl
                "
              >
                Inventory Overview
              </h2>
            </div>

            <Link
              to="/admin/inventory"
              className="
                inline-flex items-center
                gap-2 text-sm font-medium
                text-[#A6758D]
                hover:text-[#553747]
              "
            >
              Manage Inventory
              <ArrowRight size={17} />
            </Link>
          </div>

          {/* Statistics */}
          <div
            className="
              mt-7 grid grid-cols-1
              gap-5 sm:grid-cols-2
              lg:grid-cols-4
            "
          >
            {statistics.map((item) => (
              <StatCard key={item.title} {...item} />
            ))}
          </div>

          <p
            className="
              mt-4 text-xs
              leading-6 text-[#A3959B]
            "
          >
            Counts include active and inactive products. Unconfigured variations
            are not included in stock alerts.
          </p>
        </section>

        {/* ================================= */}
        {/* STORE MANAGEMENT                  */}
        {/* ================================= */}

        <section className="pt-14">
          <div>
            <p
              className="
                text-[11px] font-semibold
                uppercase tracking-[0.16em]
                text-[#B1849B]
              "
            >
              Admin Tools
            </p>

            <h2
              className="
                mt-2 font-heading
                text-2xl text-[#553747]
                sm:text-3xl
              "
            >
              Store Management
            </h2>
          </div>

          <div
            className="
              mt-7 grid grid-cols-1
              gap-5 md:grid-cols-3
            "
          >
            {/* Open the new Product Management page. */}
            <ManagementCard
              icon={Package}
              title="Products"
              description="Add new hair products and manage your JHAIRS collection."
              available={true}
              link="/admin/products"
            />

            <ManagementCard
              icon={Boxes}
              title="Inventory"
              description="Update available stock for each hair variation."
              available={true}
              link="/admin/inventory"
            />

            {/* ==========================================
    ORDER MANAGEMENT
    Opens our protected customer orders page.
   ========================================== */}

            <ManagementCard
              icon={ShoppingBag}
              title="Orders"
              description="View customer orders, check payment status, and track fulfilment."
              available={true}
              link="/admin/orders"
            />
          </div>
        </section>

        {/* ================================= */}
        {/* PRODUCT STOCK SUMMARY             */}
        {/* ================================= */}

        <section className="pb-16 pt-14">
          <div
            className="
              flex flex-wrap items-end
              justify-between gap-4
            "
          >
            <div>
              <p
                className="
                  text-[11px] font-semibold
                  uppercase tracking-[0.16em]
                  text-[#B1849B]
                "
              >
                Your Collection
              </p>

              <h2
                className="
                  mt-2 font-heading
                  text-2xl text-[#553747]
                  sm:text-3xl
                "
              >
                Product Stock Summary
              </h2>
            </div>

            <span
              className="
                text-xs text-[#A3959B]
              "
            >
              {configuredVariations} configured variations
            </span>
          </div>

          {/* Product stock cards */}
          <div
            className="
              mt-7 grid grid-cols-1
              gap-5 md:grid-cols-2
            "
          >
            {products.map((product) => {
              // Existing variation records.
              const inventory = product.inventory || [];

              // Sum available stock for this product.
              const productStock = inventory.reduce(
                (total, item) => total + item.stock,
                0,
              );

              return (
                <div
                  key={product._id}
                  className="
                    flex items-center gap-5
                    rounded-[22px]
                    border border-[#F0E5E9]
                    bg-white p-5
                    shadow-[0_8px_26px_rgba(84,55,70,0.03)]
                  "
                >
                  {/* Product image */}
                  <div
                    className="
                      h-24 w-24 shrink-0
                      overflow-hidden
                      rounded-xl bg-[#FBF3F6]
                    "
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="
                        h-full w-full
                        object-contain p-2
                      "
                    />
                  </div>

                  {/* Product details */}
                  <div className="min-w-0 flex-1">
                    <h3
                      className="
                        font-heading text-xl
                        text-[#553747]
                      "
                    >
                      {product.name}
                    </h3>

                    <p
                      className="
                        mt-1 text-xs
                        text-[#A3959B]
                      "
                    >
                      {inventory.length} configured variations
                    </p>

                    <p
                      className="
                        mt-2 text-sm
                        font-medium text-[#705565]
                      "
                    >
                      {productStock} units in stock
                    </p>

                    {!product.isActive && (
                      <p
                        className="
                          mt-1 text-xs
                          text-[#A6758D]
                        "
                      >
                        Inactive product
                      </p>
                    )}

                    {/* Navigate to stock editor */}
                    <Link
                      to="/admin/inventory"
                      className="
                        mt-2 inline-flex
                        items-center gap-1
                        text-xs font-medium
                        text-[#A6758D]
                        hover:text-[#553747]
                      "
                    >
                      Manage Stock
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* No products in MongoDB */}
          {products.length === 0 && (
            <p
              className="
                mt-6 rounded-[22px]
                border border-[#F0E5E9]
                bg-white p-6 text-sm
                text-[#917F87]
              "
            >
              There are no products in your catalogue yet.
            </p>
          )}
        </section>

        {/* ================================= */}
        {/* SUBTLE BRAND FOOTER                */}
        {/* ================================= */}

        <div
          className="
            flex flex-wrap items-center
            justify-between gap-3
            border-t border-[#F0E5E9]
            py-7
          "
        >
          <p
            className="
              font-heading text-xl
              text-[#553747]
            "
          >
            JHAIRS.
          </p>

          <p
            className="
              text-[10px] uppercase
              tracking-[0.16em]
              text-[#AD939F]
            "
          >
            Luxury in Every Strand
          </p>
        </div>
      </div>
    </main>
  );
}

export default AdminOverview;
