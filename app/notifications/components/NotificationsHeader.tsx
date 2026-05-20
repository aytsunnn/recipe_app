"use client";

import Image from "next/image";

interface NotificationsHeaderProps {
  unreadCount: number;
  totalCount: number;
  actionBusy: "readAll" | "clearAll" | null;
  hasItems: boolean;
  onReadAll: () => void;
  onClearAll: () => void;
}

export default function NotificationsHeader({
  unreadCount,
  totalCount,
  actionBusy,
  hasItems,
  onReadAll,
  onClearAll,
}: NotificationsHeaderProps) {
  return (
    <div className="rounded-2xl border border-umami-light-gray/50 bg-gradient-to-r from-[#fff7ea] to-[#fffdf8] p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-nunito text-lg font-bold text-umami-dark-gray sm:text-2xl">
            Уведомления
          </h1>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-umami-orange px-1.5 text-[10px] font-bold text-white sm:h-6 sm:min-w-6 sm:px-2 sm:text-xs">
            {unreadCount}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReadAll}
            disabled={actionBusy === "readAll" || !hasItems}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-umami-light-gray/50 bg-white transition-colors hover:bg-[#f9f4e9] disabled:opacity-60 sm:h-9 sm:w-9"
            title="Прочитать все"
            aria-label="Прочитать все"
          >
            <Image width={18} height={18} src="/checks.svg" alt="read-all" />
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={actionBusy === "clearAll" || !hasItems}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-umami-light-gray/50 bg-white transition-colors hover:bg-[#fff1ef] disabled:opacity-60 sm:h-9 sm:w-9"
            title="Очистить историю"
            aria-label="Очистить историю"
          >
            <Image width={18} height={18} src="/trashsimple.svg" alt="clear-all" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-umami-gray sm:text-xs">
        <span className="rounded-full bg-white/80 px-2 py-1">Всего: {totalCount}</span>
        <span className="rounded-full bg-white/80 px-2 py-1">
          Непрочитанных: {unreadCount}
        </span>
      </div>
    </div>
  );
}
