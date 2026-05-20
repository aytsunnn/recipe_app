"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  onLogoutClick: () => void;
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
  onLogoutClick,
  recipeActionLoading,
}: ProfileHeaderCardProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!actionsRef.current) return;
      if (actionsRef.current.contains(event.target as Node)) return;
      setActionsOpen(false);
    };

    if (actionsOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [actionsOpen]);

  return (
    <div className="relative flex min-h-[190px] flex-col rounded-[20px] border border-[#eaeaea] bg-white p-4 sm:p-5 md:min-h-[210px] lg:h-[190px] lg:min-h-0 lg:flex-row lg:items-center">
      <div ref={actionsRef} className="absolute right-4 top-4 z-20 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={() => setActionsOpen((prev) => !prev)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-umami-light-gray/60 bg-white hover:bg-[#f7f4ea]"
          aria-label="Действия профиля"
        >
          <Image
            width={18}
            height={18}
            src="/DotsThreeOutlineVertical.svg"
            alt="profile-actions"
          />
        </button>
        {actionsOpen ? (
          <div className="absolute right-0 top-9 min-w-[190px] rounded-xl border border-umami-light-gray/60 bg-white p-1 shadow-md">
            <button
              type="button"
              onClick={() => {
                setActionsOpen(false);
                onEditProfileClick();
              }}
              className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-umami-dark-gray hover:bg-[#f7f4ea]"
            >
              Редактировать профиль
            </button>
            <button
              type="button"
              disabled={recipeActionLoading}
              onClick={() => {
                setActionsOpen(false);
                onDeleteProfileClick();
              }}
              className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
            >
              Удалить профиль
            </button>
            <button
              type="button"
              onClick={() => {
                setActionsOpen(false);
                onLogoutClick();
              }}
              className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-umami-dark-gray hover:bg-[#f7f4ea]"
            >
              Выйти
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex w-full flex-col items-center gap-3 pr-0 md:gap-4 lg:flex-row lg:items-center lg:gap-5">
        <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-full bg-[#d9d9d9] sm:h-[120px] sm:w-[120px] md:h-[128px] md:w-[128px] lg:h-[150px] lg:w-[150px]">
          <Image
            width={150}
            height={150}
            src={normalizeImageUrl(user.avatar_url, "/avatar.jpg")}
            alt="avatar"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col items-center gap-1 text-center lg:items-start lg:text-left">
          <h1 className="font-nunito text-lg font-bold text-black sm:text-xl">
            {user.name}
          </h1>
          <p className="font-inter text-sm text-umami-gray">@{user.username}</p>
          {user.bio ? (
            <p className="line-clamp-2 max-w-full font-inter text-sm text-umami-gray lg:max-w-[520px]">
              О себе: {user.bio}
            </p>
          ) : null}
          <ProfileStats
            recipesCount={recipesCount}
            followingCount={followingCount}
            followersCount={followersCount}
            onFollowingClick={onFollowingClick}
            onFollowersClick={onFollowersClick}
          />
          <div className="h-0" />
        </div>
      </div>
    </div>
  );
}
