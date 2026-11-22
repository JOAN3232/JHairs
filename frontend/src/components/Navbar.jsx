
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Search,
  ShoppingBag,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";

import AnnouncementBar from "./AnnouncementBar";
import { useCart } from "../context/useCart.js";

/**
 * JHAIRS — RESPONSIVE LUXURY NAVBAR
 *
 * Features:
 * - Announcement slider.
 * - Desktop navigation.
 * - Transparent pink glass on scroll.
 * - Compact dropdown BELOW the mobile navbar.
 * - Smooth opening animation.
 * - Working shopping bag.
 * - Automatically closes when a link is clicked.
 */

// Website navigation links.
const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "Contact", href: "/contact" },
];

function Navbar() {
  // Tracks the scrolling position.
  const [isScrolled, setIsScrolled] = useState(false);

  // Controls the mobile dropdown.
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Access the existing shopping bag.
  const { cartCount, openCart } = useCart();

  // ========== NAVBAR SCROLL EFFECT ==========
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // ========== KEYBOARD AND RESIZE SUPPORT ==========
  useEffect(() => {
    if (!isMenuOpen) return;

    // Escape closes the mobile dropdown.
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    // Close menu when switching to desktop.
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isMenuOpen]);

  // Close the menu before opening the cart.
  const handleOpenCart = () => {
    setIsMenuOpen(false);
    openCart();
  };

  return (
    <>
      {/* ========== ANNOUNCEMENT BAR ========== */}
      <AnnouncementBar />

      {/* ========== STICKY NAVBAR ========== */}
      <header
        className={`
          sticky top-0 z-50 w-full border-b
          transition-[background-color,box-shadow,border-color,backdrop-filter]
          duration-500 ease-in-out
          ${
            isScrolled
              ? "border-white/50 bg-[#FFE8F0]/20 backdrop-blur-2xl shadow-[0_8px_30px_rgba(90,50,65,0.06)]"
              : "border-plum/5 bg-ivory"
          }
        `}
      >
        {/* Main navbar */}
        <nav
          aria-label="Main navigation"
          className="
            mx-auto flex h-16 w-full max-w-[1440px]
            items-center justify-between
            px-6 sm:px-10 lg:px-16
          "
        >
          {/* ========== LOGO ========== */}
          <Link
            to="/#home"
            onClick={() => setIsMenuOpen(false)}
            className="
              font-heading text-[27px]
              font-medium tracking-[0.15em]
              text-plum sm:text-[30px]
            "
          >
            JHAIRS
          </Link>

          {/* ========== DESKTOP LINKS ========== */}
          <div className="hidden items-center gap-9 md:flex lg:gap-12">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="
                  font-body text-sm font-medium
                  text-plum/85 transition-colors
                  duration-300 hover:text-rose
                "
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ========== RIGHT-SIDE ICONS ========== */}
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Search placeholder */}
            <button
              type="button"
              disabled
              aria-label="Search coming soon"
              title="Search coming soon"
              className="cursor-not-allowed text-plum/65"
            >
              <Search size={21} strokeWidth={1.6} />
            </button>

            {/* Shopping bag */}
            <button
              type="button"
              onClick={handleOpenCart}
              aria-label={`Open shopping bag, ${cartCount} items`}
              className="
                relative text-plum transition-colors
                hover:text-rose
              "
            >
              <ShoppingBag size={21} strokeWidth={1.6} />

              {cartCount > 0 && (
                <span
                  className="
                    absolute -right-2 -top-2
                    flex h-4 min-w-4 items-center
                    justify-center rounded-full
                    bg-rose px-1 font-body
                    text-[9px] font-semibold text-white
                  "
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() =>
                setIsMenuOpen((previous) => !previous)
              }
              aria-label={
                isMenuOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-controls="mobile-navigation"
              aria-expanded={isMenuOpen}
              className="
                flex items-center justify-center
                text-plum md:hidden
              "
            >
              {isMenuOpen ? (
                <X size={24} strokeWidth={1.5} />
              ) : (
                <Menu size={24} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </nav>

        {/* ========== COMPACT MOBILE MENU ========== */}
        {/* This is positioned below the navbar,
            instead of covering the whole screen. */}

        <div
          id="mobile-navigation"
          aria-hidden={!isMenuOpen}
          inert={!isMenuOpen}
          className={`
            absolute left-0 right-0 top-full
            z-50 overflow-hidden
            border-b border-plum/10
            bg-[#FFFCFA]/95
            shadow-[0_16px_30px_rgba(75,46,57,0.09)]
            backdrop-blur-2xl
            transition-[opacity,transform,visibility]
            duration-300 ease-out
            md:hidden
            ${
              isMenuOpen
                ? "visible translate-y-0 opacity-100"
                : "invisible -translate-y-3 opacity-0"
            }
          `}
        >
          <nav
            aria-label="Mobile navigation"
            className="mx-auto max-w-[520px] px-6 py-4"
          >
            {navLinks.map((link, index) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="
                  group flex items-center
                  justify-between gap-4
                  border-b border-plum/5
                  px-1 py-3.5
                  last:border-b-0
                "
              >
                <span className="flex items-center gap-4">
                  {/* Small numbered navigation */}
                  <span
                    className="
                      font-body text-[10px]
                      text-rose/70
                    "
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* Link label */}
                  <span
                    className="
                      font-heading text-xl
                      font-normal text-plum
                      transition-colors
                      group-hover:text-rose
                    "
                  >
                    {link.label}
                  </span>
                </span>

                <ArrowUpRight
                  size={17}
                  strokeWidth={1.4}
                  className="text-plum/35"
                />
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ========== TAP-OUTSIDE OVERLAY ========== */}
      {/* Keeps the navbar itself above the overlay. */}
      {isMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsMenuOpen(false)}
          className="
            fixed inset-0 z-40
            cursor-default bg-plum/10
            md:hidden
          "
        />
      )}
    </>
  );
}

export default Navbar;
