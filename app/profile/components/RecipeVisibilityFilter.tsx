"use client";

interface RecipeVisibilityFilterProps {
  value: "all" | "public" | "private";
  totalCount: number;
  publicCount: number;
  privateCount: number;
  onChange: (value: "all" | "public" | "private") => void;
}

export default function RecipeVisibilityFilter({
  value,
  totalCount,
  publicCount,
  privateCount,
  onChange,
}: RecipeVisibilityFilterProps) {
  return (
    <div className="mb-2.5 flex gap-2.5">
      <button
        onClick={() => onChange("all")}
        className={`rounded-full px-4 py-1.5 font-nunito text-xs font-bold transition-colors ${
          value === "all"
            ? "bg-umami-green text-white"
            : "bg-white border border-[#eaeaea] text-umami-gray hover:bg-gray-50"
        }`}
      >
        Все ({totalCount})
      </button>
      <button
        onClick={() => onChange("public")}
        className={`rounded-full px-4 py-1.5 font-nunito text-xs font-bold transition-colors ${
          value === "public"
            ? "bg-umami-green text-white"
            : "bg-white border border-[#eaeaea] text-umami-gray hover:bg-gray-50"
        }`}
      >
        Публичные ({publicCount})
      </button>
      <button
        onClick={() => onChange("private")}
        className={`rounded-full px-4 py-1.5 font-nunito text-xs font-bold transition-colors ${
          value === "private"
            ? "bg-umami-green text-white"
            : "bg-white border border-[#eaeaea] text-umami-gray hover:bg-gray-50"
        }`}
      >
        Приватные ({privateCount})
      </button>
    </div>
  );
}
