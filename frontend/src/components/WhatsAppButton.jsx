
import { MessageCircle } from "lucide-react";

// ============================================
// JHAIRS — FLOATING WHATSAPP SUPPORT BUTTON
// ============================================

function WhatsAppButton() {
  // Seller's WhatsApp number in international format.
  const whatsappNumber = "2349136466679";

  // Pre-filled greeting for customers.
  const message =
    "Hello JHAIRS! I'd love to make an enquiry about your hair collections.";

  // Create the WhatsApp chat URL.
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with JHAIRS on WhatsApp"
      className="fixed bottom-6 right-5 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl sm:bottom-8 sm:right-8"
    >
      <MessageCircle size={27} strokeWidth={2} />

      {/* Small online indicator */}
      <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#16A34A]" />
    </a>
  );
}

export default WhatsAppButton;
