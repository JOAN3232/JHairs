
/**
 * JHAIRS — SILK STRAND LOADER
 *
 * Displays our luxury introduction before
 * any website content becomes visible.
 *
 * The animation remains the same:
 * - Brand name reveal.
 * - Animated silk strands.
 * - Tagline reveal.
 * - Smooth fade-out.
 */

function Loader({ isLeaving = false }) {
  return (
    <div
      role="status"
      aria-label="Loading JHAIRS"
      className={`
        fixed inset-0 z-[9999]
        flex h-[100dvh] w-screen
        items-center justify-center
        overflow-hidden bg-ivory
        transition-opacity duration-700 ease-in-out
        ${
          isLeaving
            ? "pointer-events-none opacity-0"
            : "opacity-100"
        }
      `}
    >
      {/* Decorative blush glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -left-20 -top-20
          h-72 w-72 rounded-full
          bg-blush/50 blur-3xl
        "
      />

      {/* Decorative powder-blue glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -bottom-20 -right-20
          h-72 w-72 rounded-full
          bg-powder/60 blur-3xl
        "
      />

      {/* ========== CENTRE BRAND CONTENT ========== */}
      <div
        className="
          relative z-10 flex flex-col
          items-center px-6 text-center
        "
      >
        {/* JHAIRS brand name */}
        <h1
          className="
            jhairs-logo-reveal
            font-heading
            text-6xl font-light
            tracking-[0.22em] text-plum
            sm:text-8xl
          "
        >
          JHAIRS
        </h1>

        {/* Animated silk hair strands */}
        <svg
          aria-hidden="true"
          viewBox="0 0 320 70"
          className="mt-3 h-16 w-64 sm:w-80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Primary silk strand */}
          <path
            d="M12 42 C72 10, 115 65, 178 32 S268 15, 308 36"
            stroke="#D99AA5"
            strokeWidth="2"
            strokeLinecap="round"
            className="jhairs-silk-strand"
          />

          {/* Secondary golden strand */}
          <path
            d="M25 49 C92 24, 123 60, 180 39 S265 24, 298 42"
            stroke="#D8B989"
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.65"
            className="jhairs-silk-strand-secondary"
          />
        </svg>

        {/* Brand tagline */}
        <p
          className="
            jhairs-tagline-reveal
            font-body text-[10px]
            uppercase tracking-[0.3em]
            text-plum/70 sm:text-xs
          "
        >
          Luxury in Every Strand
        </p>
      </div>
    </div>
  );
}

export default Loader;
