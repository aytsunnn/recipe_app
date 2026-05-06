"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import FeedCard from "../../components/FeedCard";
import LeftPart from "../../components/MainScreen/NavigationLeftPart";
import RightPart from "../../components/MainScreen/NewsRightPart";
import ScrollToTopButton from "../../components/ScrollToTopButton";
import { authService } from "../../services/authService";
import { followService, FollowUser } from "../../services/followService";
import { Recipe } from "../../services/recipeService";
import { userService, User } from "../../services/userService";
import { normalizeImageUrl } from "../../utils/imageUrl";

interface ProfileStats {
  recipes: number;
  followers: number;
  following: number;
}

const getSafeImageUrl = (url: string | null) => {
  return normalizeImageUrl(url, "/avatar.jpg");
};

export default function PublicUserPage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id || "";

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stats, setStats] = useState<ProfileStats>({ recipes: 0, followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const feedColumnRef = useRef<HTMLDivElement | null>(null);

  const isOwnProfile = useMemo(() => Boolean(currentUserId && currentUserId === profile?.id), [currentUserId, profile?.id]);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        setError(null);

        const [publicProfile, userRecipes, followers, following] = await Promise.all([
          userService.getById(userId),
          userService.getRecipes(userId),
          followService.getFollowers(userId),
          followService.getFollowing(userId),
        ]);

        setProfile(publicProfile);
        const visibleRecipes = userRecipes.filter((recipe) => !recipe.is_private);
        setRecipes(visibleRecipes);
        setStats({ recipes: visibleRecipes.length, followers: followers.length, following: following.length });

        if (authService.isAuthenticated()) {
          const me = await authService.getCurrentUser();
          setCurrentUserId(me?.id);
          if (me?.id) {
            const myFollowing = await followService.getFollowing(me.id);
            setIsFollowing(myFollowing.some((u: FollowUser) => u.id === userId));
          }
        }
      } catch (loadError) {
        console.error("Ошибка загрузки профиля пользователя:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить пользователя");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [userId]);

  const toggleFollow = async () => {
    if (!authService.isAuthenticated() || !profile) return;
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      if (next) await followService.follow(profile.id);
      else await followService.unfollow(profile.id);
      setStats((prev) => ({ ...prev, followers: Math.max(0, prev.followers + (next ? 1 : -1)) }));
    } catch (followError) {
      console.error("Ошибка подписки:", followError);
      setIsFollowing(!next);
    }
  };

  return (
    <div className="flex w-full gap-5">
      <div className="hidden w-55.75 lg:flex">
        <LeftPart />
      </div>

      <div className="w-full lg:w-169.5">
        {loading && (
          <div className="rounded-[20px] bg-white p-8 text-center font-nunito text-umami-gray">Загрузка...</div>
        )}

        {!loading && error && (
          <div className="rounded-[20px] bg-white p-8 text-center font-nunito text-red-500">{error}</div>
        )}

        {!loading && !error && profile && (
          <div className="flex flex-col gap-4">
            <div className="rounded-[20px] border border-[#eaeaea] bg-white p-5">
              <div className="flex items-center gap-4">
                <Image
                  src={getSafeImageUrl(profile.avatar_url)}
                  alt={profile.name}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate font-nunito text-2xl font-bold text-umami-dark-gray">{profile.name}</h1>
                  <p className="font-inter text-sm text-umami-gray">@{profile.username}</p>
                  <p className="mt-2 font-inter text-sm text-umami-gray">
                    {stats.recipes} рецептов • {stats.followers} подписчиков • {stats.following} подписок
                  </p>
                </div>
                {!isOwnProfile && authService.isAuthenticated() && (
                  <button
                    type="button"
                    onClick={() => void toggleFollow()}
                    className={`rounded-full px-4 py-2 font-nunito text-sm font-bold ${
                      isFollowing ? "bg-[#f1ebdb] text-umami-dark-gray" : "bg-umami-green text-white"
                    }`}
                  >
                    {isFollowing ? "Вы подписаны" : "Подписаться"}
                  </button>
                )}
              </div>
            </div>

            {recipes.length === 0 ? (
              <div className="rounded-[20px] bg-white p-8 text-center font-nunito text-umami-gray">У автора пока нет рецептов</div>
            ) : (
              <div ref={feedColumnRef} className="flex flex-col gap-3">
                {recipes.map((recipe) => (
                  <FeedCard
                    key={recipe.id}
                    recipe={recipe}
                    currentUserId={currentUserId}
                    isFollowing={isFollowing}
                    showAuthorHeader={false}
                  />
                ))}
                <ScrollToTopButton anchorRef={feedColumnRef} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hidden w-63.75 lg:flex">
        <RightPart />
      </div>
    </div>
  );
}
