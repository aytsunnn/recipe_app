"use client";

import FeedCard from "../FeedCard";
import { useRecipes } from "../../hooks/useRecipes";

export default function FeedOfPosts() {
  const { recipes, loading, error, refetch } = useRecipes();

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-10">
        <div className="text-umami-gray">Загрузка рецептов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col justify-center items-center py-10 gap-4">
        <div className="text-red-500">Ошибка: {error}</div>
        <button 
          onClick={refetch} 
          className="px-4 py-2 bg-umami-green text-white rounded-full hover:bg-[#6A805E] transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {recipes.map((recipe) => (
        <FeedCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}