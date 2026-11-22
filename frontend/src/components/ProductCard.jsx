
import { ArrowUpRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../data/products";

/**
 * JHAIRS — RESPONSIVE PRODUCT CARD
 *
 * MOBILE:
 * - Two products can fit side by side.
 * - Taller product images.
 * - Smaller Featured badge and heart.
 * - View Details button appears BELOW the image.
 * - More comfortable spacing around product details.
 *
 * DESKTOP:
 * - Retains the original luxury card design.
 * - View Details appears over the image on hover.
 *
 * Wishlist functionality will be added later.
 */

function ProductCard({ product }) {
  // Product details destination.
  const productUrl = `/products/${product.id}`;

  return (
    <article className="group min-w-0">
      {/* ========== PRODUCT IMAGE ========== */}

      <div
        className="
          relative aspect-[3/4.6]
          overflow-hidden rounded-[18px]
          bg-[#F9F1F1]
          sm:aspect-[3/4]
          sm:rounded-[22px]
        "
      >
        {/* Make the image itself clickable. */}
        <Link
          to={productUrl}
          aria-label={`View ${product.name}`}
          className="block h-full w-full"
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="
              h-full w-full object-cover
              object-center
              transition-transform duration-700
              group-hover:scale-105
            "
          />
        </Link>

        {/* ========== FEATURED BADGE ========== */}

        {product.featured && (
          <span
            className="
              pointer-events-none absolute
              left-2 top-2
              rounded-full bg-white/90
              px-2 py-1
              font-body text-[8px] font-medium
              uppercase tracking-[0.06em]
              text-plum backdrop-blur-sm
              sm:left-3 sm:top-3
              sm:px-3 sm:py-1.5
              sm:text-[10px]
              sm:tracking-wider
            "
          >
            Featured
          </span>
        )}

        {/* ========== WISHLIST ICON ========== */}

        {/* Decorative for now — no wishlist action yet. */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none absolute
            right-2 top-2
            flex h-7 w-7
            items-center justify-center
            rounded-full bg-white/90 text-plum
            sm:right-3 sm:top-3
            sm:h-9 sm:w-9
          "
        >
          <Heart
            size={14}
            strokeWidth={1.5}
            className="sm:h-[17px] sm:w-[17px]"
          />
        </div>

        {/* ========== DESKTOP VIEW DETAILS ========== */}

        {/* Hidden on mobile to keep images unobstructed. */}
        <Link
          to={productUrl}
          aria-label={`View details for ${product.name}`}
          className="
            absolute bottom-3 left-3 right-3
            hidden items-center justify-between
            rounded-full bg-white
            px-5 py-3
            font-body text-xs font-medium
            text-plum shadow-sm
            transition-all duration-300
            sm:flex
            sm:translate-y-16
            sm:opacity-0
            sm:group-hover:translate-y-0
            sm:group-hover:opacity-100
            sm:focus-visible:translate-y-0
            sm:focus-visible:opacity-100
          "
        >
          View Details

          <ArrowUpRight
            size={17}
            strokeWidth={1.5}
          />
        </Link>
      </div>

      {/* ========== MOBILE VIEW DETAILS ========== */}

      {/* Button appears beneath the image on small screens. */}
      <Link
        to={productUrl}
        className="
          mt-3 flex w-full items-center
          justify-center gap-2
          rounded-full border border-plum/15
          bg-white px-3 py-2.5
          font-body text-[11px] font-medium
          text-plum
          transition-colors duration-300
          hover:border-rose hover:text-rose
          sm:hidden
        "
      >
        View Details
        <ArrowUpRight size={14} strokeWidth={1.5} />
      </Link>

      {/* ========== PRODUCT INFORMATION ========== */}

      <div className="px-0.5 pt-4 sm:px-1">
        {/* Product category */}
        <p
          className="
            font-body text-[9px]
            uppercase tracking-[0.14em]
            text-rose
            sm:text-[10px]
            sm:tracking-[0.16em]
          "
        >
          {product.category}
        </p>

        {/* Product name */}
        <h3
          className="
            mt-2 font-heading
            text-[18px] font-medium
            leading-[1.2] text-plum
            sm:text-xl
          "
        >
          <Link
            to={productUrl}
            className="
              transition-colors duration-300
              hover:text-rose
            "
          >
            {product.name}
          </Link>
        </h3>

        {/* Starting price */}
        <p
          className="
            mt-3 font-body text-xs
            font-medium text-plum
            sm:text-sm
          "
        >
          From {formatPrice(product.basePrice)}
        </p>

        {/* Available hair lengths */}
        {product.lengths?.length > 0 && (
          <p
            className="
              mt-1.5 font-body text-[11px]
              leading-5 text-plum/55
              sm:text-xs
            "
          >
            {Math.min(...product.lengths)}" –{" "}
            {Math.max(...product.lengths)}" available
          </p>
        )}
      </div>
    </article>
  );
}

export default ProductCard;
