"use client";

interface ProfileRecipesEmptyStateProps {
  variant: "empty" | "filtered";
}

export default function ProfileRecipesEmptyState({
  variant,
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
    <div className="rounded-[15px] border border-[#eaeaea] bg-white p-8 text-center">
      <p className="font-nunito text-lg font-bold text-umami-gray">
        Пока нет рецептов
      </p>
      <p className="mt-1 font-inter text-sm text-umami-light-gray">
        Нажмите &quot;Добавить рецепт&quot;, чтобы создать первый.
      </p>
    </div>
  );
}
