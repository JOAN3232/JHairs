
import { Link } from "react-router-dom";
import {
  ArrowUp,
  ArrowUpRight,
  Camera,
  Heart,
  Mail,
  MessageCircle,
} from "lucide-react";

/**
 * JHAIRS — REUSABLE FOOTER
 *
 * Features:
 * - Luxury brand section.
 * - Working internal navigation links.
 * - Links to filtered hair collections.
 * - Direct email customer support.
 * - Direct WhatsApp customer support.
 * - Back-to-top button.
 * - Responsive mobile, tablet and desktop layout.
 */

// JHAIRS customer support details.
const WHATSAPP_NUMBER = "2349136466679";
const SUPPORT_EMAIL = "agujoan86@gmail.com";

// WhatsApp support link with a default message.
const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hello JHAIRS! I'd love to make an enquiry about your hair collections."
)}`;

// Main navigation links.
const quickLinks = [
  { label: "Home", path: "/" },
  { label: "Shop All", path: "/shop" },
  { label: "Collections", path: "/collections" },
  { label: "Contact Us", path: "/contact" },
];

// Links to individual collections.
const collectionLinks = [
  { label: "Wigs", category: "Wigs" },
  { label: "Bundles", category: "Bundles" },
  { label: "Closures", category: "Closures" },
  { label: "Frontals", category: "Frontals" },
];

function Footer() {
  // Scroll smoothly to the top of the current page.
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="bg-[#F8F0F2] text-plum">
      {/* ========== MAIN FOOTER ========== */}
      <div
        className="
          mx-auto max-w-[1400px]
          px-6 pb-12 pt-16
          sm:px-10 sm:pb-14 sm:pt-20
          lg:px-16 lg:pb-16
        "
      >
        <div
          className="
            grid grid-cols-1
            gap-12
            sm:grid-cols-2
            lg:grid-cols-[1.5fr_1fr_1fr]
            lg:gap-16
          "
        >
          {/* ========== BRAND SECTION ========== */}
          <div className="sm:col-span-2 lg:col-span-1">
            {/* Brand logo */}
            <Link
              to="/"
              className="
                inline-block font-heading
                text-4xl font-semibold
                tracking-[0.08em] text-plum
                transition-colors hover:text-rose
              "
            >
              JHAIRS
            </Link>

            {/* Brand tagline */}
            <p
              className="
                mt-2 font-body text-[10px]
                font-medium uppercase
                tracking-[0.25em] text-rose
              "
            >
              Luxury in Every Strand
            </p>

            {/* Short brand description */}
            <p
              className="
                mt-6 max-w-[340px]
                font-body text-sm
                leading-8 text-plum/65
              "
            >
              Beautiful hair, effortless elegance.
              Explore thoughtfully curated styles
              that complement your individuality
              and inspire confidence.
            </p>

            {/* ========== CUSTOMER SUPPORT ICONS ========== */}
            <div className="mt-7 flex items-center gap-3">
              {/* Social media placeholder */}
              <span
                title="Social media coming soon"
                aria-label="Social media coming soon"
                className="
                  flex h-11 w-11 items-center
                  justify-center rounded-full
                  border border-plum/10
                  bg-white/70 text-plum/60
                "
              >
                <Camera size={19} strokeWidth={1.6} />
              </span>

              {/* WhatsApp support */}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with JHAIRS on WhatsApp"
                title="Chat with us on WhatsApp"
                className="
                  flex h-11 w-11 items-center
                  justify-center rounded-full
                  border border-plum/10
                  bg-white/70 text-plum
                  transition-all duration-300
                  hover:border-[#25D366]
                  hover:bg-[#25D366]
                  hover:text-white
                "
              >
                <MessageCircle size={19} strokeWidth={1.6} />
              </a>

              {/* Email support */}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                aria-label="Email JHAIRS customer support"
                title="Email customer support"
                className="
                  flex h-11 w-11 items-center
                  justify-center rounded-full
                  border border-plum/10
                  bg-white/70 text-plum
                  transition-all duration-300
                  hover:border-rose
                  hover:bg-white hover:text-rose
                "
              >
                <Mail size={19} strokeWidth={1.6} />
              </a>
            </div>

            {/* Customer support email */}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="
                mt-4 inline-block font-body
                text-xs text-plum/60
                transition-colors hover:text-rose
              "
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          {/* ========== QUICK LINKS ========== */}
          <div>
            <h3
              className="
                font-heading text-xl
                font-medium text-plum
              "
            >
              Quick Links
            </h3>

            <nav
              aria-label="Footer navigation"
              className="mt-6 flex flex-col items-start gap-4"
            >
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.path}
                  className="
                    group inline-flex items-center
                    gap-2 font-body text-sm
                    text-plum/65
                    transition-colors duration-300
                    hover:text-rose
                  "
                >
                  {link.label}

                  <ArrowUpRight
                    size={13}
                    strokeWidth={1.5}
                    className="
                      opacity-0 transition-opacity
                      group-hover:opacity-100
                    "
                  />
                </Link>
              ))}
            </nav>
          </div>

          {/* ========== COLLECTION LINKS ========== */}
          <div>
            <h3
              className="
                font-heading text-xl
                font-medium text-plum
              "
            >
              Our Collections
            </h3>

            <nav
              aria-label="Shop collections"
              className="mt-6 flex flex-col items-start gap-4"
            >
              {collectionLinks.map((collection) => (
                <Link
                  key={collection.category}
                  to={`/shop?category=${encodeURIComponent(
                    collection.category
                  )}`}
                  className="
                    group inline-flex items-center
                    gap-2 font-body text-sm
                    text-plum/65
                    transition-colors duration-300
                    hover:text-rose
                  "
                >
                  {collection.label}

                  <ArrowUpRight
                    size={13}
                    strokeWidth={1.5}
                    className="
                      opacity-0 transition-opacity
                      group-hover:opacity-100
                    "
                  />
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* ========== BOTTOM FOOTER ========== */}
        <div
          className="
            mt-14 border-t border-plum/10
            pt-7
            sm:mt-16
          "
        >
          <div
            className="
              flex flex-col gap-5
              sm:flex-row sm:items-center
              sm:justify-between
            "
          >
            {/* Copyright */}
            <p className="font-body text-xs text-plum/55">
              © {new Date().getFullYear()} JHAIRS.
              All rights reserved.
            </p>

            {/* Brand signature */}
            <p
              className="
                inline-flex items-center gap-2
                font-body text-xs text-plum/55
              "
            >
              Made with
              <Heart
                size={13}
                className="fill-rose text-rose"
              />
              for beautiful hair
            </p>

            {/* Back-to-top control */}
            <button
              type="button"
              onClick={scrollToTop}
              className="
                inline-flex items-center gap-2
                self-start font-body text-xs
                font-medium text-plum
                transition-colors hover:text-rose
                sm:self-auto
              "
            >
              Back to Top
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
