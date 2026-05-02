"use client";

import { useState, useEffect } from "react";
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
  search?: string;
  kitchen_id?: number;
  celebration_id?: number;
  cooking_id?: number;
  category_id?: number;
  difficulty?: string;
  is_private?: boolean;
}

export default function FiltersPanel({ onApplyFilters }: FiltersPanelProps) {
  const [filters, setFilters] = useState<FilterValues>({});
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [cookings, setCookings] = useState<Cooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Загружаем данные для фильтров
    const loadFilterData = async () => {
      try {
        console.log('Загрузка данных фильтров...');
        const data = await metaService.getAll();
        console.log('Все данные загружены:', data);
        console.log('Кухни:', data.kitchens, 'Количество:', data.kitchens.length);
        console.log('Категории:', data.categories, 'Количество:', data.categories.length);
        console.log('Праздники:', data.celebrations, 'Количество:', data.celebrations.length);
        console.log('Способы приготовления:', data.cookings, 'Количество:', data.cookings.length);
        setKitchens(data.kitchens);
        setCategories(data.categories);
        setCelebrations(data.celebrations);
        setCookings(data.cookings);
      } catch (error) {
        console.error('Ошибка при загрузке данных фильтров:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFilterData();
  }, []);

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const handleReset = () => {
    setFilters({});
    onApplyFilters({});
  };

  return (
    <div className="bg-white rounded-lg border border-umami-light-gray/50 p-4 mb-4">
      <h3 className="font-nunito font-bold text-lg text-umami-dark-gray mb-4">
        Фильтры
      </h3>
      {isLoading ? (
        <div className="text-center py-4">
          <p className="text-umami-gray">Загрузка фильтров...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="font-inter text-sm text-umami-gray mb-1 block">
                Сложность
              </label>
              <select
                value={filters.difficulty || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    difficulty: e.target.value || undefined,
                  })
                }
                className="w-full border border-umami-light-gray rounded-lg px-3 py-2 font-nunito text-sm focus:outline-none focus:border-umami-green"
              >
                <option value="">Любая</option>
                <option value="1">Легко</option>
                <option value="2">Средне</option>
                <option value="3">Сложно</option>
              </select>
            </div>
            <div>
              <label className="font-inter text-sm text-umami-gray mb-1 block">
                Кухня
              </label>
              <select
                value={filters.kitchen_id || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    kitchen_id: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                className="w-full border border-umami-light-gray rounded-lg px-3 py-2 font-nunito text-sm focus:outline-none focus:border-umami-green"
              >
                <option value="">Все кухни</option>
                {kitchens.map((kitchen) => (
                  <option key={kitchen.id} value={kitchen.id}>
                    {kitchen.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-inter text-sm text-umami-gray mb-1 block">
                Категория
              </label>
              <select
                value={filters.category_id || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    category_id: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                className="w-full border border-umami-light-gray rounded-lg px-3 py-2 font-nunito text-sm focus:outline-none focus:border-umami-green"
              >
                <option value="">Все категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-inter text-sm text-umami-gray mb-1 block">
                Праздник
              </label>
              <select
                value={filters.celebration_id || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    celebration_id: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                className="w-full border border-umami-light-gray rounded-lg px-3 py-2 font-nunito text-sm focus:outline-none focus:border-umami-green"
              >
                <option value="">Все праздники</option>
                {celebrations.map((celebration) => (
                  <option key={celebration.id} value={celebration.id}>
                    {celebration.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-inter text-sm text-umami-gray mb-1 block">
                Способ приготовления
              </label>
              <select
                value={filters.cooking_id || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    cooking_id: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                className="w-full border border-umami-light-gray rounded-lg px-3 py-2 font-nunito text-sm focus:outline-none focus:border-umami-green"
              >
                <option value="">Все способы</option>
                {cookings.map((cooking) => (
                  <option key={cooking.id} value={cooking.id}>
                    {cooking.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleApply}
              className="flex-1 bg-umami-green hover:bg-[#6A805E] text-white font-nunito font-medium px-4 py-2 rounded-full transition-colors"
            >
              Применить
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-umami-gray hover:bg-gray-500 text-white font-nunito font-medium px-4 py-2 rounded-full transition-colors"
            >
              Сбросить
            </button>
          </div>
        </>
      )}
    </div>
  );
}
