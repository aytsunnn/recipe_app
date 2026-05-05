"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useRecipe } from "../../hooks/useRecipe";
import { authService } from "../../services/authService";
import { commentService, Comment } from "../../services/commentService";
import LeftPart from "../../components/MainScreen/NavigationLeftPart";
import RightPart from "../../components/MainScreen/NewsRightPart";

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
  const [commentSending, setCommentSending] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "info" | "recipe" | "ingredients" | "comments"
  >("info");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [showTasteDetails, setShowTasteDetails] = useState(false);
  const [isTasteDetailsSaved, setIsTasteDetailsSaved] = useState(false);
  const [commentForm, setCommentForm] = useState({
    content: "",
    rating: 5,
    taste_sweet: 3,
    taste_sour: 3,
    taste_salty: 3,
    taste_spicy: 3,
    taste_umami: 3,
  });

  const categories = useMemo(() => {
    if (!recipe?.Categories) return [];
    return recipe.Categories.map(normalizeCategoryName).filter(
      (name): name is string => Boolean(name)
    );
  }, [recipe?.Categories]);

  const groupedComments = useMemo(() => {
    const roots: Comment[] = [];
    const children = new Map<string, Comment[]>();

    comments.forEach((comment) => {
      if (comment.parent_comment_id) {
        const parentId = String(comment.parent_comment_id);
        const list = children.get(parentId) || [];
        list.push(comment);
        children.set(parentId, list);
      } else {
        roots.push(comment);
      }
    });

    roots.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    children.forEach((list, key) => {
      children.set(
        key,
        list.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      );
    });

    return { roots, children };
  }, [comments]);

  const likesCount = recipe?._count?.Likes ?? recipe?.Likes?.length ?? 0;
  const commentsCount = recipe?._count?.Comments ?? comments.length;

  const getSafeImageUrl = (url: string | null, fallback: string) => {
    if (!url || url === "null" || url === "undefined") return fallback;
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("/")
    ) {
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
      alert("Не удалось загрузить комментарии");
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      if (!authService.isAuthenticated()) {
        setCurrentUserId(null);
        return;
      }
      const user = await authService.getCurrentUser();
      setCurrentUserId(user?.id || null);
    };
    loadUser();
  }, []);

  const handleSubmitComment = async () => {
    if (!currentUserId) {
      alert("Необходимо авторизоваться");
      return;
    }
    if (!commentForm.content.trim()) {
      alert("Введите текст комментария");
      return;
    }
    if (!replyToCommentId && showTasteDetails && !isTasteDetailsSaved) {
      alert("Сначала нажмите «Сохранить вкус», затем отправляйте отзыв");
      return;
    }
    if (!recipeId) return;

    try {
      setCommentSending(true);
      const isReply = Boolean(replyToCommentId);
      await commentService.create(recipeId, {
        content: commentForm.content.trim(),
        ...(isReply
          ? {}
          : showTasteDetails
          ? {
              rating: commentForm.rating,
              taste_sweet: commentForm.taste_sweet,
              taste_sour: commentForm.taste_sour,
              taste_salty: commentForm.taste_salty,
              taste_spicy: commentForm.taste_spicy,
              taste_umami: commentForm.taste_umami,
            }
          : {}),
        parent_comment_id: replyToCommentId
          ? Number(replyToCommentId)
          : undefined,
      });
      setCommentForm((prev) => ({ ...prev, content: "" }));
      setReplyToCommentId(null);
      setShowTasteDetails(false);
      setIsTasteDetailsSaved(false);
      await loadComments();
    } catch (submitError) {
      console.error("Ошибка отправки комментария:", submitError);
      alert(
        submitError instanceof Error
          ? `Не удалось отправить комментарий: ${submitError.message}`
          : "Не удалось отправить комментарий"
      );
    } finally {
      setCommentSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex w-full gap-5">
        <div className="hidden w-55.75 lg:flex">
          <LeftPart />
        </div>
        <div className="flex w-full items-center justify-center lg:w-169.5">
          <p className="font-nunito text-sm text-umami-gray">
            Загрузка рецепта...
          </p>
        </div>
        <div className="hidden w-63.75 lg:flex">
          <RightPart />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="flex w-full gap-5">
        <div className="hidden w-55.75 lg:flex">
          <LeftPart />
        </div>
        <div className="w-full lg:w-169.5">
          <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-8">
            <p className="font-nunito text-lg font-bold text-umami-dark-gray">
              Не удалось загрузить рецепт
            </p>
            <p className="mt-2 font-inter text-sm text-umami-gray">
              {error || "Рецепт не найден"}
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-full bg-umami-orange px-4 py-2 font-nunito text-sm text-white"
            >
              Вернуться в ленту
            </Link>
          </div>
        </div>
        <div className="hidden w-63.75 lg:flex">
          <RightPart />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full gap-5">
      <div className="hidden w-55.75 lg:flex">
        <LeftPart />
      </div>
      <div className="w-169.5">
        <div className="mx-auto w-full max-w-[980px] rounded-[20px] bg-[#fffadd] p-5">
          <div className="mb-5 flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-full bg-umami-orange px-2.5 py-1.25 font-nunito text-base text-white"
            >
              <Image width={22} height={22} src="/ArrowLeft.svg" alt="back" />
              Назад
            </Link>
            <h1 className="font-nunito text-2xl font-bold leading-none text-umami-orange">
              {recipe.title}
            </h1>
          </div>

          <div className="overflow-hidden rounded-[20px] bg-[#d9d9d9]">
            <Image
              width={638}
              height={380}
              src={getSafeImageUrl(recipe.image_url, "/placeholder.jpg")}
              alt={recipe.title}
              className="h-[380px] w-full object-cover"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(categories.length > 0 ? categories : ["Категория"]).map(
              (category, index) => (
                <span
                  key={`${category}-${index}`}
                  className="rounded-full bg-umami-orange px-2.5 py-1.25 font-nunito text-xs text-white"
                >
                  {category}
                </span>
              )
            )}
          </div>
          <p className="mt-2 max-w-[637px] font-nunito text-sm text-umami-gray">
            {recipe.description}
          </p>
          <div className="flex justify-between">
            <div className="mt-4 flex items-center gap-5 text-umami-gray">
              <div className="flex items-center gap-1">
                <Image
                  width={20}
                  height={20}
                  src="/HeartGray.svg"
                  alt="likes"
                />
                <span className="font-nunito text-base">{likesCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Image
                  width={20}
                  height={20}
                  src="/ChatCircleGray.svg"
                  alt="comments"
                />
                <span className="font-nunito text-base">{commentsCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Image
                  width={20}
                  height={20}
                  src="/StarGray.svg"
                  alt="rating"
                />
                <span className="font-nunito text-base">5,0</span>
                {/* рейтинг выставляется на основе отзывов, если отзывов нет, то рейтинг 0,0 */}
              </div>
            </div>
            <Link
              href="/"
              // нужно записывать в бд что рецепт добавлен в приготовленные, сделать кнопку такого стиля как категория, если рецепт отмечен, как Приготовленный, то кнопка выглядит по-другому
              className="rounded-full bg-umami-orange px-2.5 py-1.25 font-nunito text-xs text-white"
            >
              Приготовлено
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-10">
            <div className="flex h-[60px] flex-col items-center justify-center rounded-[20px] border border-umami-light-gray/50 bg-white">
              <p className="font-nunito text-base font-bold text-umami-orange">
                {recipe.cooking_time} мин
              </p>
              <p className="font-nunito text-sm text-umami-light-gray">
                готовка
              </p>
            </div>
            <div className="flex h-[60px] flex-col items-center justify-center rounded-[20px] border border-umami-light-gray/50 bg-white">
              <p className="font-nunito text-base font-bold text-umami-orange">
                {recipe.portion} порции
              </p>
              <p className="font-nunito text-sm text-umami-light-gray">выход</p>
            </div>
            <div className="flex h-[60px] flex-col items-center justify-center rounded-[20px] border border-umami-light-gray/50 bg-white">
              <p className="font-nunito text-base font-bold text-umami-orange">
                {recipe.calorific ?? 0}
              </p>
              <p className="font-nunito text-sm text-umami-light-gray">ккал</p>
            </div>
          </div>

          <div className="mt-5 grid h-10 grid-cols-4 overflow-hidden rounded-[20px] bg-white border border-umami-light-gray/50">
            <button
              onClick={() => setActiveTab("info")}
              className={`font-nunito text-base ${
                activeTab === "info"
                  ? "bg-umami-orange text-white rounded-[20px]"
                  : "text-umami-gray"
              }`}
            >
              Инфо
            </button>
            <button
              onClick={() => setActiveTab("recipe")}
              className={`font-nunito text-base ${
                activeTab === "recipe"
                  ? "bg-umami-orange text-white rounded-[20px]"
                  : "text-umami-gray"
              }`}
            >
              Рецепт
            </button>
            <button
              onClick={() => setActiveTab("ingredients")}
              className={`font-nunito text-base ${
                activeTab === "ingredients"
                  ? "bg-umami-orange text-white rounded-[20px]"
                  : "text-umami-gray"
              }`}
            >
              Ингредиенты
            </button>
            <button
              id="comments"
              onClick={async () => {
                setActiveTab("comments");
                if (comments.length === 0) {
                  await loadComments();
                }
              }}
              className={`font-nunito text-base ${
                activeTab === "comments"
                  ? "bg-umami-orange text-white rounded-[20px]"
                  : "text-umami-gray"
              }`}
            >
              Отзывы
            </button>
          </div>

          <div className="mt-4 min-h-[120px] rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
            {activeTab !== "comments" && (
              <p className="font-inter text-base text-umami-gray">
                {recipe.description}
              </p>
            )}

            {activeTab === "comments" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-umami-light-gray/50 p-4">
                  <p className="font-nunito text-lg font-bold text-umami-dark-gray">
                    {replyToCommentId
                      ? "Ответ на комментарий"
                      : "Оставить отзыв"}
                  </p>
                  {replyToCommentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyToCommentId(null);
                        setShowTasteDetails(false);
                        setIsTasteDetailsSaved(false);
                      }}
                      className="mt-1 rounded-full bg-gray-100 px-3 py-1 font-nunito text-xs text-umami-gray"
                    >
                      Отменить ответ
                    </button>
                  )}

                  {!replyToCommentId && (
                    <div className="mt-3">
                      <span className="mb-1 block font-inter text-xs text-umami-gray">
                        Рейтинг
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setCommentForm((prev) => ({
                                ...prev,
                                rating: value,
                              }))
                            }
                            className={`text-2xl leading-none ${
                              value <= commentForm.rating
                                ? "text-umami-orange"
                                : "text-umami-light-gray"
                            }`}
                            aria-label={`Оценка ${value}`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="ml-2 font-inter text-xs text-umami-gray">
                          {commentForm.rating}/5
                        </span>
                      </div>
                    </div>
                  )}

                  {!replyToCommentId && !showTasteDetails && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowTasteDetails(true);
                        setIsTasteDetailsSaved(false);
                      }}
                      className="mt-3 rounded-full border border-umami-orange px-4 py-2 font-nunito text-sm text-umami-orange"
                    >
                      Добавить информацию о вкусе
                    </button>
                  )}

                  {!replyToCommentId && showTasteDetails && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {(
                        [
                          ["taste_sweet", "Сладость"],
                          ["taste_sour", "Кислота"],
                          ["taste_salty", "Солёность"],
                          ["taste_spicy", "Острота"],
                          ["taste_umami", "Умами"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="block">
                          <span className="mb-1 block font-inter text-xs text-umami-gray">
                            {label}
                          </span>
                          <input
                            type="range"
                            min={1}
                            max={5}
                            value={commentForm[key]}
                            onChange={(e) => {
                              setCommentForm((prev) => ({
                                ...prev,
                                [key]: Number(e.target.value),
                              }));
                              setIsTasteDetailsSaved(false);
                            }}
                            className="w-full accent-umami-orange"
                          />
                          <span className="font-inter text-xs text-umami-gray">
                            {commentForm[key]}/5
                          </span>
                        </label>
                      ))}
                      <div className="col-span-2 mt-1 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsTasteDetailsSaved(true)}
                          className="rounded-full bg-umami-green px-4 py-2 font-nunito text-sm text-white"
                        >
                          Сохранить вкус
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTasteDetails(false);
                            setIsTasteDetailsSaved(false);
                          }}
                          className="rounded-full bg-gray-100 px-4 py-2 font-nunito text-sm text-umami-gray"
                        >
                          Убрать вкусы
                        </button>
                        {isTasteDetailsSaved && (
                          <span className="font-inter text-xs text-umami-green">
                            Вкусы сохранены
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <textarea
                    value={commentForm.content}
                    onChange={(e) =>
                      setCommentForm((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="Напишите отзыв..."
                    className="mt-3 h-24 w-full rounded-2xl border border-umami-light-gray px-3 py-2 font-inter text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitComment}
                    disabled={commentSending}
                    className="mt-3 rounded-full bg-umami-orange px-4 py-2 font-nunito text-sm text-white disabled:opacity-60"
                  >
                    {commentSending ? "Отправляем..." : "Отправить"}
                  </button>
                </div>

                {commentsLoading && (
                  <p className="font-inter text-sm text-umami-gray">
                    Загрузка...
                  </p>
                )}
                {!commentsLoading && comments.length === 0 && (
                  <p className="font-inter text-sm text-umami-gray">
                    Комментариев пока нет
                  </p>
                )}

                {!commentsLoading &&
                  groupedComments.roots.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-xl border border-umami-light-gray/40 p-3"
                    >
                      <div className="flex gap-3">
                        <Image
                          width={36}
                          height={36}
                          src={getSafeImageUrl(
                            comment.Author.avatar_url,
                            "/avatar.jpg"
                          )}
                          alt="avatar"
                          className="h-9 w-9 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-inter text-sm font-semibold text-umami-dark-gray">
                            @{comment.Author.username}
                          </p>
                          <p className="font-inter text-sm text-umami-gray">
                            {comment.content}
                          </p>
                          {(comment.rating ||
                            comment.taste_sweet ||
                            comment.taste_sour ||
                            comment.taste_salty ||
                            comment.taste_spicy ||
                            comment.taste_umami) && (
                            <p className="mt-1 font-inter text-xs text-umami-light-gray">
                              Рейтинг: {comment.rating ?? 0}/5 | Сладость{" "}
                              {comment.taste_sweet ?? 0} | Кислота{" "}
                              {comment.taste_sour ?? 0} | Солёность{" "}
                              {comment.taste_salty ?? 0} | Острота{" "}
                              {comment.taste_spicy ?? 0} | Умами{" "}
                              {comment.taste_umami ?? 0}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => setReplyToCommentId(comment.id)}
                            className="mt-2 rounded-full bg-gray-100 px-3 py-1 font-nunito text-xs text-umami-dark-gray"
                          >
                            Ответить
                          </button>
                        </div>
                      </div>

                      {(groupedComments.children.get(comment.id) || []).length >
                        0 && (
                        <div className="mt-3 space-y-2 border-l-2 border-umami-light-gray/40 pl-4">
                          <p className="font-inter text-xs font-semibold text-umami-gray">
                            Ответы:
                          </p>
                          {(groupedComments.children.get(comment.id) || []).map(
                            (reply) => (
                              <div key={reply.id} className="flex gap-3">
                                <Image
                                  width={30}
                                  height={30}
                                  src={getSafeImageUrl(
                                    reply.Author.avatar_url,
                                    "/avatar.jpg"
                                  )}
                                  alt="avatar"
                                  className="h-7.5 w-7.5 rounded-full object-cover"
                                />
                                <div>
                                  <p className="font-inter text-xs font-semibold text-umami-dark-gray">
                                    @{reply.Author.username}
                                  </p>
                                  <p className="font-inter text-sm text-umami-gray">
                                    {reply.content}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="hidden w-63.75 lg:flex">
        <RightPart />
      </div>
    </div>
  );
}
