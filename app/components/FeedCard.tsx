"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";
import { likeService } from "../services/likeService";
import { commentService, Comment } from "../services/commentService";
import { followService } from "../services/followService";
import { favoriteService } from "../services/favoriteService";
import { normalizeImageUrl } from "../utils/imageUrl";

interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string;
  difficulty: string;
  image_url: string | null;
  is_private: boolean;
  kitchen_id: string | null;
  celebration_id: string | null;
  cooking_id: string | null;
  portion: number;
  calorific: number | null;
  cooking_time: number;
  createdAt: string;
  User: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
  };
  Kitchen: {
    id: string;
    name: string;
  } | null;
  Likes: Array<{ id: string; user_id: string }>;
  Comments?: Array<{ id: string }>;
  _count?: {
    Likes: number;
    Comments: number;
  };
  total_reviews?: number | string | null;
  comments_count?: number | string | null;
}

interface FeedCardProps {
  recipe: Recipe;
  isFollowing?: boolean;
  currentUserId?: string;
  showComments?: boolean;
  showAuthorHeader?: boolean;
  detailsQuery?: string;
  footerRightSlot?: ReactNode;
}

export default function FeedCard({
  recipe,
  isFollowing = false,
  currentUserId,
  showComments = false,
  showAuthorHeader = true,
  detailsQuery,
  footerRightSlot,
}: FeedCardProps) {
  const [following, setFollowing] = useState(isFollowing);
  const [justFollowed, setJustFollowed] = useState(false); // Отслеживаем подписку в текущей сессии
  const [lastComment, setLastComment] = useState<Comment | null>(null);
  const [loadingComment, setLoadingComment] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Проверяем, является ли текущий пользователь автором поста
  const isOwnPost = currentUserId && currentUserId === recipe.user_id;

  // Проверяем, авторизован ли пользователь
  const isAuthenticated = !!currentUserId;

  // Проверяем, лайкнул ли текущий пользователь этот рецепт
  const isLikedByUser = currentUserId
    ? recipe.Likes?.some((like) => like.user_id === currentUserId)
    : false;

  const [isLiked, setIsLiked] = useState(isLikedByUser);
  const [likesCount, setLikesCount] = useState(
    recipe._count?.Likes ?? recipe.Likes?.length ?? 0
  );
  const resolveCommentsCount = () => {
    const fromCount = recipe._count?.Comments;
    if (typeof fromCount === "number") return fromCount;

    const totalReviews =
      typeof recipe.total_reviews === "string"
        ? Number(recipe.total_reviews)
        : recipe.total_reviews;
    if (typeof totalReviews === "number" && Number.isFinite(totalReviews)) {
      return totalReviews;
    }

    const commentsCountRaw =
      typeof recipe.comments_count === "string"
        ? Number(recipe.comments_count)
        : recipe.comments_count;
    if (
      typeof commentsCountRaw === "number" &&
      Number.isFinite(commentsCountRaw)
    ) {
      return commentsCountRaw;
    }

    return recipe.Comments?.length ?? 0;
  };
  const [commentsCountState, setCommentsCountState] = useState(
    resolveCommentsCount()
  );
  const commentsCount = commentsCountState;

  // Синхронизируем состояние following с пропсом isFollowing
  useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing]);

  // Обновляем состояние лайка при изменении currentUserId или данных рецепта
  useEffect(() => {
    const liked = currentUserId
      ? recipe.Likes?.some((like) => like.user_id === currentUserId)
      : false;
    setIsLiked(liked);
  }, [currentUserId, recipe.Likes]);

  useEffect(() => {
    const next = resolveCommentsCount();
    setCommentsCountState(next);
  }, [recipe._count?.Comments, recipe.total_reviews, recipe.comments_count, recipe.Comments?.length]);

  useEffect(() => {
    const raw = localStorage.getItem("recipe_comments_overrides");
    if (!raw) return;
    try {
      const map = JSON.parse(raw) as Record<string, number>;
      const override = map[recipe.id];
      if (Number.isFinite(override)) {
        setCommentsCountState((prev) => Math.max(prev, Number(override)));
      }
    } catch {
      // ignore broken localStorage
    }
  }, [recipe.id]);

  useEffect(() => {
    const handleRecipeCommentsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        recipeId: string;
        commentsCount: number;
      }>;
      if (!customEvent.detail) return;
      if (customEvent.detail.recipeId !== recipe.id) return;
      setCommentsCountState(Math.max(0, customEvent.detail.commentsCount));
    };

    window.addEventListener("recipe-comments-updated", handleRecipeCommentsUpdated);
    return () => {
      window.removeEventListener("recipe-comments-updated", handleRecipeCommentsUpdated);
    };
  }, [recipe.id]);

  useEffect(() => {
    let cancelled = false;
    const loadFavoriteState = async () => {
      if (!isAuthenticated) {
        setIsFavorite(false);
        return;
      }
      try {
        const favorite = await favoriteService.checkIsFavorite(recipe.id);
        if (!cancelled) setIsFavorite(favorite);
      } catch {
        if (!cancelled) setIsFavorite(false);
      }
    };
    void loadFavoriteState();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, recipe.id]);

  // Загружаем последний комментарий, если нужно показывать комментарии
  useEffect(() => {
    if (showComments && commentsCount > 0) {
      setLoadingComment(true);
      commentService
        .getByRecipe(recipe.id)
        .then((comments) => {
          if (comments.length > 0) {
            // Берем последний комментарий
            setLastComment(comments[comments.length - 1]);
          }
        })
        .catch((error) => {
          console.error("Ошибка при загрузке комментариев:", error);
        })
        .finally(() => {
          setLoadingComment(false);
        });
    }
  }, [showComments, recipe.id, commentsCount]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert("Необходимо авторизоваться");
      return;
    }

    const previousFollowing = following;
    const previousJustFollowed = justFollowed;

    try {
      if (justFollowed) {
        // Отписываемся (кнопка "Подписки")
        setFollowing(false);
        setJustFollowed(false);
        await followService.unfollow(recipe.user_id);
        console.log(`Успешно отписались от пользователя ${recipe.user_id}`);
      } else {
        // Подписываемся (кнопка "Подписаться")
        setFollowing(true);
        setJustFollowed(true);
        await followService.follow(recipe.user_id);
        console.log(`Успешно подписались на пользователя ${recipe.user_id}`);
      }
    } catch (error) {
      console.error("Ошибка при обработке подписки:", error);
      // Откатываем изменения при ошибке
      setFollowing(previousFollowing);
      setJustFollowed(previousJustFollowed);
      alert("Не удалось обработать подписку. Попробуйте еще раз.");
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert("Необходимо авторизоваться");
      return;
    }

    // Оптимистичное обновление UI
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    try {
      if (isLiked) {
        // Сразу обновляем UI
        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
        // Убираем лайк на сервере
        await likeService.delete(recipe.id);
      } else {
        // Сразу обновляем UI
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
        // Ставим лайк на сервере
        await likeService.create(recipe.id);
      }
    } catch (error) {
      console.error("Ошибка при обработке лайка:", error);
      // Откатываем изменения при ошибке
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      alert("Не удалось обработать лайк. Попробуйте еще раз.");
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert("Необходимо авторизоваться");
      return;
    }

    const prev = isFavorite;
    try {
      setIsFavorite(!prev);
      if (prev) {
        await favoriteService.removeFromFavorites(recipe.id);
      } else {
        await favoriteService.addToFavorites(recipe.id);
      }
    } catch (error) {
      setIsFavorite(prev);
      console.error("Ошибка при работе с избранным:", error);
      alert("Не удалось обновить избранное. Попробуйте еще раз.");
    }
  };

  const buildRecipeLink = (tab?: "comments") => {
    const params = new URLSearchParams();
    if (detailsQuery) {
      const fromIncoming = new URLSearchParams(detailsQuery);
      fromIncoming.forEach((value, key) => params.set(key, value));
    }
    if (tab) params.set("tab", tab);
    const query = params.toString();
    return `/recipes/${recipe.id}${query ? `?${query}` : ""}`;
  };

  return (
    <div className="rounded-lg w-full flex flex-col bg-white border border-umami-light-gray/50 p-4 gap-2.5">
      {showAuthorHeader && (
        <div className="flex items-start gap-2.5">
          <Link
            href={`/users/${recipe.user_id}`}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              <Image
                width={40}
                height={40}
                src={normalizeImageUrl(recipe.User.avatar_url, "/avatar.jpg")}
                className="w-full h-full object-cover"
                alt="avatar"
              />
            </div>
            <div className="min-w-0 flex flex-col">
              <p className="font-inter text-sm font-medium text-umami-dark-gray">
                {recipe.User.name}
              </p>
              <p className="truncate font-inter text-xs text-umami-light-gray">
                @{recipe.User.username}
              </p>
            </div>
          </Link>
          <div className="flex items-center">
              {isAuthenticated && !isOwnPost && (
                <>
                  {/* Показываем "Подписаться" если не подписан и не подписался только что */}
                  {!following && !justFollowed && (
                    <button
                      onClick={handleFollow}
                      className="custom-button bg-umami-green font-inter font-medium text-xs h-7"
                    >
                      Подписаться
                    </button>
                  )}
                  {/* Показываем "Подписки" если только что подписался в ленте */}
                  {justFollowed && (
                    <button
                      onClick={handleFollow}
                      className="custom-button bg-umami-gray font-inter font-medium text-xs h-7"
                    >
                      Подписки
                    </button>
                  )}
                  {/* Если был подписан изначально (following && !justFollowed) - ничего не показываем */}
                </>
              )}
          </div>
        </div>
      )}

      <Link href={buildRecipeLink()} className="block">
        <div className="relative w-full overflow-hidden rounded-lg bg-[#d9d9d9]">
          <Image
            width={600}
            height={400}
            src={normalizeImageUrl(recipe.image_url, "/placeholder.jpg")}
            className="h-auto w-full rounded-lg object-contain"
            alt="recipe"
            quality={95}
          />
          <div className="absolute top-2.5 right-2.5">
            <button
              onClick={handleFavorite}
              className="bg-white w-9 h-9 rounded-full flex items-center justify-center"
            >
              <Image
                width={20}
                height={20}
                src={isFavorite ? "/FavoritesCurrent.svg" : "/Favorites.svg"}
                alt="favorites"
              />
            </button>
          </div>
          <div className="absolute bottom-2.5 right-2.5">
            <div className="bg-white p-2 rounded-full flex items-center justify-center gap-4">
              <div className="flex gap-1 items-center">
                <Image width={20} height={20} src="/Time.svg" alt="time" />
                <p className="font-inter font-regular text-sm text-umami-dark-gray">
                  {recipe.cooking_time} мин
                </p>
              </div>
              <div className="flex gap-1 items-center">
                <Image
                  width={20}
                  height={20}
                  src="/Difficulty.svg"
                  alt="difficulty"
                />
                <p className="font-inter font-regular text-sm text-umami-dark-gray">
                  {recipe.difficulty}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <p className="w-full font-inter font-medium text-lg text-umami-dark-gray">
            {recipe.title}
          </p>
          <p className="font-inter font-regular text-sm text-umami-gray">
            {recipe.description}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-row gap-2">
          <div className="flex gap-1 items-center">
            <button onClick={handleLike} className="cursor-pointer">
              <Image
                width={24}
                height={24}
                src={isLiked ? "/RedHeart.svg" : "/Heart.svg"}
                className="w-6 h-6"
                alt="like"
              />
            </button>
            <p className="font-inter text-sm text-umami-gray">{likesCount}</p>
          </div>
          <div className="flex gap-1 items-center">
            <Link href={buildRecipeLink("comments")}>
              <Image
                width={24}
                height={24}
                src="/ChatCircle.svg"
                className="w-6 h-6"
                alt="comments"
              />
            </Link>
            <p className="font-inter text-sm text-umami-gray">{commentsCount}</p>
          </div>
        </div>
        {footerRightSlot ? <div className="flex items-center gap-2">{footerRightSlot}</div> : null}
      </div>

      {/* Блок последнего комментария */}
      {showComments && commentsCount > 0 && (
        <div className="border-t border-umami-light-gray/50 pt-2.5">
          {loadingComment ? (
            <p className="font-inter text-xs text-umami-gray">
              Загрузка комментария...
            </p>
          ) : lastComment ? (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                <Image
                  width={32}
                  height={32}
                  src={normalizeImageUrl(lastComment.Author.avatar_url, "/avatar.jpg")}
                  className="w-full h-full object-cover"
                  alt="avatar"
                />
              </div>
              <div className="flex flex-col flex-1">
                <p className="font-inter text-xs font-medium text-umami-dark-gray">
                  @{lastComment.Author.username}
                </p>
                <p className="font-inter text-sm text-umami-gray">
                  {lastComment.content}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
