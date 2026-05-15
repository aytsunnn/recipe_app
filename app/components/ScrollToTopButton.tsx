"use client";

import Image from "next/image";
import { RefObject, useEffect, useState } from "react";

interface ScrollToTopButtonProps {
  anchorRef: RefObject<HTMLElement | null>;
  thresholdPx?: number;
}

export default function ScrollToTopButton({
  anchorRef,
  thresholdPx = 1600,
}: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [leftOffset, setLeftOffset] = useState<number | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const gapFromFeed = 12;
      const buttonSize = 44;
      const maxLeft = window.innerWidth - buttonSize - 12;
      const computedLeft = Math.min(rect.right + gapFromFeed, maxLeft);
      setLeftOffset(Math.max(12, computedLeft));
    };

    const handleScroll = () => {
      setIsVisible(window.scrollY >= thresholdPx);
      updatePosition();
    };

    updatePosition();
    handleScroll();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [anchorRef, thresholdPx]);

  if (!isVisible) return null;
  if (leftOffset === null) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed top-[160px] z-40 flex h-11 w-11 items-center justify-center rounded-full border border-umami-light-gray bg-white shadow-md transition hover:bg-umami-light-gray/20"
      style={{ left: leftOffset }}
      aria-label="Наверх"
      title="Наверх"
    >
      <Image src="/CaretDown.svg" alt="" width={20} height={20} className="rotate-180" />
    </button>
  );
}
