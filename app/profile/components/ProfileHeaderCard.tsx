"use client";

import Image from "next/image";
import { User } from "../../services/authService";
import { normalizeImageUrl } from "../../utils/imageUrl";
import ProfileStats from "./ProfileStats";

interface ProfileHeaderCardProps {
  user: User;
  recipesCount: number;
  followingCount: number;
  followersCount: number;
  onFollowingClick: () => void;
  onFollowersClick: () => void;
  onEditProfileClick: () => void;
  onDeleteProfileClick: () => void;
  onAddRecipeClick: () => void;
  recipeActionLoading: boolean;
}

export default function ProfileHeaderCard({
  user,
  recipesCount,
  followingCount,
  followersCount,
  onFollowingClick,
  onFollowersClick,
  onEditProfileClick,
  onDeleteProfileClick,
  onAddRecipeClick,
  recipeActionLoading,
}: ProfileHeaderCardProps) {
  return (
    <div className="flex h-[190px] items-center rounded-[20px] border border-[#eaeaea] bg-white p-5">
      <div className="flex w-full items-center gap-5">
        <div className="relative h-[150px] w-[150px] shrink-0 overflow-hidden rounded-full bg-[#d9d9d9]">
          <Image
            width={150}
            height={150}
            src={normalizeImageUrl(user.avatar_url, "/avatar.jpg")}
            alt="avatar"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <h1 className="font-nunito text-xl font-bold text-black">{user.name}</h1>
          <ProfileStats
            recipesCount={recipesCount}
            followingCount={followingCount}
            followersCount={followersCount}
            onFollowingClick={onFollowingClick}
            onFollowersClick={onFollowersClick}
          />
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onEditProfileClick}
              className="w-fit rounded-full bg-umami-green px-3 py-[5px] font-nunito text-xs text-white transition-colors hover:bg-[#6a805e]"
            >
              Редактировать профиль
            </button>
            <button
              type="button"
              disabled={recipeActionLoading}
              onClick={onDeleteProfileClick}
              className="w-fit rounded-full bg-red-500 px-3 py-[5px] font-nunito text-xs text-white transition-colors hover:bg-red-600 disabled:opacity-60"
            >
              Удалить профиль
            </button>
            <button
              type="button"
              onClick={onAddRecipeClick}
              className="w-fit rounded-full bg-umami-orange px-3 py-[5px] font-nunito text-xs text-white transition-colors hover:bg-[#dd8c45]"
            >
              + Добавить рецепт
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
