
import { useEffect, useMemo, useState } from "react";

import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  RefreshCw,
} from "lucide-react";

import { useSearchParams } from "react-router-dom";

import ProductCard from "../components/ProductCard";
import { fetchProducts } from "../services/productApi.js";

/**
 * JHAIRS — SHOP PAGE
 *
 * FEATURES:
 * - Loads real products from our MongoDB backend.
 * - Supports product search.
 * - Filters by hair category.
 * - Sorts by price, name and featured status.
 * - Preserves our responsive product-card design.
 * - Displays loading, error and empty-result states.
 */

// =============================================
// CATEGORY FILTERS
// =============================================

const categories = [
  "All Hair",
  "Wigs",
  "Bundles",
  "Closures",
  "Frontals",
];

// =============================================
// SORTING OPTIONS
// =============================================

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name", label: "Name: A to Z" },
];

// =============================================
// SHOP COMPONENT
// =============================================

function Shop() {
  // ===========================================
  // PRODUCT API STATE
  // ===========================================

  // Products received from the MongoDB backend.
  const [products, setProducts] = useState([]);

  // Whether products are currently loading.
  const [isLoading, setIsLoading] = useState(true);

  // Store any product-loading error.
  const [error, setError] = useState("");

  // Used to retry a failed API request.
  const [reloadKey, setReloadKey] = useState(0);

  // ===========================================
  // SEARCH AND FILTER STATE
  // ===========================================

  // Customer's search query.
  const [searchQuery, setSearchQuery] = useState("");

  // Read category information from the URL.
  const [searchParams, setSearchParams] =
    useSearchParams();

  const requestedCategory = searchParams.get("category");

  // Use the URL category if it is valid.
  // Otherwise show all products.
  const activeCategory = categories.includes(
    requestedCategory
  )
    ? requestedCategory
    : "All Hair";

  // Current sorting method.
  const [sortBy, setSortBy] = useState("featured");

  // ===========================================
  // LOAD PRODUCTS FROM THE BACKEND
  // ===========================================

  useEffect(() => {
    // Allow the request to be cancelled on unmount.
    const controller = new AbortController();

    // Fetch products asynchronously.
    async function loadProducts() {
      setIsLoading(true);
      setError("");

      try {
        // Request the active product catalogue.
        const backendProducts = await fetchProducts(
          controller.signal
        );

        // Update the product grid.
        setProducts(backendProducts);
      } catch (requestError) {
        // Ignore requests cancelled during unmount.
        if (controller.signal.aborted) {
          return;
        }

        // Display a helpful error to the customer.
        console.error(
          "JHAIRS product loading failed:",
          requestError
        );

        setError(
          "We couldn't load our collection right now. Please try again."
        );
      } finally {
        // Only update state if the request is still active.
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    // Cancel the request if the component unmounts
    // or if we start another request.
    return () => controller.abort();
  }, [reloadKey]);

  // ===========================================
  // FILTER AND SORT PRODUCTS
  // ===========================================

  const filteredProducts = useMemo(() => {
    // Normalize the customer's search.
    const query = searchQuery.trim().toLowerCase();

    // Filter products by category and search text.
    const matchingProducts = products.filter(
      (product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query);

        const matchesCategory =
          activeCategory === "All Hair" ||
          product.category === activeCategory;

        return matchesSearch && matchesCategory;
      }
    );

    // Copy the results before sorting.
    const sortedProducts = [...matchingProducts];

    // Apply the selected sorting method.
    switch (sortBy) {
      case "price-low":
        sortedProducts.sort(
          (a, b) => a.basePrice - b.basePrice
        );
        break;

      case "price-high":
        sortedProducts.sort(
          (a, b) => b.basePrice - a.basePrice
        );
        break;

      case "name":
        sortedProducts.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        break;

      default:
        // Featured products come first.
        sortedProducts.sort(
          (a, b) =>
            Number(b.featured) - Number(a.featured)
        );
        break;
    }

    return sortedProducts;
  }, [products, searchQuery, activeCategory, sortBy]);

  // ===========================================
  // CATEGORY SELECTION
  // ===========================================

  const handleCategoryChange = (category) => {
    // Store category in the URL so links from
    // our Collections page keep working.
    if (category === "All Hair") {
      setSearchParams({});
    } else {
      setSearchParams({ category });
    }
  };

  // ===========================================
  // RESET FILTERS
  // ===========================================

  const clearFilters = () => {
    setSearchQuery("");
    setSearchParams({});
    setSortBy("featured");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    activeCategory !== "All Hair" ||
    sortBy !== "featured";

  // ===========================================
  // RENDER SHOP
  // ===========================================

  return (
    <main className="min-h-screen bg-[#FFFCFA]">

      {/* ======================================= */}
      {/* SECTION 1 — SHOP INTRODUCTION            */}
      {/* ======================================= */}

      <section
        className="
          bg-ivory px-5 pb-10 pt-14
          sm:px-10 sm:pb-12 sm:pt-16
          lg:px-16 lg:pb-14 lg:pt-20
        "
      >
        <div className="mx-auto max-w-[800px] text-center">
          {/* Introductory label */}
          <p
            className="
              font-body text-[11px] font-medium
              uppercase tracking-[0.22em]
              text-rose
            "
          >
            The JHAIRS Collection
          </p>

          {/* Main heading */}
          <h1
            className="
              mt-4 font-heading text-4xl
              font-medium leading-tight
              tracking-tight text-plum
              sm:text-5xl lg:text-6xl
            "
          >
            Find Your{" "}
            <span className="text-rose">
              Perfect Hair.
            </span>
          </h1>

          {/* Supporting description */}
          <p
            className="
              mx-auto mt-5 max-w-[560px]
              font-body text-sm leading-7
              text-plum/65 sm:text-base
            "
          >
            Discover beautifully curated wigs, bundles,
            closures and frontals, designed to complement
            your unique style.
          </p>

          {/* Decorative divider */}
          <div
            aria-hidden="true"
            className="
              mx-auto mt-8 h-px w-20
              bg-gradient-to-r
              from-transparent via-rose/60 to-transparent
            "
          />
        </div>
      </section>

      {/* ======================================= */}
      {/* SECTION 2 — PRODUCT CATALOGUE            */}
      {/* ======================================= */}

      <section
        className="
          bg-[#FFFCFA] px-5 pb-16 pt-8
          sm:px-10 sm:pt-10
          lg:px-16 lg:pb-20 lg:pt-12
        "
      >
        <div className="mx-auto max-w-[1400px]">

          {/* =================================== */}
          {/* SEARCH AND SORTING                  */}
          {/* =================================== */}

          <div
            className="
              flex flex-col gap-4
              md:flex-row md:items-center
              md:justify-between
            "
          >
            {/* Search bar */}
            <div
              className="
                flex w-full items-center gap-3
                rounded-full border border-plum/10
                bg-white px-5 py-4
                shadow-[0_4px_20px_rgba(75,46,57,0.03)]
                md:max-w-[460px]
              "
            >
              <Search
                size={20}
                strokeWidth={1.6}
                className="shrink-0 text-rose"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Search wigs, bundles, closures..."
                aria-label="Search hair products"
                className="
                  w-full min-w-0 bg-transparent
                  font-body text-sm text-plum
                  outline-none
                  placeholder:text-plum/35
                "
              />

              {/* Clear the search field */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="
                    text-plum/50
                    transition-colors hover:text-rose
                  "
                >
                  <X size={17} />
                </button>
              )}
            </div>

            {/* Sorting controls */}
            <div className="flex items-center gap-3">
              <ArrowUpDown
                size={17}
                strokeWidth={1.6}
                className="shrink-0 text-rose"
              />

              <label
                htmlFor="shop-sort"
                className="
                  shrink-0 font-body
                  text-sm text-plum/65
                "
              >
                Sort by:
              </label>

              <select
                id="shop-sort"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value)
                }
                className="
                  min-w-0 rounded-full
                  border border-plum/10
                  bg-white px-4 py-3
                  font-body text-sm text-plum
                  outline-none focus:border-rose
                "
              >
                {sortOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* =================================== */}
          {/* CATEGORY FILTERS                    */}
          {/* =================================== */}

          <div className="mt-9">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal
                size={17}
                strokeWidth={1.6}
                className="text-rose"
              />

              <span
                className="
                  font-body text-xs font-medium
                  uppercase tracking-[0.15em]
                  text-plum/60
                "
              >
                Shop by Category
              </span>
            </div>

            {/* Category filter buttons */}
            <div className="flex flex-wrap gap-2.5">
              {categories.map((category) => {
                const isActive =
                  activeCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      handleCategoryChange(category)
                    }
                    aria-pressed={isActive}
                    className={`
                      rounded-full border
                      px-5 py-2.5
                      font-body text-sm font-medium
                      transition-all duration-300
                      ${
                        isActive
                          ? "border-plum bg-plum text-white shadow-md"
                          : "border-plum/10 bg-white text-plum hover:border-rose hover:text-rose"
                      }
                    `}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* =================================== */}
          {/* RESULT COUNT                        */}
          {/* =================================== */}

          <div
            className="
              mb-8 mt-12 flex items-center
              justify-between gap-4
              border-b border-plum/10 pb-5
            "
          >
            <p className="font-body text-sm text-plum/60">
              {isLoading ? (
                "Loading collection..."
              ) : error ? (
                "Collection unavailable"
              ) : (
                <>
                  Showing{" "}
                  <span className="font-semibold text-plum">
                    {filteredProducts.length}
                  </span>{" "}
                  {filteredProducts.length === 1
                    ? "product"
                    : "products"}
                </>
              )}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="
                  font-body text-xs font-medium
                  text-rose hover:underline
                "
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* =================================== */}
          {/* PRODUCT RESULTS                     */}
          {/* =================================== */}

          {isLoading ? (
            // Show a loading indicator while waiting
            // for the Express backend.
            <div
              role="status"
              className="
                flex min-h-64 flex-col
                items-center justify-center
                gap-4 text-center
              "
            >
              <div
                className="
                  h-9 w-9 animate-spin rounded-full
                  border-2 border-rose/20
                  border-t-rose
                "
              />

              <p className="font-body text-sm text-plum/60">
                Finding your perfect hair...
              </p>
            </div>
          ) : error ? (
            // Display a retry button if the API fails.
            <div
              role="alert"
              className="
                flex min-h-64 flex-col
                items-center justify-center
                rounded-[28px] bg-ivory
                px-6 py-12 text-center
              "
            >
              <h2 className="font-heading text-2xl text-plum">
                Collection Unavailable
              </h2>

              <p
                className="
                  mt-3 max-w-sm font-body
                  text-sm leading-7 text-plum/60
                "
              >
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  setReloadKey((previous) => previous + 1)
                }
                className="
                  mt-6 inline-flex items-center gap-2
                  rounded-full bg-plum px-7 py-3.5
                  font-body text-sm font-medium
                  text-white transition-colors
                  hover:bg-rose
                "
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          ) : filteredProducts.length > 0 ? (
            // Render the products from MongoDB.
            <div
              className="
                grid grid-cols-2
                gap-x-4 gap-y-11
                sm:gap-x-6
                lg:grid-cols-3
                xl:grid-cols-4 xl:gap-x-7
              "
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                />
              ))}
            </div>
          ) : (
            // No products match the selected filters.
            <div
              className="
                flex flex-col items-center
                justify-center
                rounded-[28px] bg-ivory
                px-6 py-20 text-center
              "
            >
              <Search
                size={34}
                strokeWidth={1.2}
                className="text-rose"
              />

              <h2 className="mt-6 font-heading text-2xl text-plum">
                No Hair Found
              </h2>

              <p
                className="
                  mt-3 max-w-sm font-body
                  text-sm leading-7 text-plum/60
                "
              >
                We couldn't find any products matching
                your search. Try another keyword or
                select a different category.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="
                  mt-7 rounded-full bg-plum
                  px-7 py-3.5
                  font-body text-sm font-medium
                  text-white transition-colors
                  hover:bg-rose
                "
              >
                View All Products
              </button>
            </div>
          )}

          {/* =================================== */}
          {/* BOTTOM BRAND SIGNATURE              */}
          {/* =================================== */}

          <div className="mt-20 text-center">
            <p
              className="
                font-body text-xs uppercase
                tracking-[0.2em] text-plum/40
              "
            >
              ✦ Beautiful Hair, Beautiful Confidence ✦
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Shop;
