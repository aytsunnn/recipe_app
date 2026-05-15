"use client";

interface ModerationTabsProps {
  activeTab: "reports" | "users";
  onChange: (tab: "reports" | "users") => void;
}

export default function ModerationTabs({
  activeTab,
  onChange,
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
      </div>
    </div>
  );
}
