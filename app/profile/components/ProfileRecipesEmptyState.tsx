"use client";

import Image from "next/image";

interface ProfileRecipesEmptyStateProps {
  variant: "empty" | "filtered";
  onAddClick?: () => void;
}

export default function ProfileRecipesEmptyState({
  variant,
  onAddClick,
}: ProfileRecipesEmptyStateProps) {
  if (variant === "filtered") {
    return (
      <div className="rounded-[15px] border border-[#eaeaea] bg-white p-8 text-center">
        <p className="font-nunito text-base font-bold text-umami-gray">
          Нет рецептов в этой категории
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[15px] border border-[#eaeaea] bg-white p-8 text-center flex flex-col items-center justify-center">
      <p className="font-nunito text-lg font-bold text-umami-gray">
        Пока нет рецептов
      </p>
      <p className="mt-1 mb-4 font-inter text-sm text-umami-light-gray">
        Создайте свой первый кулинарный шедевр прямо сейчас.
      </p>
      {onAddClick && (
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center gap-1.5 rounded-full bg-umami-orange px-4 py-2 font-nunito text-xs text-white transition-colors hover:bg-[#dd8c45] sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
        >
          <Image width={16} height={16} src="/PlusCircle.svg" alt="add-recipe" className="sm:h-[18px] sm:w-[18px]" />
          Добавить первый рецепт
        </button>
      )}
    </div>
  );
}
