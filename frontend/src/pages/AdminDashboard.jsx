
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  LogOut,
  Package,
  RefreshCw,
  Save,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

/**
 * JHAIRS — INVENTORY MANAGEMENT
 *
 * DESIGN:
 * - Minimal luxury styling.
 * - Soft ivory background.
 * - Subtle blush accents.
 * - Elegant product and inventory cards.
 * - Responsive desktop and mobile layouts.
 *
 * FUNCTIONALITY:
 * - Verify administrator JWT.
 * - Retrieve actual products from MongoDB.
 * - Select product variations.
 * - View and update exact variation stock.
 * - Quickly edit saved variations.
 * - Refresh inventory.
 * - Sign out.
 *
 * No customer orders or stock deductions
 * are performed by this page.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

// ============================================
// HELPER — EXACT VARIATION IDENTIFIER
// ============================================

function variationKey(variation) {
  return JSON.stringify([
    variation.color,
    Number(variation.length),
    variation.density || "",
    variation.laceType || "",
  ]);
}

// ============================================
// HELPER — HUMAN-READABLE VARIATION
// ============================================

function variationLabel(variation) {
  return [
    variation.color,
    `${variation.length}"`,
    variation.density,
    variation.laceType,
  ]
    .filter(Boolean)
    .join(" · ");
}

// ============================================
// HELPER — READ API RESPONSES
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
// REUSABLE FORM FIELD
// ============================================

function SelectField({
  label,
  id,
  value,
  options,
  onChange,
  disabled,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-[#654A58]"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        disabled={disabled}
        className="
          w-full rounded-xl
          border border-[#EBDDE4]
          bg-[#FFFCFA] px-4 py-3.5
          text-sm text-[#553747]
          outline-none transition-colors
          focus:border-[#BB8CA3]
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      >
        {options.map((option) => (
          <option
            key={String(option.value)}
            value={String(option.value)}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================
// MAIN INVENTORY PAGE
// ============================================

function AdminDashboard({ session, onLogout }) {
  // ==========================================
  // SERVER DATA
  // ==========================================

  const [pageState, setPageState] = useState({
    status: "loading",
    products: [],
    error: "",
  });

  // ==========================================
  // SELECTION STATE
  // ==========================================

  const [productId, setProductId] = useState("");

  const [options, setOptions] = useState({
    color: "",
    length: "",
    density: "",
    laceType: "",
  });

  // Store a draft for one variation at a time.
  const [stockDraft, setStockDraft] = useState({
    key: "",
    value: "",
  });

  // ==========================================
  // SAVE STATE
  // ==========================================

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // Identify the variation for which a message
  // should be displayed.
  const [messageKey, setMessageKey] = useState("");

  // Prevent refresh requests from overlapping.
  const refreshController = useRef(null);

  // ==========================================
  // VERIFY LOGIN AND LOAD INVENTORY
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    async function initialiseInventory() {
      try {
        // 1. Verify the admin's authentication token.
        const authResponse = await fetch(
          `${API_BASE_URL}/api/admin/me`,
          {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
            signal: controller.signal,
          }
        );

        if (authResponse.status === 401) {
          if (!controller.signal.aborted) onLogout();
          return;
        }

        await readResponse(authResponse);

        // 2. Load the protected inventory data.
        const inventoryResponse = await fetch(
          `${API_BASE_URL}/api/products/admin/inventory`,
          {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
            signal: controller.signal,
          }
        );

        if (inventoryResponse.status === 401) {
          if (!controller.signal.aborted) onLogout();
          return;
        }

        const data = await readResponse(
          inventoryResponse
        );

        if (!controller.signal.aborted) {
          setPageState({
            status: "ready",
            products: Array.isArray(data.products)
              ? data.products
              : [],
            error: "",
          });
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          error.name === "AbortError"
        ) {
          return;
        }

        setPageState({
          status: "error",
          products: [],
          error: error.message,
        });
      }
    }

    initialiseInventory();

    return () => controller.abort();
  }, [session.token, onLogout]);

  // ==========================================
  // CANCEL REFRESH WHEN LEAVING
  // ==========================================

  useEffect(() => {
    return () => {
      refreshController.current?.abort();
    };
  }, []);

  // ==========================================
  // REFRESH INVENTORY
  // ==========================================

  const handleRefresh = useCallback(async () => {
    if (isSaving) return;

    refreshController.current?.abort();

    const controller = new AbortController();
    refreshController.current = controller;

    setPageState((previous) => ({
      ...previous,
      status: "refreshing",
      error: "",
    }));

    setSaveError("");
    setSaveSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/products/admin/inventory`,
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
          signal: controller.signal,
        }
      );

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await readResponse(response);

      if (controller.signal.aborted) return;

      setPageState({
        status: "ready",
        products: Array.isArray(data.products)
          ? data.products
          : [],
        error: "",
      });

      // Clear unsaved draft values after refresh.
      setStockDraft({
        key: "",
        value: "",
      });
    } catch (error) {
      if (
        controller.signal.aborted ||
        error.name === "AbortError"
      ) {
        return;
      }

      setPageState((previous) => ({
        ...previous,
        status: "ready",
        error: error.message,
      }));
    }
  }, [session.token, onLogout, isSaving]);

  // ==========================================
  // CURRENT PRODUCT
  // ==========================================

  const products = pageState.products;

  const selectedProduct =
    products.find(
      (product) =>
        String(product.legacyId) === productId
    ) ||
    products[0] ||
    null;

  // ==========================================
  // AVAILABLE PRODUCT OPTIONS
  // ==========================================

  const colors = selectedProduct?.colors || [];
  const lengths = selectedProduct?.lengths || [];
  const densities = selectedProduct?.densities || [];
  const laceTypes = selectedProduct?.laceTypes || [];

  // Derive defaults instead of calling setState
  // inside useEffect.
  const color = colors.some(
    (item) => item.name === options.color
  )
    ? options.color
    : colors[0]?.name || "";

  const length = lengths.some(
    (item) => String(item) === options.length
  )
    ? options.length
    : String(lengths[0] ?? "");

  const density = densities.includes(options.density)
    ? options.density
    : densities[0] || "";

  const laceType = laceTypes.includes(options.laceType)
    ? options.laceType
    : laceTypes[0] || "";

  // ==========================================
  // SELECTED VARIATION AND SAVED STOCK
  // ==========================================

  const currentVariation = {
    color,
    length: Number(length),
    density,
    laceType,
  };

  const currentKey = JSON.stringify([
    selectedProduct?._id || "",
    variationKey(currentVariation),
  ]);

  const existingVariation =
    selectedProduct?.inventory?.find(
      (item) =>
        variationKey(item) ===
        variationKey(currentVariation)
    );

  const savedStock = existingVariation?.stock ?? 0;

  // Display unsaved input only for the variation
  // to which the draft belongs.
  const stock =
    stockDraft.key === currentKey
      ? stockDraft.value
      : String(savedStock);

  // ==========================================
  // PRODUCT AND OPTION CHANGES
  // ==========================================

  const handleProductChange = (newId) => {
    setProductId(newId);

    setOptions({
      color: "",
      length: "",
      density: "",
      laceType: "",
    });

    setStockDraft({ key: "", value: "" });
    setSaveError("");
    setSaveSuccess("");
  };

  const handleOptionChange = (field, value) => {
    setOptions((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSaveError("");
    setSaveSuccess("");
  };

  // ==========================================
  // QUICK EDIT SAVED VARIATION
  // ==========================================

  const handleEditSavedVariation = (item) => {
    // Populate all selectors from the saved entry.
    setOptions({
      color: item.color,
      length: String(item.length),
      density: item.density || "",
      laceType: item.laceType || "",
    });

    // No draft is required: the editor will
    // automatically show the saved stock amount.
    setStockDraft({ key: "", value: "" });

    setSaveError("");
    setSaveSuccess("");

    // Bring the editor into view.
    document
      .getElementById("jhairs-stock-editor")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  // ==========================================
  // SAVE INVENTORY
  // ==========================================

  const handleSaveInventory = async (event) => {
    event.preventDefault();

    if (
      !selectedProduct ||
      isSaving ||
      pageState.status !== "ready"
    ) {
      return;
    }

    setSaveError("");
    setSaveSuccess("");
    setMessageKey(currentKey);

    const stockNumber = Number(stock);

    // Accept only non-negative whole numbers.
    if (
      stock.trim() === "" ||
      !/^\d+$/.test(stock.trim()) ||
      !Number.isSafeInteger(stockNumber)
    ) {
      setSaveError(
        "Please enter a valid whole-number quantity."
      );
      return;
    }

    if (!color || !length) {
      setSaveError(
        "Please select a valid colour and length."
      );
      return;
    }

    const savedProductId = selectedProduct.legacyId;

    const savedVariation = {
      color,
      length: Number(length),
      density,
      laceType,
      stock: stockNumber,
    };

    const savedKey = variationKey(savedVariation);

    setIsSaving(true);

    try {
      // Write stock using our protected backend.
      const response = await fetch(
        `${API_BASE_URL}/api/products/admin/inventory/${savedProductId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify(savedVariation),
        }
      );

      if (response.status === 401) {
        onLogout();
        return;
      }

      await readResponse(response);

      // Update the on-screen inventory after the
      // backend confirms MongoDB saved it.
      setPageState((previous) => ({
        ...previous,
        products: previous.products.map((product) => {
          if (product.legacyId !== savedProductId) {
            return product;
          }

          const inventory = product.inventory || [];

          const index = inventory.findIndex(
            (item) => variationKey(item) === savedKey
          );

          const updatedInventory =
            index >= 0
              ? inventory.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, stock: stockNumber }
                    : item
                )
              : [...inventory, savedVariation];

          return {
            ...product,
            inventory: updatedInventory,
          };
        }),
      }));

      setStockDraft({
        key: "",
        value: "",
      });

      setSaveSuccess(
        "Inventory saved successfully!"
      );
    } catch (error) {
      setSaveError(
        error.status === 409
          ? "This inventory changed elsewhere. Refresh and try again."
          : error.message
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // INITIAL LOADING SCREEN
  // ==========================================

  if (pageState.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFCFA] font-body">
        <div className="flex items-center gap-3 text-sm text-[#917F87]">
          <LoaderCircle
            size={20}
            className="animate-spin"
          />
          Loading Inventory Studio...
        </div>
      </main>
    );
  }

  // ==========================================
  // INITIAL ERROR SCREEN
  // ==========================================

  if (pageState.status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#FFFCFA] px-5 text-center font-body">
        <TriangleAlert
          size={28}
          className="text-[#A6758D]"
        />

        <h1 className="font-heading text-3xl text-[#553747]">
          Inventory Unavailable
        </h1>

        <p className="max-w-sm text-sm text-[#917F87]">
          {pageState.error}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-[#553747] px-6 py-3 text-sm text-white"
        >
          Try Again
        </button>
      </main>
    );
  }

  // ==========================================
  // INVENTORY STATISTICS
  // ==========================================

  const configuredVariations = products.reduce(
    (total, product) =>
      total + (product.inventory?.length || 0),
    0
  );

  const totalStock = products.reduce(
    (total, product) =>
      total +
      (product.inventory || []).reduce(
        (sum, item) => sum + item.stock,
        0
      ),
    0
  );

  const isRefreshing =
    pageState.status === "refreshing";

  const showSuccess =
    saveSuccess && messageKey === currentKey;

  const showError =
    saveError && messageKey === currentKey;

  // ==========================================
  // PAGE DESIGN
  // ==========================================

  return (
    <main className="min-h-screen bg-[#FFFCFA] font-body">
      <div className="mx-auto max-w-[1250px] px-5 py-8 sm:px-10 lg:px-12">

        {/* =================================== */}
        {/* PAGE HEADER                         */}
        {/* =================================== */}

        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#F0E5E9] pb-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B1849B]">
              JHAIRS Administration
            </p>

            <h1 className="mt-2 font-heading text-3xl text-[#553747] sm:text-4xl">
              Inventory Management
            </h1>

            <p className="mt-2 text-sm text-[#917F87]">
              Organise and update your hair stock.
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

        {/* =================================== */}
        {/* BACK TO DASHBOARD                   */}
        {/* =================================== */}

        <div className="pt-7">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[#A6758D] hover:text-[#553747]"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        {/* =================================== */}
        {/* WELCOME PANEL                       */}
        {/* =================================== */}

        <section className="pt-7">
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-[26px] border border-[#F0DCE6] bg-[#F9EDF2] p-7 sm:p-9">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#A6758D]">
                <Boxes size={22} />
              </div>

              <h2 className="mt-5 font-heading text-2xl text-[#553747] sm:text-3xl">
                Your Inventory Studio
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-7 text-[#856F7B]">
                Every length, colour and style — all
                beautifully organised in one place.
              </p>

              <p className="mt-4 inline-flex items-center gap-2 text-xs text-[#99798A]">
                <ShieldCheck size={15} />
                Administrator Only
              </p>
            </div>

            {/* Compact inventory statistics */}
            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
              <div className="min-w-[125px] rounded-2xl border border-white/80 bg-white/80 p-4">
                <p className="text-xs text-[#917F87]">
                  Available Units
                </p>

                <p className="mt-2 font-heading text-3xl text-[#553747]">
                  {totalStock.toLocaleString()}
                </p>
              </div>

              <div className="min-w-[125px] rounded-2xl border border-white/80 bg-white/80 p-4">
                <p className="text-xs text-[#917F87]">
                  Variations
                </p>

                <p className="mt-2 font-heading text-3xl text-[#553747]">
                  {configuredVariations}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================== */}
        {/* INVENTORY SECTION HEADING           */}
        {/* =================================== */}

        <section className="pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B1849B]">
                Stock Control
              </p>

              <h2 className="mt-2 font-heading text-2xl text-[#553747] sm:text-3xl">
                Manage Your Collection
              </h2>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isSaving}
              className="inline-flex items-center gap-2 rounded-full border border-[#EADCE2] bg-white px-5 py-3 text-sm text-[#705565] transition-colors hover:border-[#CFA7B9] hover:bg-[#FFF5F8] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  isRefreshing ? "animate-spin" : ""
                }
              />

              {isRefreshing
                ? "Refreshing..."
                : "Refresh Inventory"}
            </button>
          </div>

          {pageState.error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {pageState.error}
            </div>
          )}

          {/* ================================= */}
          {/* PRODUCT AND STOCK EDITOR          */}
          {/* ================================= */}

          {selectedProduct && (
            <div className="mt-7 grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">

              {/* ============================= */}
              {/* PRODUCT CARD                  */}
              {/* ============================= */}

              <div className="rounded-[24px] border border-[#F0E5E9] bg-white p-6 shadow-[0_8px_26px_rgba(84,55,70,0.035)]">

                <SelectField
                  id="inventory-product"
                  label="Select Product"
                  value={String(selectedProduct.legacyId)}
                  disabled={isSaving || isRefreshing}
                  onChange={handleProductChange}
                  options={products.map((product) => ({
                    value: String(product.legacyId),
                    label: product.name,
                  }))}
                />

                {/* Product photo */}
                <div className="mt-6 flex h-[270px] items-center justify-center overflow-hidden rounded-2xl bg-[#FBF3F6]">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="h-full w-full object-contain p-4"
                  />
                </div>

                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B1849B]">
                  {selectedProduct.category}
                </p>

                <h3 className="mt-2 font-heading text-[28px] text-[#553747]">
                  {selectedProduct.name}
                </h3>

                <div className="mt-5 border-t border-[#F0E5E9] pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[#917F87]">
                      Saved Variations
                    </span>

                    <span className="text-sm font-medium text-[#553747]">
                      {selectedProduct.inventory?.length || 0}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-[#917F87]">
                      Store Visibility
                    </span>

                    <span className="text-xs font-medium text-[#A6758D]">
                      {selectedProduct.isActive
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ============================= */}
              {/* STOCK EDITOR CARD             */}
              {/* ============================= */}

              <div
                id="jhairs-stock-editor"
                className="scroll-mt-24 rounded-[24px] border border-[#F0E5E9] bg-white p-6 shadow-[0_8px_26px_rgba(84,55,70,0.035)] sm:p-8"
              >
                <div className="mb-7 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F8EDF2] text-[#A6758D]">
                    <Package size={21} />
                  </div>

                  <div>
                    <h3 className="font-heading text-[27px] text-[#553747]">
                      Edit Variation Stock
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-[#917F87]">
                      Choose a variation and enter
                      the quantity available.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleSaveInventory}
                  className="space-y-6"
                >
                  {/* Variation selectors */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <SelectField
                      id="inventory-colour"
                      label="Hair Colour"
                      value={color}
                      disabled={isSaving || isRefreshing}
                      onChange={(value) =>
                        handleOptionChange("color", value)
                      }
                      options={colors.map((item) => ({
                        value: item.name,
                        label: item.name,
                      }))}
                    />

                    <SelectField
                      id="inventory-length"
                      label="Hair Length"
                      value={length}
                      disabled={isSaving || isRefreshing}
                      onChange={(value) =>
                        handleOptionChange("length", value)
                      }
                      options={lengths.map((item) => ({
                        value: String(item),
                        label: `${item} inches`,
                      }))}
                    />

                    {densities.length > 0 && (
                      <SelectField
                        id="inventory-density"
                        label="Density"
                        value={density}
                        disabled={isSaving || isRefreshing}
                        onChange={(value) =>
                          handleOptionChange(
                            "density",
                            value
                          )
                        }
                        options={densities.map((item) => ({
                          value: item,
                          label: item,
                        }))}
                      />
                    )}

                    {laceTypes.length > 0 && (
                      <SelectField
                        id="inventory-lace"
                        label="Lace Type"
                        value={laceType}
                        disabled={isSaving || isRefreshing}
                        onChange={(value) =>
                          handleOptionChange(
                            "laceType",
                            value
                          )
                        }
                        options={laceTypes.map((item) => ({
                          value: item,
                          label: item,
                        }))}
                      />
                    )}
                  </div>

                  {/* Saved stock display */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F0E5E9] bg-[#FBF5F7] p-5">
                    <div>
                      <p className="text-xs text-[#917F87]">
                        Current Saved Stock
                      </p>

                      <p className="mt-2 font-heading text-4xl text-[#553747]">
                        {savedStock}
                      </p>
                    </div>

                    <span className="rounded-full border border-[#EADCE2] bg-white px-4 py-2 text-xs text-[#916C80]">
                      {existingVariation
                        ? "Variation Configured"
                        : "Not Configured"}
                    </span>
                  </div>

                  {/* Editable stock quantity */}
                  <div>
                    <label
                      htmlFor="inventory-quantity"
                      className="mb-2 block text-sm font-medium text-[#654A58]"
                    >
                      Available Quantity
                    </label>

                    <input
                      id="inventory-quantity"
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={stock}
                      disabled={isSaving || isRefreshing}
                      onChange={(event) => {
                        setStockDraft({
                          key: currentKey,
                          value: event.target.value,
                        });

                        setSaveError("");
                        setSaveSuccess("");
                      }}
                      className="w-full rounded-xl border border-[#EBDDE4] bg-[#FFFCFA] px-4 py-3.5 text-base text-[#553747] outline-none focus:border-[#BB8CA3]"
                    />

                    <p className="mt-2 text-xs leading-6 text-[#A3959B]">
                      Enter zero if this variation has
                      no available units.
                    </p>
                  </div>

                  {/* Save messages */}
                  {showSuccess && (
                    <p
                      role="status"
                      className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                    >
                      <CheckCircle2 size={17} />
                      {saveSuccess}
                    </p>
                  )}

                  {showError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                      {saveError}
                    </p>
                  )}

                  {/* Save button */}
                  <button
                    type="submit"
                    disabled={
                      isSaving ||
                      isRefreshing ||
                      !color ||
                      !length
                    }
                    className="flex w-full items-center justify-center gap-3 rounded-full bg-[#553747] px-6 py-4 text-sm font-medium text-white transition-colors hover:bg-[#80566B] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? (
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={18} />
                    )}

                    {isSaving
                      ? "Saving Inventory..."
                      : "Save Inventory"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================================= */}
          {/* SAVED VARIATIONS                  */}
          {/* ================================= */}

          {selectedProduct && (
            <div className="mt-8 rounded-[24px] border border-[#F0E5E9] bg-white p-6 shadow-[0_8px_26px_rgba(84,55,70,0.035)] sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B1849B]">
                    Product Inventory
                  </p>

                  <h3 className="mt-2 font-heading text-2xl text-[#553747] sm:text-3xl">
                    Saved Variations
                  </h3>

                  <p className="mt-2 text-sm text-[#917F87]">
                    Select any saved variation to
                    edit its stock quantity.
                  </p>
                </div>

                <span className="text-xs text-[#A3959B]">
                  {selectedProduct.inventory?.length || 0} records
                </span>
              </div>

              {(selectedProduct.inventory?.length || 0) === 0 ? (
                <div className="mt-7 rounded-2xl bg-[#FBF5F7] px-6 py-9 text-center">
                  <Boxes
                    size={25}
                    className="mx-auto text-[#B1849B]"
                  />

                  <p className="mt-4 text-sm text-[#917F87]">
                    No variations configured yet.
                    Save your first stock quantity above.
                  </p>
                </div>
              ) : (
                <div className="mt-7 space-y-3">
                  {selectedProduct.inventory.map((item) => (
                    <button
                      type="button"
                      key={variationKey(item)}
                      onClick={() =>
                        handleEditSavedVariation(item)
                      }
                      disabled={isSaving || isRefreshing}
                      className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F0E5E9] bg-[#FFFCFA] px-5 py-4 text-left transition-colors hover:border-[#DDBFCD] hover:bg-[#FBF3F6] disabled:opacity-60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-6 text-[#654A58]">
                          {variationLabel(item)}
                        </p>

                        <p className="mt-1 text-xs text-[#A3959B]">
                          Click to edit this variation
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-2 text-xs font-medium ${
                            item.stock > 0
                              ? "bg-[#EAF5EF] text-[#407459]"
                              : "bg-[#FCECEF] text-[#A05D72]"
                          }`}
                        >
                          {item.stock > 0
                            ? `${item.stock} in stock`
                            : "Out of stock"}
                        </span>

                        <ChevronRight
                          size={16}
                          className="text-[#A6758D]"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty catalogue state */}
          {!selectedProduct && (
            <div className="mt-7 rounded-[24px] border border-[#F0E5E9] bg-white p-8 text-center">
              <p className="text-sm text-[#917F87]">
                No products were found in your catalogue.
              </p>
            </div>
          )}
        </section>

        {/* =================================== */}
        {/* FOOTER                              */}
        {/* =================================== */}

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
    </main>
  );
}

export default AdminDashboard;
