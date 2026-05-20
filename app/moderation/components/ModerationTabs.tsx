"use client";

interface ModerationTabsProps {
  activeTab: "analytics" | "reports" | "users" | "week-menu" | "broadcast" | "meta";
  onChange: (tab: "analytics" | "reports" | "users" | "week-menu" | "broadcast" | "meta") => void;
  isAdmin: boolean;
}

export default function ModerationTabs({ activeTab, onChange, isAdmin }: ModerationTabsProps) {
  return (
    <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-2 sm:p-3">
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
        {isAdmin ? (
          <button
            type="button"
            onClick={() => onChange("analytics")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 ${
              activeTab === "analytics"
                ? "bg-umami-orange text-white"
                : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
            }`}
          >
            Аналитика
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => onChange("reports")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 ${
            activeTab === "reports"
              ? "bg-umami-orange text-white"
              : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
          }`}
        >
          Жалобы
        </button>

        <button
          type="button"
          onClick={() => onChange("users")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 ${
            activeTab === "users"
              ? "bg-umami-orange text-white"
              : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
          }`}
        >
          Пользователи
        </button>

        {isAdmin ? (
          <>
            <button
              type="button"
              onClick={() => onChange("week-menu")}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 ${
                activeTab === "week-menu"
                  ? "bg-umami-orange text-white"
                  : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
              }`}
            >
              Меню недели
            </button>
            <button
              type="button"
              onClick={() => onChange("broadcast")}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 ${
                activeTab === "broadcast"
                  ? "bg-umami-orange text-white"
                  : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
              }`}
            >
              Рассылка
            </button>
            <button
              type="button"
              onClick={() => onChange("meta")}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 ${
                activeTab === "meta"
                  ? "bg-umami-orange text-white"
                  : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
              }`}
            >
              Meta
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
