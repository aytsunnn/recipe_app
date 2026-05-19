"use client";

interface ProfileStatsProps {
  recipesCount: number;
  followingCount: number;
  followersCount: number;
  onFollowingClick: () => void;
  onFollowersClick: () => void;
}

export default function ProfileStats({
  recipesCount,
  followingCount,
  followersCount,
  onFollowingClick,
  onFollowersClick,
}: ProfileStatsProps) {
  return (
    <div className="flex gap-6 text-center text-black">
      <div>
        <p className="font-nunito text-xl font-semibold leading-none">
          {recipesCount}
        </p>
        <p className="mt-1 font-nunito text-sm">Рецепты</p>
      </div>
      <button type="button" onClick={onFollowingClick}>
        <p className="font-nunito text-xl font-semibold leading-none">
          {followingCount}
        </p>
        <p className="mt-1 font-nunito text-sm">Подписки</p>
      </button>
      <button type="button" onClick={onFollowersClick}>
        <p className="font-nunito text-xl font-semibold leading-none">
          {followersCount}
        </p>
        <p className="mt-1 font-nunito text-sm">Подписчики</p>
      </button>
    </div>
  );
}
