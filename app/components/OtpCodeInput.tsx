"use client";

import { useEffect, useMemo, useRef } from "react";

interface OtpCodeInputProps {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
}

export default function OtpCodeInput({
  value,
  onChange,
  length = 6,
  disabled = false,
}: OtpCodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = useMemo(() => {
    const clean = value.replace(/\D/g, "").slice(0, length);
    return Array.from({ length }, (_, i) => clean[i] || "");
  }, [value, length]);

  useEffect(() => {
    const clean = value.replace(/\D/g, "").slice(0, length);
    if (clean !== value) {
      onChange(clean);
    }
  }, [value, length, onChange]);

  const setChar = (index: number, char: string) => {
    const next = [...chars];
    next[index] = char;
    onChange(next.join(""));
  };

  return (
    <div className="flex items-center gap-2">
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          value={char}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, "").slice(-1);
            setChar(index, digit);
            if (digit && index < length - 1) {
              refs.current[index + 1]?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !chars[index] && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
          className="h-11 w-10 rounded-xl border border-umami-orange/40 text-center font-nunito text-lg text-umami-dark-gray outline-none focus:border-umami-orange"
        />
      ))}
    </div>
  );
}
