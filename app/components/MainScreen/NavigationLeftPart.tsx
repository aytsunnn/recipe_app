"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { metaService, Category } from "../../services/metaService";

export default function LeftPart() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await metaService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Синхронизируем выбранные категории с URL
  useEffect(() => {
    const categoryIds = searchParams.get('category_id');
    if (categoryIds) {
      const ids = categoryIds.split(',').filter(Boolean);
      setSelectedCategories(new Set(ids));
    } else {
      setSelectedCategories(new Set());
    }
  }, [searchParams]);

  const handleCategoryClick = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    
    setSelectedCategories(newSelected);
    
    const params = new URLSearchParams(searchParams.toString());
    
    if (newSelected.size > 0) {
      const categoriesString = Array.from(newSelected).join(',');
      params.set('category_id', categoriesString);
      params.set('filters', 'true');
    } else {
      params.delete('category_id');
      params.delete('filters');
    }
    
    router.push(`/?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col">
        <div className="flex flex-col gap-1.25">
          <p className="font-nunito font-bold text-xl text-umami-orange">
            Категории
          </p>
          <p className="text-umami-gray text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-col gap-1.25">
        <p className="font-nunito font-bold text-xl text-umami-orange">
          Категории
        </p>
        <div className="grid grid-cols-3 w-full gap-2.5">
          {categories.map((category) => {
            const isSelected = selectedCategories.has(category.id);
            return (
              <div 
                key={category.id} 
                className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleCategoryClick(category.id)}
              >
                <div className={`w-17.75 h-17.75 flex justify-center items-center border rounded-2xl transition-colors ${
                  isSelected 
                    ? 'border-umami-orange bg-umami-orange/10' 
                    : 'border-umami-light-gray/50 bg-white'
                }`}>
                  <Image
                    src="/Pizza_3D.svg"
                    width={55}
                    height={55}
                    alt={category.name}
                  />
                </div>
                <p className={`font-nunito font-bold text-sm max-w-17.75 transition-colors ${
                  isSelected ? 'text-umami-orange' : 'text-umami-dark-gray'
                }`}>
                  {category.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
