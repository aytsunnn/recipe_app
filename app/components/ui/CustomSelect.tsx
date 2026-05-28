"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

export type CustomSelectOption = {
  value: string;
  label: string;
  muted?: boolean;
};

type CustomSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  optionClassName?: string;
  disabled?: boolean;
};

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Выберите значение",
  className = "",
  menuClassName = "",
  optionClassName = "",
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={`relative ${disabled ? "opacity-70" : ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 pr-10 text-left font-nunito text-sm outline-none transition-colors focus:border-umami-orange/60 ${className}`}
      >
        <span className={selectedOption?.muted ? "text-umami-gray" : "text-umami-dark-gray"}>
          {selectedOption?.label || placeholder}
        </span>
      </button>
      <Image
        src="/CaretDown.svg"
        alt=""
        width={16}
        height={16}
        className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      />

      {isOpen ? (
        <div
          className={`absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-umami-light-gray bg-white p-1 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ${menuClassName}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`block w-full rounded-xl px-3 py-2 text-left font-nunito text-sm transition-colors ${
                  isSelected
                    ? "bg-umami-orange/12 text-umami-orange"
                    : option.muted
                    ? "text-umami-gray hover:bg-[#faf9f6]"
                    : "text-umami-dark-gray hover:bg-[#faf9f6]"
                } ${optionClassName}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

