"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  metaService,
  Kitchen,
  Category,
  Celebration,
  Cooking,
} from "../../services/metaService";

interface FiltersPanelProps {
  onApplyFilters: (filters: FilterValues) => void;
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

interface MultiSelectProps {
  label: string;
  placeholder: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}

function MultiSelect({
  label,
  placeholder,
  options,
  selected,
  onChange,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabels = useMemo(
    () => options.filter((item) => selected.includes(item.value)).map((item) => item.label),
    [options, selected]
  );

  const toggleOption = (value: string) => {
    const hasValue = selected.includes(value);
    if (hasValue) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  };

  return (
    <div className="relative">
      <p className="mb-1.5 block font-nunito text-xs font-bold tracking-[0.02em] text-umami-gray">
        {label}
      </p>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border px-3 py-2 text-left font-nunito text-sm transition-colors ${
          isOpen
            ? "border-umami-orange bg-[#fff8ef] text-umami-dark-gray"
            : "border-umami-light-gray/50 bg-white text-umami-dark-gray hover:border-umami-light-gray"
        }`}
      >
        <span className="truncate">
          {selectedLabels.length > 0
            ? `${selectedLabels.slice(0, 2).join(", ")}${
                selectedLabels.length > 2 ? ` +${selectedLabels.length - 2}` : ""
              }`
            : placeholder}
        </span>
        <span className="rounded-full bg-[#f3ede3] px-2 py-0.5 text-[11px] font-bold text-umami-gray">
          {selected.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-umami-light-gray/50 bg-white p-2 shadow-[0_10px_30px_rgba(51,51,51,0.12)]">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded-full bg-[#eef3ea] px-2.5 py-1 font-nunito text-[11px] font-bold text-umami-green"
              onClick={() => onChange(options.map((item) => item.value))}
            >
              Выбрать все
            </button>
            <button
              type="button"
              className="rounded-full bg-[#f5f5f5] px-2.5 py-1 font-nunito text-[11px] font-bold text-umami-gray"
              onClick={() => onChange([])}
            >
              Очистить
            </button>
          </div>
          <div className="space-y-1">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-umami-light-yellow"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => toggleOption(option.value)}
                  className="h-4 w-4 accent-umami-orange"
                />
                <span className="font-inter text-sm text-umami-dark-gray">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const parseMultiParam = (value: string | null): string[] =>
  value ? value.split(",").filter(Boolean) : [];

export default function FiltersPanel({ onApplyFilters }: FiltersPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<FilterValues>({});
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [cookings, setCookings] = useState<Cooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    loadFilterData();
  }, []);

  useEffect(() => {
    const nextFilters: FilterValues = {};
    const difficulty = parseMultiParam(searchParams?.get("difficulty") || null);
    const kitchenIds = parseMultiParam(searchParams?.get("kitchen_id") || null).map(Number);
    const categoryIds = parseMultiParam(searchParams?.get("category_id") || null).map(Number);
    const celebrationIds = parseMultiParam(searchParams?.get("celebration_id") || null).map(Number);
    const cookingIds = parseMultiParam(searchParams?.get("cooking_id") || null).map(Number);

    if (difficulty.length > 0) nextFilters.difficulty = difficulty;
    if (kitchenIds.length > 0) nextFilters.kitchen_id = kitchenIds;
    if (categoryIds.length > 0) nextFilters.category_id = categoryIds;
    if (celebrationIds.length > 0) nextFilters.celebration_id = celebrationIds;
    if (cookingIds.length > 0) nextFilters.cooking_id = cookingIds;

    setFilters(nextFilters);
  }, [searchParams]);

  const updateMultiFilter = (key: keyof FilterValues, values: string[]) => {
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
          : values.map((item) => Number(item)).filter((item) => !Number.isNaN(item)),
    };

    setFilters(updatedFilters);
    router.push(`/?${params.toString()}`, { scroll: false });
    onApplyFilters(updatedFilters);
  };

  const handleReset = () => {
    setFilters({});

    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("difficulty");
    params.delete("kitchen_id");
    params.delete("category_id");
    params.delete("celebration_id");
    params.delete("cooking_id");
    params.delete("filters");

    router.push(`/?${params.toString()}`, { scroll: false });
    onApplyFilters({});
  };

  const difficultyOptions: Option[] = [
    { value: "1", label: "Легко" },
    { value: "2", label: "Средне" },
    { value: "3", label: "Сложно" },
  ];

  const kitchenOptions: Option[] = kitchens.map((item) => ({ value: item.id, label: item.name }));
  const categoryOptions: Option[] = categories.map((item) => ({ value: item.id, label: item.name }));
  const celebrationOptions: Option[] = celebrations.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const cookingOptions: Option[] = cookings.map((item) => ({ value: item.id, label: item.name }));

  return (
    <div className="mb-4 rounded-2xl border border-umami-light-gray/40 bg-white p-5 shadow-[0_6px_20px_rgba(51,51,51,0.06)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-nunito text-lg font-bold text-umami-dark-gray">Фильтры</h3>
        <span className="rounded-full bg-[#f8f3e9] px-2.5 py-1 font-nunito text-[11px] font-bold text-umami-gray">
          Гибкий поиск
        </span>
      </div>
      {isLoading ? (
        <div className="py-4 text-center">
          <p className="text-umami-gray">Загрузка фильтров...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <MultiSelect
              label="Сложность"
              placeholder="Выберите сложность"
              options={difficultyOptions}
              selected={filters.difficulty || []}
              onChange={(values) => updateMultiFilter("difficulty", values)}
            />
            <MultiSelect
              label="Кухня"
              placeholder="Выберите кухни"
              options={kitchenOptions}
              selected={(filters.kitchen_id || []).map(String)}
              onChange={(values) => updateMultiFilter("kitchen_id", values)}
            />
            <MultiSelect
              label="Категория"
              placeholder="Выберите категории"
              options={categoryOptions}
              selected={(filters.category_id || []).map(String)}
              onChange={(values) => updateMultiFilter("category_id", values)}
            />
            <MultiSelect
              label="Праздник"
              placeholder="Выберите праздники"
              options={celebrationOptions}
              selected={(filters.celebration_id || []).map(String)}
              onChange={(values) => updateMultiFilter("celebration_id", values)}
            />
            <MultiSelect
              label="Способ приготовления"
              placeholder="Выберите способы"
              options={cookingOptions}
              selected={(filters.cooking_id || []).map(String)}
              onChange={(values) => updateMultiFilter("cooking_id", values)}
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 rounded-full bg-umami-gray px-4 py-2 font-nunito font-medium text-white transition-colors hover:bg-[#555]"
            >
              Сбросить фильтры
            </button>
          </div>
        </>
      )}
    </div>
  );
}
