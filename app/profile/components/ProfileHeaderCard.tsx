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
    <div className="relative flex h-[190px] items-center rounded-[20px] border border-[#eaeaea] bg-white p-5">
      <div ref={actionsRef} className="absolute right-5 top-5 z-20">
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
          </div>
        ) : null}
      </div>

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

        <div className="relative flex min-w-0 flex-col gap-1.5 pr-10">
          <h1 className="font-nunito text-xl font-bold text-black">
            {user.name}
          </h1>
          <p className="font-inter text-sm text-umami-gray">@{user.username}</p>
          {user.bio ? (
            <p className="line-clamp-2 max-w-[520px] font-inter text-sm text-umami-gray">
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
