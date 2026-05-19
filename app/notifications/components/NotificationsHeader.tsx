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
    <div className="rounded-2xl border border-umami-light-gray/50 bg-gradient-to-r from-[#fff7ea] to-[#fffdf8] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-nunito font-bold text-2xl text-umami-dark-gray">
            Уведомления
          </h1>
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-umami-orange px-2 text-xs font-bold text-white">
            {unreadCount}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReadAll}
            disabled={actionBusy === "readAll" || !hasItems}
            className="h-9 w-9 rounded-full border border-umami-light-gray/50 bg-white flex items-center justify-center transition-colors hover:bg-[#f9f4e9] disabled:opacity-60"
            title="Прочитать все"
            aria-label="Прочитать все"
          >
            <Image width={20} height={20} src="/checks.svg" alt="read-all" />
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={actionBusy === "clearAll" || !hasItems}
            className="h-9 w-9 rounded-full border border-umami-light-gray/50 bg-white flex items-center justify-center transition-colors hover:bg-[#fff1ef] disabled:opacity-60"
            title="Очистить историю"
            aria-label="Очистить историю"
          >
            <Image width={20} height={20} src="/trashsimple.svg" alt="clear-all" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-umami-gray">
        <span className="rounded-full bg-white/80 px-2 py-1">Всего: {totalCount}</span>
        <span className="rounded-full bg-white/80 px-2 py-1">
          Непрочитанных: {unreadCount}
        </span>
      </div>
    </div>
  );
}
