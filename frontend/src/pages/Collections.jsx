
import { Link } from "react-router-dom";
import { ArrowUpRight, MoveRight, Waves } from "lucide-react";

/**
 * JHAIRS — COLLECTIONS PAGE
 *
 * - Displays our four hair categories.
 * - Opens the Shop with the chosen category selected.
 * - Uses existing product photography.
 * - Works on mobile, tablet and desktop.
 */

// Our collection cards.
const collections = [
  {
    id: "wigs",
    name: "Wigs",
    description: "Effortless beauty, beautifully styled.",
    image: "/images/products/bone-straight-wig.png",
    category: "Wigs",
    number: "01",
  },
  {
    id: "bundles",
    name: "Bundles",
    description: "Beautiful volume, endless possibilities.",
    image: "/images/products/deep-wave-bundles.png",
    category: "Bundles",
    number: "02",
  },
  {
    id: "closures",
    name: "Closures",
    description: "The perfect finish for every look.",
    image: "/images/products/hd-lace-closure.png",
    category: "Closures",
    number: "03",
  },
  {
    id: "frontals",
    name: "Frontals",
    description: "A flawless look from every angle.",
    image: null,
    category: "Frontals",
    number: "04",
  },
];

function Collections() {
  return (
    <main className="min-h-screen bg-[#FFFCFA]">
      {/* ========== COMPACT INTRODUCTION ========== */}
      <section
        className="
          bg-ivory px-5 pb-10 pt-14
          sm:px-10 sm:pb-12 sm:pt-16
          lg:px-16 lg:pt-20
        "
      >
        <div className="mx-auto max-w-[800px] text-center">
          {/* Small collection label */}
          <p
            className="
              font-body text-[11px] font-medium
              uppercase tracking-[0.22em] text-rose
            "
          >
            Explore JHAIRS
          </p>

          {/* Main heading */}
          <h1
            className="
              mt-4 font-heading text-4xl
              font-medium leading-tight text-plum
              sm:text-5xl lg:text-6xl
            "
          >
            Our{" "}
            <span className="text-rose">
              Collections.
            </span>
          </h1>

          {/* Description */}
          <p
            className="
              mx-auto mt-5 max-w-[550px]
              font-body text-sm leading-7
              text-plum/65 sm:text-base
            "
          >
            From timeless essentials to statement styles,
            discover the hair that brings your vision to life.
          </p>

          {/* Minimal divider */}
          <div
            aria-hidden="true"
            className="
              mx-auto mt-8 h-px w-20
              bg-gradient-to-r from-transparent
              via-rose/60 to-transparent
            "
          />
        </div>
      </section>

      {/* ========== COLLECTION CARDS ========== */}
      <section
        className="
          px-5 pb-20 pt-10
          sm:px-10 sm:pt-12
          lg:px-16 lg:pb-28
        "
      >
        <div className="mx-auto max-w-[1250px]">
          {/* Responsive collection grid */}
          <div
            className="
              grid grid-cols-1 gap-7
              sm:grid-cols-2 sm:gap-6
              lg:gap-9
            "
          >
            {collections.map((collection) => (
              <Link
                key={collection.id}
                to={`/shop?category=${encodeURIComponent(
                  collection.category
                )}`}
                className="
                  group block min-w-0
                "
              >
                {/* Collection image container */}
                <div
                  className="
                    relative aspect-[4/4.5]
                    overflow-hidden rounded-[28px]
                    bg-[#F4EBE9]
                    sm:aspect-[4/4.3]
                    lg:rounded-[32px]
                  "
                >
                  {collection.image ? (
                    <img
                      src={collection.image}
                      alt={`${collection.name} collection`}
                      loading="lazy"
                      className="
                        h-full w-full object-cover
                        transition-transform duration-700
                        group-hover:scale-105
                      "
                    />
                  ) : (
                    /*
                     * Temporary elegant background for
                     * Frontals until its image is ready.
                     */
                    <div
                      className="
                        flex h-full w-full flex-col
                        items-center justify-center
                        bg-gradient-to-br
                        from-[#F6E9E9] via-[#F4E9E6]
                        to-[#EAD9DD]
                      "
                    >
                      <Waves
                        size={75}
                        strokeWidth={0.8}
                        className="text-plum/20"
                      />

                      <span
                        className="
                          mt-5 font-heading
                          text-3xl italic text-plum/30
                          sm:text-4xl
                        "
                      >
                        JHAIRS
                      </span>
                    </div>
                  )}

                  {/* Subtle image overlay */}
                  <div
                    className="
                      pointer-events-none absolute inset-0
                      bg-gradient-to-t
                      from-plum/30 via-transparent
                      to-transparent
                    "
                  />

                  {/* Collection number */}
                  <span
                    className="
                      absolute left-5 top-5
                      rounded-full border border-white/60
                      bg-white/80 px-4 py-2
                      font-body text-xs text-plum
                      backdrop-blur-md
                    "
                  >
                    {collection.number}
                  </span>

                  {/* Arrow icon */}
                  <span
                    className="
                      absolute bottom-5 right-5
                      flex h-12 w-12 items-center
                      justify-center rounded-full
                      bg-white text-plum
                      transition-all duration-300
                      group-hover:bg-plum
                      group-hover:text-white
                    "
                  >
                    <ArrowUpRight
                      size={21}
                      strokeWidth={1.5}
                    />
                  </span>
                </div>

                {/* Collection information */}
                <div
                  className="
                    mt-5 flex items-start
                    justify-between gap-4
                  "
                >
                  <div>
                    <h2
                      className="
                        font-heading text-2xl
                        font-medium text-plum
                        sm:text-3xl
                      "
                    >
                      {collection.name}
                    </h2>

                    <p
                      className="
                        mt-2 font-body text-sm
                        leading-6 text-plum/55
                      "
                    >
                      {collection.description}
                    </p>
                  </div>
                </div>

                {/* Collection link label */}
                <div
                  className="
                    mt-4 inline-flex items-center
                    gap-2 font-body text-xs
                    font-medium uppercase
                    tracking-[0.12em] text-rose
                    transition-all duration-300
                    group-hover:gap-4
                  "
                >
                  Explore Collection
                  <MoveRight
                    size={17}
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            ))}
          </div>

          {/* ========== SHOP ALL CTA ========== */}
          <div
            className="
              mt-16 flex flex-col
              items-center text-center
              sm:mt-20
            "
          >
            <p
              className="
                font-body text-[11px]
                uppercase tracking-[0.2em]
                text-rose
              "
            >
              Luxury in Every Strand
            </p>

            <h2
              className="
                mt-4 font-heading text-3xl
                text-plum sm:text-4xl
              "
            >
              Explore More Beautiful Hair
            </h2>

            <p
              className="
                mt-4 max-w-md font-body
                text-sm leading-7 text-plum/60
              "
            >
              Find your next favourite look in
              our complete hair collection.
            </p>

            {/* Open all products in the Shop */}
            <Link
              to="/shop"
              className="
                mt-7 inline-flex items-center
                justify-center gap-3
                rounded-full bg-plum
                px-8 py-4 font-body
                text-sm font-medium text-white
                transition-colors duration-300
                hover:bg-rose
              "
            >
              Shop All Hair
              <MoveRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Collections;
