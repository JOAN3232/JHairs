
import { ArrowDown, ArrowUpRight } from "lucide-react";

/**
 * JHAIRS — RESPONSIVE LUXURY HERO
 *
 * MOBILE:
 * - First screen focuses on the introduction text.
 * - Mannequin image appears below the first screen.
 * - Discover More smoothly scrolls to the image.
 * - Decorative elements cannot cause horizontal overflow.
 *
 * DESKTOP:
 * - Text remains on the left.
 * - Mannequin image remains on the right.
 *
 * Existing JHAIRS styling and product links are preserved.
 */

function Hero() {
  /**
   * SMOOTH SCROLL TO MANNEQUIN
   *
   * Scrolls to our image section when customers
   * tap the Discover More button on mobile.
   */
  const scrollToImage = () => {
    // Find the mannequin image section.
    const imageSection = document.getElementById("hero-image");

    // Check whether the user prefers reduced motion.
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Scroll to the image smoothly when permitted.
    imageSection?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <section
      id="home"
      className="
        relative isolate w-full max-w-full
        overflow-x-clip bg-ivory
        lg:mb-20 lg:flex
        lg:h-[calc(100svh-101px)]
        lg:min-h-[560px]
        lg:overflow-hidden
      "
    >
      {/* ========== BACKGROUND DECORATIONS ========== */}

      {/* Soft blush background glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -left-24 top-24
          h-72 w-72 rounded-full
          bg-blush/40 blur-3xl
        "
      />

      {/* Soft powder-blue background glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -right-20 bottom-0
          h-80 w-80 rounded-full
          bg-powder/50 blur-3xl
        "
      />

      {/* ========== RESPONSIVE CONTENT LAYOUT ========== */}

      <div
        className="
          relative mx-auto grid w-full
          min-w-0 max-w-[1440px]
          grid-cols-1
          lg:grid-cols-2 lg:items-center
          lg:gap-12 lg:px-14 lg:py-6
        "
      >
        {/* ======================================= */}
        {/* FIRST SECTION — INTRODUCTION TEXT       */}
        {/* ======================================= */}

        <div
          className="
            relative z-10 order-1
            flex min-h-[calc(100svh-104px)]
            min-w-0 w-full flex-col
            items-center justify-center
            px-7 py-10 text-center
            sm:px-10
            lg:mx-0 lg:min-h-0
            lg:max-w-xl lg:items-start
            lg:px-0 lg:py-0 lg:text-left
          "
        >
          {/* Small introductory label */}
          <p
            className="
              mb-5 font-body text-[11px]
              font-medium uppercase
              tracking-[0.18em] text-rose
              sm:text-xs
            "
          >
            The Art of Beautiful Hair
          </p>

          {/* Main luxury heading */}
          <h1
            className="
              font-heading font-medium
              text-[clamp(2.8rem,9vw,4rem)]
              leading-[1.12] tracking-[-0.045em]
              text-plum
              lg:text-[clamp(3.8rem,5vw,5.8rem)]
            "
          >
            Your Hair.

            <span className="block">
              Your Crown.
            </span>

            <span className="block text-rose">
              Your Story.
            </span>
          </h1>

          {/* Short brand description */}
          <p
            className="
              mx-auto mt-6 max-w-md
              font-body text-[15px]
              leading-7 text-plum/70
              sm:text-base
              lg:mx-0 lg:mt-7 lg:text-lg
            "
          >
            Discover beautifully curated human hair,
            designed to elevate your everyday style
            and celebrate your confidence.
          </p>

          {/* ========== SHOP COLLECTION BUTTON ========== */}

          <div
            className="
              mt-8 flex justify-center
              lg:mt-9 lg:justify-start
            "
          >
            <a
              href="#shop"
              className="
                group inline-flex items-center gap-4
                rounded-full bg-plum px-8 py-4
                font-body text-sm font-medium text-white
                transition-all duration-300
                hover:-translate-y-1 hover:bg-rose
              "
            >
              Shop Collection

              <ArrowUpRight
                size={18}
                strokeWidth={1.5}
                className="
                  transition-transform duration-300
                  group-hover:translate-x-1
                  group-hover:-translate-y-1
                "
              />
            </a>
          </div>

          {/* ========== MOBILE DISCOVER MORE ========== */}

          <button
            type="button"
            onClick={scrollToImage}
            aria-label="Scroll down to discover our hair collection"
            className="
              mt-10 flex flex-col items-center
              gap-2 text-rose
              transition-colors duration-300
              hover:text-plum
              lg:hidden
            "
          >
            <span
              className="
                font-body text-[10px]
                uppercase tracking-[0.2em]
              "
            >
              Discover More
            </span>

            <ArrowDown
              size={18}
              strokeWidth={1.5}
              className="animate-bounce"
            />
          </button>

          {/* ========== DESKTOP BRAND SIGNATURE ========== */}

          <p
            className="
              mt-10 hidden font-body
              text-xs uppercase tracking-[0.2em]
              text-plum/40 lg:block
            "
          >
            ✦ Luxury in Every Strand
          </p>
        </div>

        {/* ======================================= */}
        {/* SECOND SECTION — MANNEQUIN IMAGE        */}
        {/* ======================================= */}

        <div
          id="hero-image"
          className="
            relative order-2
            mx-auto mb-20 mt-8
            w-[calc(100%-56px)]
            min-w-0 max-w-[350px]
            scroll-mt-24
            sm:max-w-[430px]
            lg:mb-0 lg:mt-0
            lg:w-full lg:max-w-[520px]
          "
        >
          {/* Decorative powder-blue frame */}
          <div
            aria-hidden="true"
            className="
              absolute -right-2 -top-3
              h-full w-full rounded-[30px]
              bg-powder
              lg:-right-4 lg:-top-4
            "
          />

          {/* Small floating mobile label */}
          <div
            className="
              absolute -right-1 -top-5 z-10
              rounded-full border border-rose/20
              bg-white/95 px-4 py-2 shadow-sm
              backdrop-blur-sm lg:hidden
            "
          >
            <span className="font-body text-[10px] text-plum">
              ✦ The Hair Edit
            </span>
          </div>

          {/* ========== MAIN MANNEQUIN PHOTOGRAPH ========== */}

          <div
            className="
              relative h-[420px]
              overflow-hidden rounded-[30px]
              bg-blush
              sm:h-[510px]
              lg:h-[min(74svh,640px)]
            "
          >
            <img
              src="/images/Hero-wig.png"
              alt="JHAIRS luxury human hair wig displayed on a mannequin"
              fetchPriority="high"
              className="
                h-full w-full
                object-cover object-center
                transition-transform duration-700
                hover:scale-105
              "
            />
          </div>

          {/* ========== FLOATING COLLECTION LABEL ========== */}

          <div
            className="
              absolute -bottom-4 -left-2 z-10
              rounded-2xl bg-white/95
              px-5 py-3 shadow-lg
              backdrop-blur-sm sm:-left-5
            "
          >
            <p
              className="
                font-body text-[10px]
                uppercase tracking-wider text-rose
              "
            >
              JHAIRS COLLECTION
            </p>

            <p
              className="
                mt-1 font-heading text-lg
                font-medium text-plum
              "
            >
              Made for You
            </p>
          </div>

          {/* ========== MOBILE VIEW STYLES BUTTON ========== */}

          <a
            href="#shop"
            className="
              absolute -bottom-5 right-0 z-10
              inline-flex items-center gap-2
              rounded-full bg-plum px-5 py-3
              font-body text-xs font-medium
              text-white shadow-md
              transition-colors duration-300
              hover:bg-rose lg:hidden
            "
          >
            View Styles

            <ArrowUpRight
              size={15}
              strokeWidth={1.5}
            />
          </a>
        </div>
      </div>
    </section>
  );
}

export default Hero;
