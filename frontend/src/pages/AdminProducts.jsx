
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

/**
 * JHAIRS — PRODUCT MANAGEMENT
 *
 * - Display saved products.
 * - Create new inactive products.
 * - Edit existing products.
 * - Publish or unpublish products.
 * - Upload main and colour images to Cloudinary.
 * - Keep inventory management separate.
 */

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

const categories = [
  "Wigs",
  "Bundles",
  "Closures",
  "Frontals",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const inputClass =
  "w-full rounded-xl border border-[#EBDDE4] " +
  "bg-[#FFFCFA] px-4 py-3.5 text-sm text-[#553747] " +
  "outline-none transition-colors focus:border-[#BB8CA3]";

// ============================================
// FORM HELPERS
// ============================================

// Create one empty colour variation.
function emptyColor() {
  return {
    name: "",
    hex: "#191719",
    image: "",
    extraPrice: "0",
  };
}

// Create an empty product form.
function emptyForm() {
  return {
    name: "",
    category: "Wigs",
    description: "",
    image: "",
    basePrice: "",
    lengths: "",
    densities: "",
    laceTypes: "",
    colors: [emptyColor()],
  };
}

// Turn arrays into comma-separated input values.
function optionString(options) {
  return Array.isArray(options)
    ? options.join(", ")
    : "";
}

// Convert a saved product into editable inputs.
function formFromProduct(product) {
  return {
    name: product.name || "",
    category: product.category || "Wigs",
    description: product.description || "",
    image: product.image || "",
    basePrice: String(product.basePrice ?? ""),
    lengths: optionString(product.lengths),
    densities: optionString(product.densities),
    laceTypes: optionString(product.laceTypes),

    colors:
      Array.isArray(product.colors) &&
      product.colors.length > 0
        ? product.colors.map((color) => ({
            name: color.name || "",
            hex: color.hex || "#191719",
            image: color.image || "",
            extraPrice: String(
              color.extraPrice ?? 0
            ),
          }))
        : [emptyColor()],
  };
}

// Parse comma-separated options.
function textOptions(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// Convert lengths into numbers.
function lengthOptions(value) {
  return textOptions(value).map(Number);
}

// Read a JSON API response.
async function readApi(response) {
  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok || !data?.success) {
    const error = new Error(
      data?.message ||
        "Unable to complete the request."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

// Calculate the total stock for a product.
function totalProductStock(product) {
  return (product.inventory || []).reduce(
    (total, item) => total + (item.stock || 0),
    0
  );
}

// ============================================
// SHARED FIELD
// ============================================

function Field({ label, hint, children }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#654A58]">
        {label}
      </p>

      {children}

      {hint && (
        <p className="mt-2 text-xs leading-5 text-[#9D8B94]">
          {hint}
        </p>
      )}
    </div>
  );
}

// ============================================
// IMAGE UPLOAD FIELD
// ============================================

function ImageUploadField({
  label,
  imageUrl,
  uploading,
  uploadError,
  onFileSelected,
  disabled,
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-[#654A58]">
        {label}
      </p>

      {/* Display the saved Cloudinary image. */}
      <div className="flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-[#EBDDE4] bg-[#FBF3F6]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${label} preview`}
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <div className="text-center text-[#A6758D]">
            <ImagePlus
              size={30}
              className="mx-auto"
            />

            <p className="mt-3 text-xs">
              No image selected
            </p>
          </div>
        )}
      </div>

      {/* Open the laptop file picker. */}
      <label
        className={`mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#DCC8D2] bg-white px-5 py-3 text-sm text-[#705565] ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:bg-[#FFF5F8]"
        }`}
      >
        {uploading ? (
          <>
            <LoaderCircle
              size={17}
              className="animate-spin"
            />
            Uploading Image...
          </>
        ) : (
          <>
            <UploadCloud size={18} />
            {imageUrl
              ? "Change Image"
              : "Choose Image"}
          </>
        )}

        <input
          type="file"
          className="sr-only"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              onFileSelected(file);
            }

            // Allow reselecting the same file.
            event.target.value = "";
          }}
        />
      </label>

      <p className="mt-3 text-xs text-[#9D8B94]">
        JPG, PNG or WebP. Maximum 5 MB.
      </p>

      {imageUrl && !uploading && (
        <p className="mt-3 flex items-center gap-2 text-xs text-green-700">
          <CheckCircle2 size={15} />
          Image ready
        </p>
      )}

      {uploadError && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {uploadError}
        </p>
      )}
    </div>
  );
}

// ============================================
// ADMIN PRODUCTS PAGE
// ============================================

function AdminProducts({ session, onLogout }) {
  // Products loaded from MongoDB.
  const [pageState, setPageState] = useState({
    status: "loading",
    products: [],
    error: "",
  });

  // Controls the Add / Edit form.
  const [showForm, setShowForm] = useState(false);

  // null means create mode.
  // A MongoDB ID means edit mode.
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm);

  // Track save and edit loading states.
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEditor, setIsLoadingEditor] =
    useState(false);

  // Track which product is being published.
  const [statusProductId, setStatusProductId] =
    useState(null);

    
 // Track which product is currently being deleted.
 const [deletingProductId, setDeletingProductId] =
   useState(null);

  // Feedback messages.
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] =
    useState("");
  const [pageMessage, setPageMessage] =
    useState("");

  // Track one image upload at a time.
  const [imageUpload, setImageUpload] = useState({
    target: null,
    error: "",
    errorTarget: null,
  });

  const isUploading =
    imageUpload.target !== null;

  const isRefreshing =
    pageState.status === "refreshing";

  // Disable changing mode while an operation runs.

 // Prevent overlapping admin operations.
 const isBusy =
   isSaving ||
   isUploading ||
   isLoadingEditor ||
   statusProductId !== null ||
   deletingProductId !== null;


  // ==========================================
  // AUTHENTICATED REQUEST HELPER
  // ==========================================

  const adminHeaders = {
    Authorization: `Bearer ${session.token}`,
  };

  // ==========================================
  // LOAD EXISTING PRODUCTS
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        // Verify that the administrator is logged in.
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
          onLogout();
          return;
        }

        await readApi(authResponse);

        // Load active and inactive products.
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

        const data = await readApi(response);

        if (!controller.signal.aborted) {
          setPageState({
            status: "ready",
            products: data.products || [],
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

    loadProducts();

    return () => controller.abort();
  }, [session.token, onLogout]);

  // ==========================================
  // REFRESH PRODUCT COLLECTION
  // ==========================================

  const refreshProducts = async () => {
    if (isBusy || isRefreshing) return;

    setPageState((previous) => ({
      ...previous,
      status: "refreshing",
      error: "",
    }));

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/products/admin/inventory`,
        {
          headers: adminHeaders,
        }
      );

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await readApi(response);

      setPageState({
        status: "ready",
        products: data.products || [],
        error: "",
      });
    } catch (error) {
      setPageState((previous) => ({
        ...previous,
        status: "ready",
        error: error.message,
      }));
    }
  };

  // ==========================================
  // OPEN ADD PRODUCT FORM
  // ==========================================

  const startCreating = () => {
    if (isBusy) return;

    setEditingId(null);
    setForm(emptyForm());
    setSaveError("");
    setSaveSuccess("");
    setPageMessage("");

    setImageUpload({
      target: null,
      error: "",
      errorTarget: null,
    });

    setShowForm(true);
  };

  // ==========================================
  // OPEN EXISTING PRODUCT FOR EDITING
  // ==========================================

  const startEditing = async (product) => {
    if (isBusy) return;

    setIsLoadingEditor(true);
    setSaveError("");
    setSaveSuccess("");
    setPageMessage("");

    try {
      // Fetch complete product information.
      // The catalogue inventory endpoint does
      // not include all editable product fields.
      const response = await fetch(
        `${API_BASE_URL}/api/admin/products/${product._id}`,
        {
          headers: adminHeaders,
        }
      );

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await readApi(response);

      // Load saved values into the form.
      setForm(formFromProduct(data.product));
      setEditingId(data.product._id);

      setImageUpload({
        target: null,
        error: "",
        errorTarget: null,
      });

      setShowForm(true);

      // Take the administrator to the form.
      requestAnimationFrame(() => {
        document
          .getElementById("product-editor")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      });
    } catch (error) {
      setPageMessage(error.message);
    } finally {
      setIsLoadingEditor(false);
    }
  };

  // ==========================================
  // CLOSE OR CANCEL PRODUCT FORM
  // ==========================================

  const closeForm = () => {
    if (isBusy) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setSaveError("");
    setSaveSuccess("");

    setImageUpload({
      target: null,
      error: "",
      errorTarget: null,
    });
  };

  // ==========================================
  // UPDATE FORM FIELDS
  // ==========================================

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSaveError("");
    setSaveSuccess("");
  };

  // Update one colour only.
  const updateColor = (index, field, value) => {
    setForm((previous) => ({
      ...previous,

      colors: previous.colors.map(
        (color, currentIndex) =>
          currentIndex === index
            ? {
                ...color,
                [field]: value,
              }
            : color
      ),
    }));

    setSaveError("");
    setSaveSuccess("");
  };

  // Add another hair colour.
  const addColor = () => {
    if (isBusy || form.colors.length >= 30) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      colors: [
        ...previous.colors,
        emptyColor(),
      ],
    }));

    setSaveError("");
  };

  // Remove a colour from the form.
  const removeColor = (index) => {
    if (isBusy || form.colors.length <= 1) {
      return;
    }

    setForm((previous) => ({
      ...previous,

      colors: previous.colors.filter(
        (_, currentIndex) =>
          currentIndex !== index
      ),
    }));

    setSaveError("");
  };

  // ==========================================
  // CLOUDINARY IMAGE UPLOAD
  // ==========================================

  const uploadProductImage = async (
    file,
    target,
    colorIndex = null
  ) => {
    if (isBusy) return;

    // Check supported image format.
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageUpload({
        target: null,
        error:
          "Choose a JPG, PNG or WebP image.",
        errorTarget: target,
      });
      return;
    }

    // Check image size before uploading.
    if (file.size > MAX_IMAGE_SIZE) {
      setImageUpload({
        target: null,
        error:
          "Image must be 5 MB or smaller.",
        errorTarget: target,
      });
      return;
    }

    setImageUpload({
      target,
      error: "",
      errorTarget: null,
    });

    setSaveError("");
    setSaveSuccess("");

    try {
      const formData = new FormData();

      // The backend expects "image".
      formData.append("image", file);

      const response = await fetch(
        `${API_BASE_URL}/api/admin/uploads/image`,
        {
          method: "POST",
          headers: adminHeaders,
          body: formData,
        }
      );

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await readApi(response);

      const uploadedUrl = data.image?.url;

      if (
        typeof uploadedUrl !== "string" ||
        !uploadedUrl.startsWith("https://")
      ) {
        throw new Error(
          "Cloudinary did not return a valid image URL."
        );
      }

      if (target === "main") {
        // Replace the main product image.
        setForm((previous) => ({
          ...previous,
          image: uploadedUrl,
        }));
      } else if (colorIndex !== null) {
        // Replace the chosen colour image.
        setForm((previous) => ({
          ...previous,

          colors: previous.colors.map(
            (color, index) =>
              index === colorIndex
                ? {
                    ...color,
                    image: uploadedUrl,
                  }
                : color
          ),
        }));
      }

      setImageUpload({
        target: null,
        error: "",
        errorTarget: null,
      });
    } catch (error) {
      setImageUpload({
        target: null,
        error: error.message,
        errorTarget: target,
      });
    }
  };

  // ==========================================
  // SAVE NEW OR EDITED PRODUCT
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isBusy) return;

    setSaveError("");
    setSaveSuccess("");

    const lengths = lengthOptions(form.lengths);
    const basePrice = Number(form.basePrice);

    // Build the exact body expected by the API.
    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      image: form.image.trim(),
      basePrice,
      lengths,
      densities: textOptions(form.densities),
      laceTypes: textOptions(form.laceTypes),

      colors: form.colors.map((color) => ({
        name: color.name.trim(),
        hex: color.hex,
        image: color.image.trim(),
        extraPrice: Number(color.extraPrice),
      })),
    };

    // Validate the starting price.
    if (
      form.basePrice === "" ||
      !Number.isSafeInteger(basePrice) ||
      basePrice <= 0
    ) {
      setSaveError(
        "Enter a valid starting price in whole naira."
      );
      return;
    }

    // The main image is required.
    if (!payload.image) {
      setSaveError(
        "Upload the main product image first."
      );
      return;
    }

    // Validate selectable hair lengths.
    if (
      lengths.length === 0 ||
      lengths.some(
        (length) =>
          !Number.isSafeInteger(length) ||
          length < 1 ||
          length > 100
      ) ||
      new Set(lengths).size !== lengths.length
    ) {
      setSaveError(
        "Enter unique hair lengths between 1 and 100 inches."
      );
      return;
    }

    // Validate colour information.
    if (
      payload.colors.some(
        (color, index) =>
          !color.name ||
          !color.image ||
          form.colors[index].extraPrice === "" ||
          !Number.isSafeInteger(color.extraPrice) ||
          color.extraPrice < 0
      )
    ) {
      setSaveError(
        "Every colour needs a name, image and valid extra price."
      );
      return;
    }

    setIsSaving(true);

    try {
      // Creating uses POST.
      // Editing uses PUT.
      const url = editingId
        ? `${API_BASE_URL}/api/admin/products/${editingId}`
        : `${API_BASE_URL}/api/admin/products`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",

        headers: {
          ...adminHeaders,
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await readApi(response);

      // Update the list using the saved product.
      setPageState((previous) => ({
        ...previous,

        products: [
          ...previous.products.filter(
            (product) =>
              product._id !== data.product._id
          ),
          data.product,
        ].sort(
          (a, b) => a.legacyId - b.legacyId
        ),
      }));

      const wasEditing = Boolean(editingId);

      // Clear the editor after saving.
      setEditingId(null);
      setForm(emptyForm());

      setSaveSuccess(
        wasEditing
          ? `${data.product.name} updated successfully!`
          : `${data.product.name} created successfully as an inactive draft.`
      );

      setImageUpload({
        target: null,
        error: "",
        errorTarget: null,
      });
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // PUBLISH OR UNPUBLISH PRODUCT
  // ==========================================

  const changeProductStatus = async (product) => {
    if (isBusy) return;

    const shouldPublish = !product.isActive;

    // Confirm before changing storefront visibility.
    const message = shouldPublish
      ? `Publish "${product.name}" to the JHAIRS shop?`
      : `Unpublish "${product.name}" and hide it from the JHAIRS shop?`;

    if (!window.confirm(message)) {
      return;
    }

    setStatusProductId(product._id);
    setPageMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/products/${product._id}/status`,
        {
          method: "PATCH",

          headers: {
            ...adminHeaders,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            isActive: shouldPublish,
          }),
        }
      );

      if (response.status === 401) {
        onLogout();
        return;
      }

      const data = await readApi(response);

      // Replace the updated product in the list.
      setPageState((previous) => ({
        ...previous,

        products: previous.products.map(
          (item) =>
            item._id === data.product._id
              ? data.product
              : item
        ),
      }));

      setPageMessage(
        shouldPublish
          ? `${data.product.name} is now published.`
          : `${data.product.name} is now unpublished.`
      );
    } catch (error) {
      setPageMessage(error.message);
    } finally {
      setStatusProductId(null);
    }
  };

  
 // ==========================================
 // DELETE PRODUCT
 // ==========================================

 const deleteProduct = async (product) => {
   // Prevent deletion during another operation.
   if (isBusy || isRefreshing) return;

   // Published products must be unpublished first.
   if (product.isActive) {
     setPageMessage(
       "Unpublish this product before deleting it."
     );
     return;
   }

   // Ask the administrator to confirm deletion.
   const confirmed = window.confirm(
     `Permanently delete "${product.name}"?\n\nThis action cannot be undone.`
   );

   // Stop if the administrator cancels.
   if (!confirmed) return;

   // Display the loading state.
   setDeletingProductId(product._id);
   setPageMessage("");

   try {
     // Request permanent deletion from the backend.
     const response = await fetch(
       `${API_BASE_URL}/api/admin/products/${product._id}`,
       {
         method: "DELETE",
         headers: adminHeaders,
       }
     );

     // Sign out if the admin session has expired.
     if (response.status === 401) {
       onLogout();
       return;
     }

     // Check whether deletion succeeded.
     await readApi(response);

     // Remove the product from the displayed list.
     setPageState((previous) => ({
       ...previous,
       products: previous.products.filter(
         (item) => item._id !== product._id
       ),
     }));

     // Display a success message.
     setPageMessage(
       `${product.name} was deleted successfully.`
     );

   } catch (error) {
     // Display the backend error if deletion fails.
     setPageMessage(error.message);

   } finally {
     // Stop showing the loading animation.
     setDeletingProductId(null);
   }
 };


  // ==========================================
  // LOADING STATE
  // ==========================================

  if (pageState.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFCFA] font-body">
        <div className="flex items-center gap-3 text-sm text-[#917F87]">
          <LoaderCircle
            size={19}
            className="animate-spin"
          />
          Loading your product collection...
        </div>
      </main>
    );
  }

  // ==========================================
  // ERROR STATE
  // ==========================================

  if (pageState.status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FFFCFA] px-5 text-center font-body">
        <Package
          size={30}
          className="text-[#A6758D]"
        />

        <h1 className="font-heading text-3xl text-[#553747]">
          Products Unavailable
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
  // PAGE DESIGN
  // ==========================================

  return (
    <main className="min-h-screen bg-[#FFFCFA] font-body">
      <div className="mx-auto max-w-[1250px] px-5 py-8 sm:px-10 lg:px-12">

        {/* PAGE HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#F0E5E9] pb-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B1849B]">
              JHAIRS Administration
            </p>

            <h1 className="mt-2 font-heading text-3xl text-[#553747] sm:text-4xl">
              Product Management
            </h1>

            <p className="mt-2 text-sm text-[#917F87]">
              Curate and grow your JHAIRS collection.
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

        {/* BACK TO DASHBOARD */}
        <Link
          to="/admin/dashboard"
          className="mt-7 inline-flex items-center gap-2 text-sm text-[#A6758D] hover:text-[#553747]"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        {/* INTRODUCTION */}
        <section className="mt-7 rounded-[26px] border border-[#F0DCE6] bg-[#F9EDF2] p-7 sm:p-9">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#A6758D]">
            <Package size={22} />
          </div>

          <h2 className="mt-5 font-heading text-3xl text-[#553747]">
            Your Product Collection
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-7 text-[#856F7B]">
            Add new pieces, update your collection
            and control which products appear
            in your JHAIRS shop.
          </p>

          <p className="mt-5 text-xs text-[#99798A]">
            {pageState.products.length} products
            in your catalogue
          </p>
        </section>

        {/* CATALOGUE */}
        <section className="pt-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B1849B]">
                Store Catalogue
              </p>

              <h2 className="mt-2 font-heading text-2xl text-[#553747] sm:text-3xl">
                Manage Products
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={refreshProducts}
                disabled={isBusy || isRefreshing}
                className="inline-flex items-center gap-2 rounded-full border border-[#EADCE2] bg-white px-5 py-3 text-sm text-[#705565] disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    isRefreshing
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={startCreating}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-full bg-[#553747] px-5 py-3 text-sm text-white hover:bg-[#80566B] disabled:opacity-50"
              >
                <Plus size={17} />
                Add Product
              </button>
            </div>
          </div>

          {/* STATUS FEEDBACK */}
          {pageMessage && (
            <p
              role="status"
              className="mt-6 rounded-xl border border-[#EADCE2] bg-white px-4 py-3 text-sm text-[#705565]"
            >
              {pageMessage}
            </p>
          )}

          {pageState.error && (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {pageState.error}
            </p>
          )}

          {/* PRODUCT CARDS */}
          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
            {pageState.products.map((product) => {
              const stock = totalProductStock(product);

              const changingStatus =
                statusProductId === product._id;

              return (
                <div
                  key={product._id}
                  className="rounded-[22px] border border-[#F0E5E9] bg-white p-5 shadow-[0_8px_26px_rgba(84,55,70,0.03)]"
                >
                  {/* IMAGE AND DETAILS */}
                  <div className="flex items-start gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#FBF3F6]">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-contain p-2"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-[#A6758D]">
                        {product.category}
                      </p>

                      <h3 className="mt-1 font-heading text-xl text-[#553747]">
                        {product.name}
                      </h3>

                      <p className="mt-2 text-xs text-[#917F87]">
                        {stock} units · ID{" "}
                        {product.legacyId}
                      </p>

                      <span
                        className={`mt-3 inline-block rounded-full px-3 py-1 text-[11px] ${
                          product.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-[#F8EDF2] text-[#95677D]"
                        }`}
                      >
                        {product.isActive
                          ? "Published"
                          : "Draft / Inactive"}
                      </span>
                    </div>
                  </div>

                  {/* PRODUCT ACTIONS */}
                  <div className="mt-5 flex flex-wrap gap-3 border-t border-[#F0E5E9] pt-5">

                    {/* EDIT BUTTON */}
                    <button
                      type="button"
                      disabled={isBusy || isRefreshing}
                      onClick={() =>
                        startEditing(product)
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-[#EADCE2] px-4 py-2.5 text-xs text-[#705565] hover:bg-[#FFF5F8] disabled:opacity-50"
                    >
                      {isLoadingEditor ? (
                        <LoaderCircle
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <Edit3 size={15} />
                      )}
                      Edit
                    </button>

                    {/* PUBLISH / UNPUBLISH BUTTON */}
                    <button
                      type="button"
                      disabled={isBusy || isRefreshing}
                      onClick={() =>
                        changeProductStatus(product)
                      }
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs disabled:opacity-50 ${
                        product.isActive
                          ? "border border-[#EADCE2] text-[#705565]"
                          : "bg-[#553747] text-white hover:bg-[#80566B]"
                      }`}
                    >
                      {changingStatus ? (
                        <LoaderCircle
                          size={15}
                          className="animate-spin"
                        />
                      ) : product.isActive ? (
                        <EyeOff size={15} />
                      ) : (
                        <Eye size={15} />
                      )}

                      {product.isActive
                        ? "Unpublish"
                        : "Publish"}
                    </button>

                    {/* INVENTORY LINK */}
                    <Link
                      to="/admin/inventory"
                      className="inline-flex items-center rounded-full border border-[#EADCE2] px-4 py-2.5 text-xs text-[#705565] hover:bg-[#FFF5F8]"
                    >
                      Manage Stock
                    </Link>
                    
 {/* DELETE PRODUCT BUTTON */}
 <button
   type="button"
   // Only allow deletion of unpublished products.
   disabled={isBusy || isRefreshing || product.isActive}
   // Call the deletion function for this product.
   onClick={() => deleteProduct(product)}
   // Use a soft red style to distinguish deletion.
   className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2.5 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
 >
   {/* Show a spinner while this product is deleting. */}
   {deletingProductId === product._id ? (
     <LoaderCircle size={15} className="animate-spin" />
   ) : (
     <Trash2 size={15} />
   )}

   {/* Change the button label during deletion. */}
   {deletingProductId === product._id
     ? "Deleting..."
     : "Delete"}
 </button>

                  </div>

                  {!product.isActive && stock === 0 && (
                    <p className="mt-3 text-xs leading-5 text-[#9D8B94]">
                      Add available stock in Inventory
                      before publishing this product.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ====================================
            ADD / EDIT PRODUCT FORM
        ==================================== */}
        {showForm && (
          <section
            id="product-editor"
            className="scroll-mt-24 pt-12"
          >
            <div className="rounded-[26px] border border-[#F0E5E9] bg-white p-6 shadow-[0_8px_26px_rgba(84,55,70,0.035)] sm:p-9">

              {/* FORM HEADER */}
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B1849B]">
                    {editingId
                      ? "Update Collection Piece"
                      : "New Collection Piece"}
                  </p>

                  <h2 className="mt-2 font-heading text-3xl text-[#553747]">
                    {editingId
                      ? "Edit Product"
                      : "Add New Product"}
                  </h2>

                  <p className="mt-3 text-sm text-[#917F87]">
                    {editingId
                      ? "Make changes to your product and save them."
                      : "Upload your photos and complete the product details."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-full border border-[#EADCE2] px-4 py-2.5 text-sm text-[#705565] disabled:opacity-50"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-7"
              >
                {/* BASIC DETAILS */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Product Name">
                    <input
                      className={inputClass}
                      required
                      maxLength={120}
                      disabled={isBusy}
                      value={form.name}
                      onChange={(event) =>
                        updateField(
                          "name",
                          event.target.value
                        )
                      }
                      placeholder="e.g. Water Wave Wig"
                    />
                  </Field>

                  <Field label="Category">
                    <select
                      className={inputClass}
                      disabled={isBusy}
                      value={form.category}
                      onChange={(event) =>
                        updateField(
                          "category",
                          event.target.value
                        )
                      }
                    >
                      {categories.map((category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Starting Price (₦)">
                    <input
                      className={inputClass}
                      type="number"
                      min="1"
                      step="1"
                      required
                      disabled={isBusy}
                      value={form.basePrice}
                      onChange={(event) =>
                        updateField(
                          "basePrice",
                          event.target.value
                        )
                      }
                      placeholder="85000"
                    />
                  </Field>

                  <div className="rounded-xl border border-[#F0E5E9] bg-[#FBF7F9] px-4 py-3">
                    <p className="text-sm font-medium text-[#654A58]">
                      Product Visibility
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#917F87]">
                      Use Publish / Unpublish on the
                      product card to control visibility.
                    </p>
                  </div>
                </div>

                {/* MAIN IMAGE */}
                <div className="border-t border-[#F0E5E9] pt-7">
                  <h3 className="font-heading text-2xl text-[#553747]">
                    Main Product Image
                  </h3>

                  <p className="mt-2 text-sm text-[#917F87]">
                    Upload a new photo to replace
                    the current main image.
                  </p>

                  <div className="mt-6 max-w-md">
                    <ImageUploadField
                      label="Product Photo"
                      imageUrl={form.image}
                      uploading={
                        imageUpload.target === "main"
                      }
                      uploadError={
                        imageUpload.errorTarget === "main"
                          ? imageUpload.error
                          : ""
                      }
                      disabled={isBusy}
                      onFileSelected={(file) =>
                        uploadProductImage(file, "main")
                      }
                    />
                  </div>
                </div>

                {/* DESCRIPTION */}
                <Field label="Product Description">
                  <textarea
                    className={`${inputClass} min-h-[125px] resize-y`}
                    required
                    maxLength={3000}
                    disabled={isBusy}
                    value={form.description}
                    onChange={(event) =>
                      updateField(
                        "description",
                        event.target.value
                      )
                    }
                    placeholder="Describe the hair texture, quality and finish..."
                  />
                </Field>

                {/* HAIR VARIATIONS */}
                <div className="border-t border-[#F0E5E9] pt-7">
                  <h3 className="font-heading text-2xl text-[#553747]">
                    Hair Variations
                  </h3>

                  <p className="mt-2 text-sm text-[#917F87]">
                    Separate multiple options with commas.
                    Keep options used by existing stock records.
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field
                      label="Lengths (inches)"
                      hint="Example: 12, 14, 16, 18, 20"
                    >
                      <input
                        className={inputClass}
                        required
                        disabled={isBusy}
                        value={form.lengths}
                        onChange={(event) =>
                          updateField(
                            "lengths",
                            event.target.value
                          )
                        }
                        placeholder="12, 14, 16, 18"
                      />
                    </Field>

                    <Field
                      label="Densities"
                      hint="Leave blank if not applicable."
                    >
                      <input
                        className={inputClass}
                        disabled={isBusy}
                        value={form.densities}
                        onChange={(event) =>
                          updateField(
                            "densities",
                            event.target.value
                          )
                        }
                        placeholder="150%, 180%, 200%"
                      />
                    </Field>

                    <Field
                      label="Lace Types"
                      hint="Leave blank if not applicable."
                    >
                      <input
                        className={inputClass}
                        disabled={isBusy}
                        value={form.laceTypes}
                        onChange={(event) =>
                          updateField(
                            "laceTypes",
                            event.target.value
                          )
                        }
                        placeholder="4x4 Closure, 13x4 Frontal"
                      />
                    </Field>
                  </div>
                </div>

                {/* COLOUR VARIATIONS */}
                <div className="border-t border-[#F0E5E9] pt-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-2xl text-[#553747]">
                        Product Colours
                      </h3>

                      <p className="mt-2 text-sm text-[#917F87]">
                        Add colours and upload their matching photos.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addColor}
                      disabled={
                        isBusy ||
                        form.colors.length >= 30
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-[#EADCE2] bg-white px-4 py-2.5 text-sm text-[#705565] disabled:opacity-50"
                    >
                      <Plus size={16} />
                      Add Colour
                    </button>
                  </div>

                  <div className="mt-6 space-y-5">
                    {form.colors.map((color, index) => {
                      const uploadTarget =
                        `color-${index}`;

                      return (
                        <div
                          key={index}
                          className="rounded-2xl border border-[#F0E5E9] bg-[#FFFCFA] p-5"
                        >
                          {/* COLOUR HEADER */}
                          <div className="mb-5 flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-[#654A58]">
                              Colour {index + 1}
                            </p>

                            {form.colors.length > 1 && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  removeColor(index)
                                }
                                aria-label={`Remove colour ${index + 1}`}
                                className="text-[#A6758D] hover:text-red-600 disabled:opacity-50"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>

                          {/* COLOUR DETAILS */}
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <Field label="Colour Name">
                              <input
                                className={inputClass}
                                required
                                maxLength={60}
                                disabled={isBusy}
                                value={color.name}
                                onChange={(event) =>
                                  updateColor(
                                    index,
                                    "name",
                                    event.target.value
                                  )
                                }
                                placeholder="Natural Black"
                              />
                            </Field>

                            <Field label="Colour Swatch">
                              <input
                                type="color"
                                value={color.hex}
                                disabled={isBusy}
                                onChange={(event) =>
                                  updateColor(
                                    index,
                                    "hex",
                                    event.target.value
                                  )
                                }
                                className="h-[48px] w-full cursor-pointer rounded-xl border border-[#EBDDE4] bg-white p-2"
                              />
                            </Field>

                            <Field
                              label="Extra Colour Price (₦)"
                              hint="Use 0 if there is no extra charge."
                            >
                              <input
                                className={inputClass}
                                type="number"
                                min="0"
                                step="1"
                                required
                                disabled={isBusy}
                                value={color.extraPrice}
                                onChange={(event) =>
                                  updateColor(
                                    index,
                                    "extraPrice",
                                    event.target.value
                                  )
                                }
                              />
                            </Field>
                          </div>

                          {/* COLOUR IMAGE */}
                          <div className="mt-6 border-t border-[#F0E5E9] pt-6">
                            <div className="max-w-md">
                              <ImageUploadField
                                label={`${color.name || `Colour ${index + 1}`} Image`}
                                imageUrl={color.image}
                                uploading={
                                  imageUpload.target ===
                                  uploadTarget
                                }
                                uploadError={
                                  imageUpload.errorTarget ===
                                  uploadTarget
                                    ? imageUpload.error
                                    : ""
                                }
                                disabled={isBusy}
                                onFileSelected={(file) =>
                                  uploadProductImage(
                                    file,
                                    uploadTarget,
                                    index
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SAVE FEEDBACK */}
                {saveError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {saveError}
                  </p>
                )}

                {saveSuccess && (
                  <p
                    role="status"
                    className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                  >
                    <CheckCircle2 size={17} />
                    {saveSuccess}
                  </p>
                )}

                {/* SAVE BUTTON */}
                <button
                  type="submit"
                  disabled={isBusy || isRefreshing}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-[#553747] px-6 py-4 text-sm font-medium text-white hover:bg-[#80566B] disabled:opacity-50"
                >
                  {isSaving || isUploading ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : editingId ? (
                    <Save size={18} />
                  ) : (
                    <Plus size={18} />
                  )}

                  {isUploading
                    ? "Uploading Image..."
                    : isSaving
                      ? "Saving Product..."
                      : editingId
                        ? "Save Product Changes"
                        : "Save New Product"}
                </button>

                <p className="text-center text-xs leading-5 text-[#9D8B94]">
                  Saving product changes does not
                  reset or overwrite inventory stock.
                </p>
              </form>
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-[#F0E5E9] py-7">
          <p className="font-heading text-xl text-[#553747]">
            JHAIRS.
          </p>

          <Link
            to="/admin/dashboard"
            className="text-xs text-[#A6758D] hover:text-[#553747]"
          >
            Return to Dashboard
          </Link>
        </footer>
      </div>
    </main>
  );
}

export default AdminProducts;
