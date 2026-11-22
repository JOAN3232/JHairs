import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Mail,
  MessageCircle,
  Clock3,
  CheckCircle2,
  Camera,
} from "lucide-react";

/**
 * JHAIRS — CONTACT PAGE
 *
 * Features:
 * - Minimal luxury introduction.
 * - Responsive customer enquiry form.
 * - Contact information.
 * - Frequently asked questions.
 * - Frontend form validation.
 *
 * Messages are NOT sent yet.
 * We will connect the form to our backend later.
 */

// Frequently asked questions displayed below the form.
const faqs = [
  {
    question: "How do I choose the right hair?",
    answer:
      "Explore our collections to compare styles, lengths and colours. You can also send us an enquiry if you need help choosing your ideal look.",
  },
  {
    question: "Can I choose my hair length and colour?",
    answer:
      "Yes! Our product pages let you explore the available lengths, colours and other options for each hair product.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Delivery times depend on your location and the shipping option available for your order. We'll provide confirmed delivery details when order processing is enabled.",
  },
  {
    question: "How can I track my order?",
    answer:
      "Order tracking will become available once our ordering and delivery systems are connected.",
  },
];

function Contact() {
  // Store the information entered into our contact form.
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  // Control which FAQ is expanded.
  const [openFaq, setOpenFaq] = useState(null);

  // Show a notice explaining the form's current status.
  const [showNotice, setShowNotice] = useState(false);

  // Update form values whenever a customer types.
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Hide the previous notice when editing.
    setShowNotice(false);
  };

  // Validate input before showing the frontend notice.
  const handleSubmit = (event) => {
    event.preventDefault();

    // Browser validates required inputs and email format.
    // Our backend will eventually handle message delivery.
    setShowNotice(true);
  };

  return (
    <main className="min-h-screen bg-[#FFFCFA]">
      {/* ======================================= */}
      {/* SECTION 1 — CONTACT INTRODUCTION        */}
      {/* ======================================= */}

      <section
        className="
          bg-ivory px-5 pb-10 pt-14
          sm:px-10 sm:pb-12 sm:pt-16
          lg:px-16 lg:pt-20
        "
      >
        <div className="mx-auto max-w-[800px] text-center">
          <p
            className="
              font-body text-[11px] font-medium
              uppercase tracking-[0.22em] text-rose
            "
          >
            We'd Love to Hear From You
          </p>

          <h1
            className="
              mt-4 font-heading text-4xl
              font-medium text-plum
              sm:text-5xl lg:text-6xl
            "
          >
            Let's <span className="text-rose">Connect.</span>
          </h1>

          <p
            className="
              mx-auto mt-5 max-w-[570px]
              font-body text-sm leading-7
              text-plum/65 sm:text-base
            "
          >
            Have a question about our hair or need a little guidance? We're here
            to help you find your perfect look.
          </p>

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

      {/* ======================================= */}
      {/* SECTION 2 — CONTACT FORM AND INFO       */}
      {/* ======================================= */}

      <section
        className="
          px-5 pb-20 pt-10
          sm:px-10 sm:pt-12
          lg:px-16 lg:pb-24
        "
      >
        <div
          className="
            mx-auto grid max-w-[1200px]
            grid-cols-1 items-start gap-10
            lg:grid-cols-[minmax(0,1fr)_360px]
            lg:gap-12
          "
        >
          {/* ========== CONTACT FORM ========== */}

          <div
            className="
              min-w-0 rounded-[28px]
              border border-plum/5
              bg-white p-5
              sm:p-8 lg:p-10
            "
          >
            <p
              className="
                font-body text-[11px]
                uppercase tracking-[0.18em] text-rose
              "
            >
              Send an Enquiry
            </p>

            <h2
              className="
                mt-3 font-heading text-2xl
                text-plum sm:text-3xl
              "
            >
              How Can We Help?
            </h2>

            <p
              className="
                mt-3 font-body text-sm
                leading-7 text-plum/60
              "
            >
              Fill in your details and tell us what's on your mind.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* Name and email fields */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-body text-sm text-plum/75">
                    Your Name *
                  </span>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                    placeholder="Full name"
                    className="
                      w-full rounded-2xl border
                      border-plum/10 bg-white
                      px-4 py-3.5 font-body text-base
                      text-plum outline-none
                      placeholder:text-plum/30
                      focus:border-rose
                    "
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-body text-sm text-plum/75">
                    Email Address *
                  </span>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="
                      w-full rounded-2xl border
                      border-plum/10 bg-white
                      px-4 py-3.5 font-body text-base
                      text-plum outline-none
                      placeholder:text-plum/30
                      focus:border-rose
                    "
                  />
                </label>
              </div>

              {/* Enquiry topic */}
              <label className="block">
                <span className="mb-2 block font-body text-sm text-plum/75">
                  What Is Your Enquiry About? *
                </span>

                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="
                    w-full rounded-2xl border
                    border-plum/10 bg-white
                    px-4 py-3.5 font-body text-base
                    text-plum outline-none
                    focus:border-rose
                  "
                >
                  <option value="" disabled>
                    Select a topic
                  </option>

                  <option value="Product Enquiry">Product Enquiry</option>

                  <option value="Hair Recommendations">
                    Hair Recommendations
                  </option>

                  <option value="Delivery Information">
                    Delivery Information
                  </option>

                  <option value="Order Enquiry">Order Enquiry</option>

                  <option value="Other">Other</option>
                </select>
              </label>

              {/* Customer message */}
              <label className="block">
                <span className="mb-2 block font-body text-sm text-plum/75">
                  Your Message *
                </span>

                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  required
                  minLength={10}
                  placeholder="Tell us how we can help..."
                  className="
                    w-full resize-y rounded-2xl
                    border border-plum/10
                    bg-white px-4 py-3.5
                    font-body text-base text-plum
                    outline-none
                    placeholder:text-plum/30
                    focus:border-rose
                  "
                />
              </label>

              {/* Form-status notice */}
              {showNotice && (
                <div
                  role="status"
                  className="
                    flex items-start gap-3
                    rounded-2xl bg-ivory p-4
                  "
                >
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-rose"
                  />

                  <p className="font-body text-sm leading-6 text-plum/70">
                    Your details are complete! Message submission will be
                    available once our contact service is connected. Nothing has
                    been sent yet.
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                className="
                  inline-flex w-full items-center
                  justify-center gap-3
                  rounded-full bg-plum px-8 py-4
                  font-body text-sm font-medium
                  text-white transition-colors
                  hover:bg-rose sm:w-auto
                "
              >
                Check My Enquiry
                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          {/* ========== CONTACT INFORMATION ========== */}

          <aside className="min-w-0 space-y-6">
            <div
              className="
                rounded-[28px] bg-ivory
                p-6 sm:p-8
              "
            >
              <p
                className="
                  font-body text-[11px]
                  uppercase tracking-[0.18em] text-rose
                "
              >
                Stay Connected
              </p>

              <h2
                className="
                  mt-3 font-heading text-2xl
                  text-plum
                "
              >
                We're Here For You
              </h2>

              <p className="mt-3 font-body text-sm leading-7 text-plum/60">
                Whether you're exploring a new hairstyle or have questions about
                our collection, we'd love to help.
              </p>

              <div className="mt-8 space-y-7">
                {/* Email details */}
                <div className="flex items-start gap-4">
                  <div
                    className="
                      flex h-11 w-11 shrink-0
                      items-center justify-center
                      rounded-full bg-white text-rose
                    "
                  >
                    <Mail size={20} strokeWidth={1.6} />
                  </div>

                  <div>
                    <h3 className="font-body text-sm font-semibold text-plum">
                      Email
                    </h3>
                    <p className="mt-1 font-body text-sm leading-6 text-plum/60">
                      Email contact details will be added when the store is
                      ready.
                    </p>
                  </div>
                </div>

                {/* Chat support */}
                <div className="flex items-start gap-4">
                  <div
                    className="
                      flex h-11 w-11 shrink-0
                      items-center justify-center
                      rounded-full bg-white text-rose
                    "
                  >
                    <MessageCircle size={20} strokeWidth={1.6} />
                  </div>

                  <div>
                    <h3 className="font-body text-sm font-semibold text-plum">
                      Customer Support
                    </h3>
                    <p className="mt-1 font-body text-sm leading-6 text-plum/60">
                      Our customer support channel will be available soon.
                    </p>
                  </div>
                </div>

                {/* Support information */}
                <div className="flex items-start gap-4">
                  <div
                    className="
                      flex h-11 w-11 shrink-0
                      items-center justify-center
                      rounded-full bg-white text-rose
                    "
                  >
                    <Clock3 size={20} strokeWidth={1.6} />
                  </div>

                  <div>
                    <h3 className="font-body text-sm font-semibold text-plum">
                      Support Hours
                    </h3>
                    <p className="mt-1 font-body text-sm leading-6 text-plum/60">
                      Business hours will be announced when the store launches.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social media card */}
            <div
              className="
                rounded-[28px] border border-plum/5
                bg-white p-6 sm:p-8
              "
            >
              {/* Social media icon */}
              <Camera size={25} strokeWidth={1.5} className="text-rose" />
              <h3
                className="
                  mt-4 font-heading text-xl
                  text-plum
                "
              >
                Follow JHAIRS
              </h3>

              <p className="mt-2 font-body text-sm leading-7 text-plum/60">
                Hair inspiration, new collections and beautiful looks — all in
                one place.
              </p>

              <p
                className="
                  mt-4 font-body text-xs
                  uppercase tracking-[0.12em]
                  text-rose
                "
              >
                Social links coming soon
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* ======================================= */}
      {/* SECTION 3 — FREQUENTLY ASKED QUESTIONS  */}
      {/* ======================================= */}

      <section
        className="
          bg-ivory px-5 py-16
          sm:px-10 sm:py-20
          lg:px-16 lg:py-24
        "
      >
        <div className="mx-auto max-w-[800px]">
          <div className="text-center">
            <p
              className="
                font-body text-[11px]
                uppercase tracking-[0.2em] text-rose
              "
            >
              Good To Know
            </p>

            <h2
              className="
                mt-4 font-heading text-3xl
                text-plum sm:text-4xl
              "
            >
              Frequently Asked Questions
            </h2>

            <p className="mt-4 font-body text-sm leading-7 text-plum/60">
              A few answers to help you shop with confidence.
            </p>
          </div>

          {/* Expandable questions */}
          <div className="mt-10 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div
                  key={faq.question}
                  className="
                    overflow-hidden rounded-2xl
                    border border-plum/5 bg-white
                  "
                >
                  {/* FAQ question button */}
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    className="
                      flex w-full items-center
                      justify-between gap-4
                      px-5 py-5 text-left
                      sm:px-6
                    "
                  >
                    <span
                      className="
                        font-body text-sm
                        font-medium text-plum
                        sm:text-base
                      "
                    >
                      {faq.question}
                    </span>

                    <ChevronDown
                      size={20}
                      strokeWidth={1.6}
                      className={`
                        shrink-0 text-rose
                        transition-transform duration-300
                        ${isOpen ? "rotate-180" : ""}
                      `}
                    />
                  </button>

                  {/* FAQ answer */}
                  {isOpen && (
                    <div
                      id={`faq-answer-${index}`}
                      className="
                        px-5 pb-6 font-body
                        text-sm leading-7
                        text-plum/60 sm:px-6
                      "
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Contact;
