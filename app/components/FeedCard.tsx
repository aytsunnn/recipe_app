"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { likeService } from "../services/likeService";
import { commentService, Comment } from "../services/commentService";
import { followService } from "../services/followService";
import { favoriteService } from "../services/favoriteService";

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
}

interface FeedCardProps {
  recipe: Recipe;
  isFollowing?: boolean;
  currentUserId?: string;
  showComments?: boolean;
  showAuthorHeader?: boolean;
}

export default function FeedCard({
  recipe,
  isFollowing = false,
  currentUserId,
  showComments = false,
  showAuthorHeader = true,
}: FeedCardProps) {
  const router = useRouter();
  // Проверяем, является ли текущий пользователь автором поста
  const isOwnPost = currentUserId && currentUserId === recipe.user_id;

  // Проверяем, авторизован ли пользователь
  const isAuthenticated = !!currentUserId;

  // Проверяем, лайкнул ли текущий пользователь этот рецепт
  const isLikedByUser = currentUserId
    ? recipe.Likes?.some((like) => like.user_id === currentUserId)
    : false;

  const [isLiked, setIsLiked] = useState(isLikedByUser);
  const [following, setFollowing] = useState(isFollowing);
  const [justFollowed, setJustFollowed] = useState(false);
  const [likesCount, setLikesCount] = useState(
    recipe._count?.Likes ?? recipe.Likes?.length ?? 0
  );
  const [localCommentsCount, setLocalCommentsCount] = useState(
    recipe._count?.Comments ?? recipe.Comments?.length ?? 0
  );
  const [lastComment, setLastComment] = useState<Comment | null>(null);
  const [loadingComment, setLoadingComment] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

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
    setLikesCount(recipe._count?.Likes ?? recipe.Likes?.length ?? 0);
  }, [recipe._count?.Likes, recipe.Likes]);

  useEffect(() => {
    let cancelled = false;

    const syncLikesFromServer = async () => {
      if (!currentUserId) return;
      try {
        const likes = await likeService.getByRecipe(recipe.id);
        if (cancelled) return;
        setLikesCount(likes.length);
        setIsLiked(likes.some((like) => like.user_id === currentUserId));
      } catch (error) {
        if (!cancelled) {
          console.error("Ошибка синхронизации лайков:", error);
        }
      }
    };

    syncLikesFromServer();

    return () => {
      cancelled = true;
    };
  }, [recipe.id, currentUserId]);

  // Проверяем, добавлен ли рецепт в избранное
  useEffect(() => {
    let cancelled = false;

    const checkFavorite = async () => {
      if (!isAuthenticated) {
        setIsFavorite(false);
        return;
      }

      try {
        const isFav = await favoriteService.checkIsFavorite(recipe.id);
        if (!cancelled) {
          setIsFavorite(isFav);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Ошибка при проверке избранного:", error);
        }
      }
    };

    checkFavorite();

    return () => {
      cancelled = true;
    };
  }, [recipe.id, isAuthenticated]);

  // Загружаем последний комментарий
  useEffect(() => {
    let cancelled = false;

    const loadComment = async () => {
      try {
        if (!cancelled) {
          setLoadingComment(true);
        }
        const comments = await commentService.getByRecipe(recipe.id);
        if (!cancelled) {
          setLocalCommentsCount(comments.length);
          if (comments.length > 0) {
            // Берем самый новый комментарий
            setLastComment(comments[0]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Ошибка при загрузке комментариев:", error);
        }
      } finally {
        if (!cancelled) {
          setLoadingComment(true); // Сохраняем true чтобы не мигало, или false если загрузка окончена
          setLoadingComment(false);
        }
      }
    };

    loadComment();

    return () => {
      cancelled = true;
    };
  }, [recipe.id]);

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
      // TODO: Показать модалку авторизации
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
        if (typeof window !== "undefined" && currentUserId) {
          window.dispatchEvent(
            new CustomEvent("recipe-like-updated", {
              detail: { recipeId: recipe.id, userId: currentUserId, isLiked: false },
            })
          );
        }
      } else {
        // Сразу обновляем UI
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
        // Ставим лайк на сервере
        await likeService.create(recipe.id);
        if (typeof window !== "undefined" && currentUserId) {
          window.dispatchEvent(
            new CustomEvent("recipe-like-updated", {
              detail: { recipeId: recipe.id, userId: currentUserId, isLiked: true },
            })
          );
        }
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

    if (loadingFavorite) return;

    const previousIsFavorite = isFavorite;

    try {
      setLoadingFavorite(true);
      
      if (isFavorite) {
        setIsFavorite(false);
        await favoriteService.removeFromFavorites(recipe.id);
      } else {
        setIsFavorite(true);
        await favoriteService.addToFavorites(recipe.id);
      }
    } catch (error) {
      console.error("Ошибка при обработке избранного:", error);
      setIsFavorite(previousIsFavorite);
      alert("Не удалось обработать избранное. Попробуйте еще раз.");
    } finally {
      setLoadingFavorite(false);
    }
  };

  const getSafeImageUrl = (url: string | null, fallback: string) => {
    if (!url || url === "null" || url === "undefined") return fallback;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
      return url;
    }
    return `/${url}`;
  };

  const handleOpenRecipe = () => {
    router.push(`/recipes/${recipe.id}`);
  };

  const handleOpenAuthorProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/users/${recipe.user_id}`);
  };

  return (
    <div
      className="w-full cursor-pointer rounded-lg border border-umami-light-gray/50 bg-white p-3"
      onClick={handleOpenRecipe}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpenRecipe();
        }
      }}
    >
      {showAuthorHeader && <div className="mb-2 flex cursor-pointer items-center gap-2" onClick={handleOpenAuthorProfile}>
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-200">
          <Image
            width={32}
            height={32}
            src={getSafeImageUrl(recipe.User.avatar_url, "/avatar.jpg")}
            className="w-full h-full object-cover"
            alt="avatar"
          />

        </div>
        <div className="flex w-full flex-col justify-between">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <p className="font-inter text-xs font-medium text-umami-dark-gray">
                {recipe.User.name}
              </p>
              <p className="font-inter text-[11px] text-umami-light-gray">
                @{recipe.User.username}
              </p>
            </div>
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
      </div>}

      <div className="relative mb-2 overflow-hidden rounded-lg">
        <Image
          width={600}
          height={400}
          src={getSafeImageUrl(recipe.image_url, "/placeholder.jpg")}
          className="h-52 w-full object-cover"
          alt="recipe"
          quality={95}
        />
        <div className="absolute top-2.5 right-2.5">
          <button 
            onClick={handleFavorite}
            disabled={loadingFavorite}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isFavorite 
                ? 'bg-umami-orange' 
                : 'bg-white'
            }`}
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
      <div className="mb-2 flex flex-col">
        <p className="w-full font-inter text-base font-medium text-umami-dark-gray">
          {recipe.title}
        </p>
        <p className="font-inter text-xs text-umami-gray">
          {recipe.description}
        </p>
      </div>
      <div className="flex flex-row gap-3">
        <div className="flex gap-1 items-center">
          <button type="button" onClick={handleLike} className="cursor-pointer">
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
          <Link href={`/recipes/${recipe.id}#comments`}>
            <Image
              width={24}
              height={24}
              src="/ChatCircle.svg"
              className="w-6 h-6"
              alt="comments"
            />
          </Link>
          <p className="font-inter text-sm text-umami-gray">{localCommentsCount}</p>
        </div>
      </div>

      {/* Блок последнего комментария */}
      {localCommentsCount > 0 && (
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
                  src={getSafeImageUrl(lastComment.Author.avatar_url, "/avatar.jpg")}
                  className="w-full h-full object-cover"
                  alt="avatar"
                />
              </div>
              <div className="flex flex-col flex-1">
                <p className="font-inter text-xs font-medium text-umami-dark-gray">
                  {lastComment.Author.username}
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
