"use client";

import Image from "next/image";
import { RefObject } from "react";

interface MicrochefChatComposerProps {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  canSend: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}

export default function MicrochefChatComposer({
  inputRef,
  value,
  canSend,
  onChange,
  onSend,
}: MicrochefChatComposerProps) {
  return (
    <div className="mt-2.5 flex items-end gap-2">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onInput={(event) => {
          const target = event.currentTarget;
          target.style.height = "0px";
          const nextHeight = Math.min(target.scrollHeight, 136);
          target.style.height = `${Math.max(nextHeight, 38)}px`;
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (canSend) onSend();
          }
        }}
        placeholder="Например: курица, рис, сливки, чеснок"
        rows={1}
        className="no-scrollbar max-h-34 min-h-9 flex-1 resize-none overflow-y-auto rounded-xl border border-[#E4DDCF] bg-[#FFFEFC] px-3 py-2 text-sm leading-5 outline-none transition-colors focus:border-[#D9C5A6]"
      />
      <button
        type="button"
        disabled={!canSend}
        onClick={onSend}
        className="inline-flex h-9 items-center gap-1.5 self-end rounded-full bg-umami-green px-3 py-1.5 font-nunito text-xs font-bold text-white disabled:opacity-50"
      >
        Отправить
        <Image src="/PaperPlane.svg" alt="send" width={16} height={16} />
      </button>
    </div>
  );
}
