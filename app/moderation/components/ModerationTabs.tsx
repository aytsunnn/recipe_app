"use client";

interface ModerationTabsProps {
  activeTab: "reports" | "users" | "week-menu";
  onChange: (tab: "reports" | "users" | "week-menu") => void;
  isAdmin: boolean;
}

export default function ModerationTabs({
  activeTab,
  onChange,
  isAdmin,
}: ModerationTabsProps) {
  return (
    <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-3">
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
        <button
          type="button"
          onClick={() => onChange("reports")}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
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
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
            activeTab === "users"
              ? "bg-umami-orange text-white"
              : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
          }`}
        >
          Пользователи
        </button>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => onChange("week-menu")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              activeTab === "week-menu"
                ? "bg-umami-orange text-white"
                : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
            }`}
          >
            Меню недели
          </button>
        ) : null}
      </div>
    </div>
  );
}
