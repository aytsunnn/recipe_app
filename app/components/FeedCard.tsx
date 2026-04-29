"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

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
}

interface FeedCardProps {
  recipe: Recipe;
}

export default function FeedCard({ recipe }: FeedCardProps) {
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
              className="w-full h-full object-cover"
              alt="avatar"
            />
          )}
        </div>
        <div className="w-full flex flex-col justify-between">
          <div className="flex flex-col">
            <p className="font-inter text-sm font-medium text-umami-dark-gray">
              {recipe.User.name}
            </p>
            <p className="font-inter text-xs text-umami-light-gray">
              @{recipe.User.username}
            </p>
          </div>
          <div>
            {/* тут нужно проверять если нет подписки на автора этого поста, то показывать кнопку Подписаться */}
          </div>
        </div>
      </div>

      <div className="relative">
        <Image
          width={648}
          height={360}
          src={recipe.image_url || "/placeholder.jpg"}
          className="w-full h-full object-cover rounded-lg"
          alt="recipe"
        />
        <div className="absolute top-2.5 right-2.5">
          <Link
            href=""
            className="bg-white w-9 h-9 rounded-full flex items-center justify-center"
          >
            <Image
              width={20}
              height={20}
              src="/Favorites.svg"
              alt="favorites"
            />
          </Link>
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
      <div className="flex flex-col"></div>
    </Link>
  );
}
