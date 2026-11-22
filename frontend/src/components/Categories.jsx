
/**
 * JHAIRS — SHOP BY CATEGORY
 *
 * Displays our four main hair categories.
 * Each category includes:
 * - A product image
 * - A category name
 * - A short description
 * - A link to its shop collection
 */

import { ArrowUpRight } from "lucide-react";

// Stores category information in one reusable array.
const categories = [
  {
    id: "wigs",
    name: "Wigs",
    description: "Effortlessly beautiful, every day.",
    image: "/images/categories/wigs.png",
  },
  {
    id: "bundles",
    name: "Bundles",
    description: "Luxury in every single strand.",
    image: "/images/categories/bundles.png",
  },
  {
    id: "closures",
    name: "Closures",
    description: "The perfect natural finish.",
    image: "/images/categories/closures.png",
  },
  {
    id: "frontals",
    name: "Frontals",
    description: "Style without limits.",
    image: "/images/categories/frontals.png",
  },
];

function Categories() {
  return (
    <section
      id="collections"
      className="bg-white px-6 py-20 sm:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">

        {/* Section introduction */}
        <div className="mb-12 text-center">

          <p className="mb-3 font-body text-xs font-medium uppercase tracking-[0.25em] text-rose">
            Explore JHAIRS
          </p>

          <h2 className="font-heading text-4xl font-medium tracking-tight text-plum sm:text-5xl">
            Shop by Category
          </h2>

          <p className="mx-auto mt-4 max-w-lg font-body text-sm leading-7 text-plum/65">
            Explore our carefully curated selection
            of beautiful human hair.
          </p>

        </div>

        {/* Responsive product category grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">

          {/* Create a card for each category */}
          {categories.map((category) => (
            <a
              key={category.id}
              href={`#shop-${category.id}`}
              className="group block"
            >
              {/* Category image */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-blush/50">

                <img
                  src={category.image}
                  alt={`${category.name} collection`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Small arrow overlay */}
                <span className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-plum shadow-sm transition-all duration-300 group-hover:bg-plum group-hover:text-white">
                  <ArrowUpRight
                    size={18}
                    strokeWidth={1.5}
                  />
                </span>

              </div>

              {/* Category information */}
              <div className="mt-5">

                <h3 className="font-heading text-xl font-medium text-plum sm:text-2xl">
                  {category.name}
                </h3>

                <p className="mt-2 hidden font-body text-xs text-plum/60 sm:block">
                  {category.description}
                </p>

              </div>
            </a>
          ))}

        </div>
      </div>
    </section>
  );
}

// Export our category section.
export default Categories;
