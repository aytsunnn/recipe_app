"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useRecipe } from "../../hooks/useRecipe";
import { commentService, Comment } from "../../services/commentService";

function normalizeCategoryName(category: unknown): string | null {
  if (typeof category === "string") return category;
  if (category && typeof category === "object") {
    const entry = category as { name?: unknown };
    if (typeof entry.name === "string") return entry.name;
  }
  return null;
}

export default function RecipeDetailsPage() {
  const params = useParams<{ id: string }>();
  const recipeId = params?.id || "";
  const { recipe, loading, error } = useRecipe(recipeId);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "recipe" | "ingredients" | "comments">(
    "info"
  );

  const categories = useMemo(() => {
    if (!recipe?.Categories) return [];
    return recipe.Categories.map(normalizeCategoryName).filter(
      (name): name is string => Boolean(name)
    );
  }, [recipe?.Categories]);

  const likesCount = recipe?._count?.Likes ?? recipe?.Likes?.length ?? 0;
  const commentsCount = recipe?._count?.Comments ?? comments.length;

  const getSafeImageUrl = (url: string | null, fallback: string) => {
    if (!url || url === "null" || url === "undefined") return fallback;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
      return url;
    }
    return `/${url}`;
  };

  const loadComments = async () => {
    if (!recipeId) return;
    try {
      setCommentsLoading(true);
      const data = await commentService.getByRecipe(recipeId);
      setComments(data);
    } catch (loadError) {
      console.error("Ошибка загрузки комментариев:", loadError);
    } finally {
      setCommentsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <p className="font-nunito text-sm text-umami-gray">Загрузка рецепта...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-8">
        <p className="font-nunito text-lg font-bold text-umami-dark-gray">
          Не удалось загрузить рецепт
        </p>
        <p className="mt-2 font-inter text-sm text-umami-gray">{error || "Рецепт не найден"}</p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-full bg-umami-orange px-4 py-2 font-nunito text-sm text-white"
        >
          Вернуться в ленту
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[20px] bg-[#fffadd] p-5">
      <div className="mb-5 flex items-center gap-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-umami-orange px-3 py-1.5 font-nunito text-base text-white"
        >
          <Image width={16} height={16} src="/CaretDown.svg" className="rotate-90" alt="back" />
          Назад
        </Link>
        <h1 className="font-nunito text-[36px] font-bold leading-none text-umami-orange">
          {recipe.title}
        </h1>
      </div>

      <div className="overflow-hidden rounded-[20px] bg-[#d9d9d9]">
        <Image
          width={1200}
          height={500}
          src={getSafeImageUrl(recipe.image_url, "/placeholder.jpg")}
          alt={recipe.title}
          className="h-[380px] w-full object-cover"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(categories.length > 0 ? categories : ["Категория"]).map((category, index) => (
          <span
            key={`${category}-${index}`}
            className="rounded-full bg-umami-orange px-2.5 py-1 font-inter text-xs text-white"
          >
            {category}
          </span>
        ))}
      </div>

      <p className="mt-3 max-w-[960px] font-nunito text-[30px] leading-tight text-[#343330]">
        {recipe.title}
      </p>
      <p className="mt-2 max-w-[980px] font-inter text-xl text-umami-gray">{recipe.description}</p>

      <div className="mt-4 flex items-center gap-5 text-umami-gray">
        <div className="flex items-center gap-2">
          <Image width={20} height={20} src="/Heart.svg" alt="likes" />
          <span className="font-nunito text-[28px]">{likesCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Image width={20} height={20} src="/ChatCircle.svg" alt="comments" />
          <span className="font-nunito text-[28px]">{commentsCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Image width={20} height={20} src="/DoneCircle.svg" alt="rating" />
          <span className="font-nunito text-[28px]">5,0</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-10">
        <div className="flex h-[60px] flex-col items-center justify-center rounded-[20px] border border-umami-light-gray/50 bg-white">
          <p className="font-nunito text-[26px] font-bold text-umami-orange">{recipe.cooking_time} мин</p>
          <p className="font-inter text-lg text-umami-light-gray">готовка</p>
        </div>
        <div className="flex h-[60px] flex-col items-center justify-center rounded-[20px] border border-umami-light-gray/50 bg-white">
          <p className="font-nunito text-[26px] font-bold text-umami-orange">{recipe.portion} порции</p>
          <p className="font-inter text-lg text-umami-light-gray">выход</p>
        </div>
        <div className="flex h-[60px] flex-col items-center justify-center rounded-[20px] border border-umami-light-gray/50 bg-white">
          <p className="font-nunito text-[26px] font-bold text-umami-orange">{recipe.calorific ?? 0}</p>
          <p className="font-inter text-lg text-umami-light-gray">ккал</p>
        </div>
      </div>

      <div className="mt-5 grid h-[44px] grid-cols-4 overflow-hidden rounded-[20px] bg-white">
        <button
          onClick={() => setActiveTab("info")}
          className={`font-nunito text-2xl ${
            activeTab === "info" ? "bg-umami-orange text-white" : "text-umami-gray"
          }`}
        >
          Инфо
        </button>
        <button
          onClick={() => setActiveTab("recipe")}
          className={`font-nunito text-2xl ${
            activeTab === "recipe" ? "bg-umami-orange text-white" : "text-umami-gray"
          }`}
        >
          Рецепт
        </button>
        <button
          onClick={() => setActiveTab("ingredients")}
          className={`font-nunito text-2xl ${
            activeTab === "ingredients" ? "bg-umami-orange text-white" : "text-umami-gray"
          }`}
        >
          Ингридиенты
        </button>
        <button
          id="comments"
          onClick={async () => {
            setActiveTab("comments");
            if (comments.length === 0) {
              await loadComments();
            }
          }}
          className={`font-nunito text-2xl ${
            activeTab === "comments" ? "bg-umami-orange text-white" : "text-umami-gray"
          }`}
        >
          Отзывы
        </button>
      </div>

      <div className="mt-4 min-h-[120px] rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
        {activeTab !== "comments" && (
          <p className="font-inter text-base text-umami-gray">{recipe.description}</p>
        )}

        {activeTab === "comments" && (
          <div className="space-y-4">
            {commentsLoading && <p className="font-inter text-sm text-umami-gray">Загрузка...</p>}
            {!commentsLoading && comments.length === 0 && (
              <p className="font-inter text-sm text-umami-gray">Комментариев пока нет</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Image
                  width={36}
                  height={36}
                  src={getSafeImageUrl(comment.Author.avatar_url, "/avatar.jpg")}
                  alt="avatar"
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div>
                  <p className="font-inter text-sm font-semibold text-umami-dark-gray">
                    @{comment.Author.username}
                  </p>
                  <p className="font-inter text-sm text-umami-gray">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
