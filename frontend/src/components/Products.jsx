
import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import ProductCard from "./ProductCard";
import { fetchProducts } from "../services/productApi.js";

/**
 * JHAIRS — FEATURED PRODUCTS SECTION
 *
 * This component:
 *
 * 1. Fetches products from our MongoDB backend.
 * 2. Displays only products marked as featured.
 * 3. Keeps our original luxury homepage design.
 * 4. Reuses our existing ProductCard component.
 * 5. Handles loading, empty and error states.
 */

// =============================================
// FEATURED PRODUCTS COMPONENT
// =============================================

function Products() {
  // Store featured products received from MongoDB.
  const [featuredProducts, setFeaturedProducts] =
    useState([]);

  // Track whether products are loading.
  const [isLoading, setIsLoading] = useState(true);

  // Store a friendly error message if the API fails.
  const [error, setError] = useState("");

  // Changing this value lets customers retry loading.
  const [reloadKey, setReloadKey] = useState(0);

  // ===========================================
  // FETCH PRODUCTS FROM MONGODB
  // ===========================================

  useEffect(() => {
    // Cancel requests when leaving the homepage.
    const controller = new AbortController();

    async function loadFeaturedProducts() {
      // Start the loading state.
      setIsLoading(true);
      setError("");

      try {
        // Reuse the same API service as our Shop page.
        const allProducts = await fetchProducts(
          controller.signal
        );

        // Display only products marked as featured.
        const featured = allProducts.filter(
          (product) => product.featured === true
        );

        // Save featured products in React state.
        if (!controller.signal.aborted) {
          setFeaturedProducts(featured);
        }
      } catch (requestError) {
        // Ignore cancelled requests.
        if (controller.signal.aborted) {
          return;
        }

        // Log the error for debugging.
        console.error(
          "JHAIRS: Failed to load featured products:",
          requestError
        );

        // Display a friendly message to customers.
        setError(
          "We couldn't load our featured collection right now."
        );
      } finally {
        // Stop loading if the component is still mounted.
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    // Start fetching products.
    loadFeaturedProducts();

    // Clean up when the component unmounts.
    return () => controller.abort();
  }, [reloadKey]);

  // ===========================================
  // RENDER FEATURED PRODUCTS SECTION
  // ===========================================

  return (
    <section
      id="shop"
      className="
        bg-ivory px-6 py-20
        sm:px-10 lg:px-16 lg:py-28
      "
    >
      <div className="mx-auto max-w-[1400px]">

        {/* ===================================== */}
        {/* SECTION INTRODUCTION                  */}
        {/* ===================================== */}

        <div
          className="
            mb-12 flex flex-col gap-6
            md:flex-row md:items-end
            md:justify-between
          "
        >
          {/* Heading and description */}
          <div className="max-w-xl">
            <p
              className="
                mb-4 font-body text-xs
                font-medium uppercase
                tracking-[0.2em] text-rose
              "
            >
              The JHAIRS Edit
            </p>

            <h2
              className="
                font-heading text-4xl
                font-medium tracking-tight
                text-plum sm:text-5xl
                lg:text-6xl
              "
            >
              Our Featured
              <span className="block text-rose">
                Collection.
              </span>
            </h2>

            <p
              className="
                mt-5 max-w-md font-body
                text-sm leading-7 text-plum/65
                sm:text-base
              "
            >
              Discover our curated selection of beautiful
              human hair, thoughtfully chosen for every
              style, occasion and expression of you.
            </p>
          </div>

          {/* Link to our full MongoDB-powered shop */}
          <Link
            to="/shop"
            className="
              inline-flex w-fit items-center gap-3
              border-b border-plum pb-2
              font-body text-sm font-medium
              text-plum transition-colors
              hover:text-rose
            "
          >
            Explore Collection

            <ArrowUpRight
              size={18}
              strokeWidth={1.5}
            />
          </Link>
        </div>

        {/* ===================================== */}
        {/* FEATURED PRODUCT GRID                 */}
        {/* ===================================== */}

        {isLoading ? (
          // Show a loading indicator while MongoDB responds.
          <div
            role="status"
            className="
              flex min-h-64 flex-col
              items-center justify-center gap-4
              text-center
            "
          >
            <div
              className="
                h-9 w-9 animate-spin
                rounded-full border-2
                border-rose/20
                border-t-rose
              "
            />

            <p className="font-body text-sm text-plum/60">
              Preparing our featured collection...
            </p>
          </div>
        ) : error ? (
          // Display a retry button if the API is unavailable.
          <div
            role="alert"
            className="
              flex min-h-64 flex-col
              items-center justify-center
              rounded-[28px] bg-white/70
              px-6 py-12 text-center
            "
          >
            <h3 className="font-heading text-2xl text-plum">
              Our Collection Is Taking a Moment
            </h3>

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
        ) : featuredProducts.length > 0 ? (
          // Display our featured database products.
          <div
            className="
              grid grid-cols-2
              gap-x-4 gap-y-10
              sm:gap-x-6
              lg:grid-cols-4 lg:gap-x-7
            "
          >
            {featuredProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
              />
            ))}
          </div>
        ) : (
          // No products have been marked as featured yet.
          <div
            className="
              rounded-[28px] bg-white/70
              px-6 py-16 text-center
            "
          >
            <h3 className="font-heading text-2xl text-plum">
              New Styles Coming Soon
            </h3>

            <p
              className="
                mt-3 font-body text-sm
                text-plum/60
              "
            >
              Our next featured collection is on its way.
            </p>

            <Link
              to="/shop"
              className="
                mt-6 inline-block rounded-full
                bg-plum px-7 py-3
                font-body text-sm text-white
                hover:bg-rose
              "
            >
              Explore All Hair
            </Link>
          </div>
        )}

        {/* ===================================== */}
        {/* SECTION FOOTER                        */}
        {/* ===================================== */}

        <div className="mt-14 text-center">
          <p
            className="
              font-body text-xs uppercase
              tracking-[0.18em] text-plum/45
            "
          >
            Luxury in Every Strand ✦
          </p>
        </div>

      </div>
    </section>
  );
}

export default Products;
