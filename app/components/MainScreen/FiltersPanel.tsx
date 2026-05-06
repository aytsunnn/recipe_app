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
  resultsCount = 0,
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
  const isDraggingRef = useRef(false);
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

    setFilters(nextFilters);
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

  const setSelected = (key: FilterKey, values: string[]) => {
    const params = new URLSearchParams(searchParams?.toString() || "");

    if (values.length > 0) {
      params.set(key, values.join(","));
      params.set("filters", "true");
    } else {
      params.delete(key);
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
    router.push(`/?${params.toString()}`, { scroll: false });
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

  const handleWheelScroll = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = chipsRowRef.current;
    if (!container || openFilter) return;
    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    event.preventDefault();
    container.scrollLeft += event.deltaY;
  };

  const handleDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    const container = chipsRowRef.current;
    if (!container || openFilter) return;
    isDraggingRef.current = true;
    dragStartXRef.current = event.clientX;
    dragStartScrollRef.current = container.scrollLeft;
  };

  const handleDragMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const container = chipsRowRef.current;
    if (!container || !isDraggingRef.current || openFilter) return;
    const delta = event.clientX - dragStartXRef.current;
    container.scrollLeft = dragStartScrollRef.current - delta;
  };

  const stopDragging = () => {
    isDraggingRef.current = false;
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
      <div className="mb-4 py-2">
        <p className="font-inter text-sm text-umami-gray">
          Загрузка фильтров...
        </p>
      </div>
    );
  }

  return (
    <div className="mb-2">
      <div
        ref={chipsRowRef}
        className={`flex gap-2 ${
          !openFilter
            ? "flex-nowrap overflow-x-auto pb-1 cursor-grab active:cursor-grabbing select-none"
            : "flex-wrap"
        }`}
        onWheel={handleWheelScroll}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        {selectedTotal > 0 && (
          <button
            onClick={resetAll}
            className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-umami-dark-gray px-3 font-nunito text-umami-dark-gray"
          >
            <span className="text-sm font-bold">Сбросить фильтры</span>
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
                  ? "border-umami-orange bg-[#fff8ef] text-umami-dark-gray"
                  : "border-umami-dark-gray text-umami-dark-gray"
              }`}
            >
              <span className="text-sm font-bold">{fieldLabels[key]}</span>
              {selectedCount > 0 && (
                <span className="text-sm font-bold text-umami-orange">
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
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() =>
              setSelected(
                openFilter,
                activeOptions.map((item) => item.value)
              )
            }
            className="h-9 rounded-full border border-umami-green px-4 font-nunito text-sm font-bold text-umami-green"
          >
            Выбрать все
          </button>
          <button
            onClick={() => setSelected(openFilter, [])}
            className="h-9 rounded-full border border-umami-dark-gray/60 px-4 font-nunito text-sm font-bold text-umami-gray"
          >
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
                className={`h-9 rounded-full border px-4 font-nunito text-sm font-bold transition-colors ${
                  isSelected
                    ? "border-umami-orange bg-[#fff8ef] text-umami-orange"
                    : "border-umami-dark-gray text-umami-dark-gray"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-center font-nunito text-sm font-bold text-umami-gray">
        Найдено <span className="text-umami-green">{resultsCount}</span>{" "}
        {getRecipeWord(resultsCount)}
      </p>
    </div>
  );
}
