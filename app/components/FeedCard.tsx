"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { likeService } from "../services/likeService";
import { commentService, Comment } from "../services/commentService";

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
}

export default function FeedCard({
  recipe,
  isFollowing = false,
  currentUserId,
  showComments = false,
}: FeedCardProps) {
  const [following, setFollowing] = useState(isFollowing);
  const [lastComment, setLastComment] = useState<Comment | null>(null);
  const [loadingComment, setLoadingComment] = useState(false);

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
  const commentsCount = recipe._count?.Comments ?? recipe.Comments?.length ?? 0;

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

  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      // TODO: Показать модалку авторизации
      alert("Необходимо авторизоваться");
      return;
    }

    // TODO: Здесь будет логика подписки через API
    setFollowing(!following);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      // TODO: Показать модалку авторизации
      alert("Необходимо авторизоваться");
      return;
    }

    try {
      if (isLiked) {
        // Убираем лайк
        await likeService.delete(recipe.id);
        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        // Ставим лайк
        await likeService.create(recipe.id);
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Ошибка при обработке лайка:", error);
    }
  };

  return (
    <Link
      href="/"
      className="rounded-lg w-full flex flex-col bg-white border border-umami-light-gray/50 p-4 gap-2.5"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
          {recipe.User.avatar_url ? (
            <Image
              width={40}
              height={40}
              src={recipe.User.avatar_url}
              className="w-full h-full object-cover"
              alt="avatar"
            />
          ) : (
            <Image
              width={40}
              height={40}
              src="/avatar.jpg"
              className=" object-cover"
              alt="avatar"
            />
          )}
        </div>
        <div className="w-full flex flex-col justify-between">
          <div className="flex flex-row justify-between items-center">
            <div className="flex flex-col">
              <p className="font-inter text-sm font-medium text-umami-dark-gray">
                {recipe.User.name}
              </p>
              <p className="font-inter text-xs text-umami-light-gray">
                @{recipe.User.username}
              </p>
            </div>
            {isAuthenticated && !isOwnPost && !following && (
              <button
                onClick={handleFollow}
                className="custom-button bg-umami-green font-inter font-medium text-xs h-7"
              >
                Подписаться
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        <Image
          width={32}
          height={32}
          src={recipe.image_url || "/placeholder.jpg"}
          className="w-full h-full object-cover rounded-lg"
          alt="recipe"
        />
        <div className="absolute top-2.5 right-2.5">
          <button className="bg-white w-9 h-9 rounded-full flex items-center justify-center">
            <Image
              width={20}
              height={20}
              src="/Favorites.svg"
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
          <Link href="/">
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
                {lastComment.User.avatar_url ? (
                  <Image
                    width={32}
                    height={32}
                    src={lastComment.User.avatar_url}
                    className="w-full h-full object-cover"
                    alt="avatar"
                  />
                ) : (
                  <Image
                    width={32}
                    height={32}
                    src="/avatar.jpg"
                    className="object-cover"
                    alt="avatar"
                  />
                )}
              </div>
              <div className="flex flex-col flex-1">
                <p className="font-inter text-xs font-medium text-umami-dark-gray">
                  {lastComment.User.name}
                </p>
                <p className="font-inter text-sm text-umami-gray">
                  {lastComment.content}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Link>
  );
}
