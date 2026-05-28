"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  metaService,
  Kitchen,
  Category,
  Celebration,
  Cooking,
} from "../../services/metaService";

interface FiltersPanelProps {
  onApplyFilters: (filters: FilterValues) => void;
  resultsCount?: number;
}

export interface FilterValues {
  difficulty?: string[];
  kitchen_id?: number[];
  celebration_id?: number[];
  cooking_id?: number[];
  category_id?: number[];
}

interface Option {
  value: string;
  label: string;
}

type FilterKey =
  | "category_id"
  | "celebration_id"
  | "kitchen_id"
  | "cooking_id"
  | "difficulty";

const FILTER_KEYS: FilterKey[] = [
  "category_id",
  "celebration_id",
  "kitchen_id",
  "cooking_id",
  "difficulty",
];

const parseMultiParam = (value: string | null): string[] =>
  value ? value.split(",").filter(Boolean) : [];

const fieldLabels: Record<FilterKey, string> = {
  category_id: "Категория",
  celebration_id: "Праздник",
  kitchen_id: "Национальная кухня",
  cooking_id: "Тип приготовления",
  difficulty: "Сложность",
};

const difficultyOptions: Option[] = [
  { value: "1", label: "Легко" },
  { value: "2", label: "Средне" },
  { value: "3", label: "Сложно" },
];

export default function FiltersPanel({
  onApplyFilters,
  resultsCount,
}: FiltersPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<FilterValues>({});
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [cookings, setCookings] = useState<Cooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const chipsRowRef = useRef<HTMLDivElement | null>(null);
  const optionsRowRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const draggingTargetRef = useRef<"chips" | "options" | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);

  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const data = await metaService.getAll();
        setKitchens(data.kitchens);
        setCategories(data.categories);
        setCelebrations(data.celebrations);
        setCookings(data.cookings);
      } catch (error) {
        console.error("Ошибка при загрузке данных фильтров:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadFilterData();
  }, []);

  useEffect(() => {
    const nextFilters: FilterValues = {};
    const difficulty = parseMultiParam(searchParams?.get("difficulty") || null);
    const kitchenIds = parseMultiParam(
      searchParams?.get("kitchen_id") || null
    ).map(Number);
    const categoryIds = parseMultiParam(
      searchParams?.get("category_id") || null
    ).map(Number);
    const celebrationIds = parseMultiParam(
      searchParams?.get("celebration_id") || null
    ).map(Number);
    const cookingIds = parseMultiParam(
      searchParams?.get("cooking_id") || null
    ).map(Number);

    if (difficulty.length > 0) nextFilters.difficulty = difficulty;
    if (kitchenIds.length > 0) nextFilters.kitchen_id = kitchenIds;
    if (categoryIds.length > 0) nextFilters.category_id = categoryIds;
    if (celebrationIds.length > 0) nextFilters.celebration_id = celebrationIds;
    if (cookingIds.length > 0) nextFilters.cooking_id = cookingIds;

    Promise.resolve().then(() => {
      setFilters(nextFilters);
    });
  }, [searchParams]);

  const optionMap = useMemo<Record<FilterKey, Option[]>>(
    () => ({
      category_id: categories.map((item) => ({
        value: item.id,
        label: item.name,
      })),
      celebration_id: celebrations.map((item) => ({
        value: item.id,
        label: item.name,
      })),
      kitchen_id: kitchens.map((item) => ({
        value: item.id,
        label: item.name,
      })),
      cooking_id: cookings.map((item) => ({
        value: item.id,
        label: item.name,
      })),
      difficulty: difficultyOptions,
    }),
    [categories, celebrations, kitchens, cookings]
  );

  const getSelected = (key: FilterKey): string[] => {
    if (key === "difficulty") return filters.difficulty || [];
    return ((filters[key] as number[] | undefined) || []).map(String);
  };

  const setSelected = (
    key: FilterKey,
    values: string[],
    options?: { keepPanelOpen?: boolean }
  ) => {
    const params = new URLSearchParams(searchParams?.toString() || "");

    if (values.length > 0) {
      params.set(key, values.join(","));
      params.set("filters", "true");
    } else {
      params.delete(key);
    }

    const hasAnyActiveFilter = FILTER_KEYS.some((filterKey) => {
      const rawValue = params.get(filterKey);
      return Boolean(rawValue && rawValue.trim().length > 0);
    });
    if (!hasAnyActiveFilter) {
      if (options?.keepPanelOpen) {
        params.set("filters", "true");
      } else {
        params.delete("filters");
      }
    }

    const updatedFilters: FilterValues = {
      ...filters,
      [key]:
        key === "difficulty"
          ? values
          : values
              .map((item) => Number(item))
              .filter((item) => !Number.isNaN(item)),
    };

    setFilters(updatedFilters);
    const query = params.toString();
    router.push(query ? `/?${query}` : "/", { scroll: false });
    onApplyFilters(updatedFilters);
  };

  const selectedTotal = Object.values(filters).reduce(
    (acc, value) => acc + (Array.isArray(value) ? value.length : 0),
    0
  );

  const resetAll = () => {
    setFilters({});
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("difficulty");
    params.delete("kitchen_id");
    params.delete("category_id");
    params.delete("celebration_id");
    params.delete("cooking_id");
    params.delete("filters");
    params.delete("search");
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/?${query}` : "/", { scroll: false });
    onApplyFilters({});
    setOpenFilter(null);
  };

  const activeOptions = openFilter ? optionMap[openFilter] : [];
  const activeSelected = openFilter ? getSelected(openFilter) : [];

  const handleWheelScroll = (
    event: React.WheelEvent<HTMLDivElement>,
    target: "chips" | "options"
  ) => {
    const container =
      target === "chips" ? chipsRowRef.current : optionsRowRef.current;
    if (!container) return;
    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    event.preventDefault();
    container.scrollLeft += event.deltaY;
  };

  const handleDragStart = (
    event: React.MouseEvent<HTMLDivElement>,
    target: "chips" | "options"
  ) => {
    const container =
      target === "chips" ? chipsRowRef.current : optionsRowRef.current;
    if (!container) return;
    isDraggingRef.current = true;
    draggingTargetRef.current = target;
    dragStartXRef.current = event.clientX;
    dragStartScrollRef.current = container.scrollLeft;
  };

  const handleDragMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const target = draggingTargetRef.current;
    const container =
      target === "chips" ? chipsRowRef.current : optionsRowRef.current;
    if (!container) return;
    const delta = event.clientX - dragStartXRef.current;
    container.scrollLeft = dragStartScrollRef.current - delta;
  };

  const stopDragging = () => {
    isDraggingRef.current = false;
    draggingTargetRef.current = null;
  };

  const getRecipeWord = (count: number) => {
    const abs = Math.abs(count) % 100;
    const last = abs % 10;
    if (abs >= 11 && abs <= 14) return "рецептов";
    if (last === 1) return "рецепт";
    if (last >= 2 && last <= 4) return "рецепта";
    return "рецептов";
  };

  if (isLoading) {
    return (
      <div className="mb-2 rounded-2xl border border-[#E9E1D2] bg-[#FFFCF7] px-3 py-3">
        <p className="font-inter text-sm text-[#7A6B5A]">Загрузка фильтров...</p>
      </div>
    );
  }

  return (
    <div className="mb-2 rounded-2xl border border-[#E9E1D2] bg-[#FFFCF7] px-2.5 py-2.5 md:px-3 md:py-3">
      <div
        ref={chipsRowRef}
        className="no-scrollbar flex flex-nowrap gap-2 overflow-x-auto pb-1 cursor-grab select-none active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none]"
        onWheel={(event) => handleWheelScroll(event, "chips")}
        onMouseDown={(event) => handleDragStart(event, "chips")}
        onMouseMove={handleDragMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        {selectedTotal > 0 && (
          <button
            onClick={resetAll}
            className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-[#D7C7AB] bg-[#FFF6E9] px-3 font-nunito text-[#7B6140] transition-colors hover:bg-[#FDECD1]"
          >
            <span className="text-[12px] font-bold md:text-sm">Сбросить фильтры</span>
            <Image src="/X.svg" alt="cross" width={15} height={15} />
          </button>
        )}

        {(Object.keys(fieldLabels) as FilterKey[]).map((key) => {
          const selectedCount = getSelected(key).length;
          const isOpen = openFilter === key;

          return (
            <button
              key={key}
              onClick={() =>
                setOpenFilter((prev) => (prev === key ? null : key))
              }
              className={`flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 font-nunito transition-colors ${
                isOpen
                  ? "border-[#E3B679] bg-[#FFE8C5] text-[#5B4630]"
                  : "border-[#E3D7C6] bg-white text-[#65513D] hover:bg-[#FFF4E4]"
              }`}
            >
              <span className="text-[12px] font-bold md:text-sm">{fieldLabels[key]}</span>
              {selectedCount > 0 && (
                <span className="text-[12px] font-bold text-[#D7862A] md:text-sm">
                  {selectedCount}
                </span>
              )}
              <Image
                src="/CaretDown.svg"
                alt="toggle"
                width={14}
                height={14}
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          );
        })}
      </div>

      {openFilter && (
        <div
          ref={optionsRowRef}
          className="no-scrollbar mt-3 flex flex-nowrap gap-2 overflow-x-auto rounded-xl border border-[#F0E5D6] bg-white p-2 cursor-grab select-none active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none]"
          onWheel={(event) => handleWheelScroll(event, "options")}
          onMouseDown={(event) => handleDragStart(event, "options")}
          onMouseMove={handleDragMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
        >
          <button
            onClick={() =>
              setSelected(
                openFilter,
                activeOptions.map((item) => item.value)
              )
            }
              className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#9CC199] bg-[#EDF8EC] px-3 font-nunito text-[12px] font-bold text-[#426F3F] md:h-9 md:gap-2 md:px-4 md:text-sm"
          >
            <Image src="/DoneCircle.svg" alt="select-all" width={14} height={14} />
            Выбрать все
          </button>
          <button
            onClick={() => {
              setSelected(openFilter, [], { keepPanelOpen: true });
              setOpenFilter(null);
            }}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#D7C7AB] bg-[#FFF6E9] px-3 font-nunito text-[12px] font-bold text-[#7B6140] md:h-9 md:gap-2 md:px-4 md:text-sm"
          >
            <Image src="/X.svg" alt="clear-all" width={14} height={14} />
            Сбросить все
          </button>

          {activeOptions.map((option) => {
            const isSelected = activeSelected.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => {
                  if (isSelected) {
                    setSelected(
                      openFilter,
                      activeSelected.filter((item) => item !== option.value)
                    );
                    return;
                  }
                  setSelected(openFilter, [...activeSelected, option.value]);
                }}
                className={`h-8 rounded-full border px-3 font-nunito text-[12px] font-bold transition-colors md:h-9 md:px-4 md:text-sm ${
                  isSelected
                    ? "border-[#E3B679] bg-[#FFEED5] text-[#B66B1F]"
                    : "border-[#E8DDCF] bg-[#FFFDFA] text-[#65513D] hover:bg-[#FFF4E4]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      {typeof resultsCount === "number" && (
        <p className="mt-2 text-center font-nunito text-sm font-bold text-[#7A6B5A]">
          Найдено <span className="text-[#B66B1F]">{resultsCount}</span>{" "}
          {getRecipeWord(resultsCount)}
        </p>
      )}
    </div>
  );
}
