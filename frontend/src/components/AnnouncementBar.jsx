
import { useEffect, useState } from "react";

// Messages that will appear in our announcement bar.
const messages = [
  "WELCOME TO JHAIRS ✨",
  "LUXURY IN EVERY STRAND ♡",
  "YOUR CROWN, YOUR CONFIDENCE ✦",
  "DISCOVER YOUR PERFECT HAIR",
];

function AnnouncementBar() {
  // Tracks the current announcement.
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Automatically changes the message every 3 seconds.
    const interval = setInterval(() => {
      setCurrentIndex((previousIndex) =>
        (previousIndex + 1) % messages.length
      );
    }, 3000);

    // Clears the interval when the component unmounts.
    return () => clearInterval(interval);
  }, []);

  return (
    // Powder-blue announcement bar.
    <div className="flex h-9 items-center justify-center overflow-hidden bg-powder px-4">

      {/* Only the current announcement is displayed. */}
      <p
        key={currentIndex}
        className="jhairs-announcement font-body text-center text-[10px] font-medium tracking-[0.15em] text-plum sm:text-xs"
      >
        {messages[currentIndex]}
      </p>

    </div>
  );
}

export default AnnouncementBar;
