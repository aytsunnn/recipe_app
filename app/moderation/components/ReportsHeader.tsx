"use client";

interface ReportsHeaderProps {
  reportsCount: number;
  reportsFilter: "in_work" | "resolved_group";
  onFilterChange: (value: "in_work" | "resolved_group") => void;
}

export default function ReportsHeader({
  reportsCount,
  reportsFilter,
  onFilterChange,
}: ReportsHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-nunito text-lg font-bold text-umami-dark-gray">
          Жалобы
        </h2>
        <p className="mt-1 text-sm text-umami-gray">Всего: {reportsCount}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onFilterChange("in_work")}
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            reportsFilter === "in_work"
              ? "bg-umami-orange text-white"
              : "bg-gray-100 text-umami-dark-gray"
          }`}
        >
          В работе
        </button>
        <button
          type="button"
          onClick={() => onFilterChange("resolved_group")}
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            reportsFilter === "resolved_group"
              ? "bg-umami-orange text-white"
              : "bg-gray-100 text-umami-dark-gray"
          }`}
        >
          Решенные
        </button>
      </div>
    </div>
  );
}
