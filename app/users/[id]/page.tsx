"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import FeedCard from "../../components/feed-card/FeedCard";
import LeftPart from "../../components/MainScreen/NavigationLeftPart";
import RightPart from "../../components/MainScreen/NewsRightPart";
import NotFoundState from "../../components/NotFoundState";
import ScrollToTopButton from "../../components/ScrollToTopButton";
import { authService } from "../../services/authService";
import { followService, FollowUser } from "../../services/followService";
import { moderationService } from "../../services/moderationService";
import { Recipe } from "../../services/recipeService";
import { userService, User } from "../../services/userService";
import { isNotFoundErrorMessage } from "../../utils/errorUtils";
import { normalizeImageUrl } from "../../utils/imageUrl";
import { useUiFeedback } from "../../components/UiFeedbackProvider";
import { isAdminRole } from "../../utils/role";

interface ProfileStats {
  recipes: number;
  followers: number;
  following: number;
}

const getSafeImageUrl = (url: string | null) => {
  return normalizeImageUrl(url, "/avatar.jpg");
};

export default function PublicUserPage() {
  const { toast, requestReport, confirm } = useUiFeedback();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params?.id || "";

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(
    undefined
  );
  const [profile, setProfile] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stats, setStats] = useState<ProfileStats>({
    recipes: 0,
    followers: 0,
    following: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState<
    "toggle-block" | "delete" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const feedColumnRef = useRef<HTMLDivElement | null>(null);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);

  const isOwnProfile = useMemo(
    () => Boolean(currentUserId && currentUserId === profile?.id),
    [currentUserId, profile?.id]
  );

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        setError(null);

        const [publicProfile, userRecipes, followers, following] =
          await Promise.all([
            userService.getById(userId),
            userService.getRecipes(userId),
            followService.getFollowers(userId),
            followService.getFollowing(userId),
          ]);

        setProfile(publicProfile);
        const visibleRecipes = userRecipes.filter(
          (recipe) => !recipe.is_private
        );
        setRecipes(visibleRecipes);
        setStats({
          recipes: visibleRecipes.length,
          followers: followers.length,
          following: following.length,
        });

        if (authService.isAuthenticated()) {
          const me = await authService.getCurrentUser();
          if (me?.id && String(me.id) === String(userId)) {
            router.replace("/profile");
            return;
          }
          setCurrentUserId(me?.id);
          const effectiveRole = me?.role || authService.getRoleFromToken();
          setIsAdmin(isAdminRole(effectiveRole));
          if (me?.id) {
            const myFollowing = await followService.getFollowing(me.id);
            setIsFollowing(
              myFollowing.some((u: FollowUser) => u.id === userId)
            );
          }
        } else {
          setIsAdmin(false);
        }
      } catch (loadError) {
        console.error("Ошибка загрузки профиля пользователя:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить пользователя"
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [userId, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!adminMenuRef.current) return;
      if (adminMenuRef.current.contains(event.target as Node)) return;
      setAdminMenuOpen(false);
    };

    if (adminMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [adminMenuOpen]);

  const toggleFollow = async () => {
    if (!authService.isAuthenticated() || !profile) return;
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      if (next) await followService.follow(profile.id);
      else await followService.unfollow(profile.id);
      setStats((prev) => ({
        ...prev,
        followers: Math.max(0, prev.followers + (next ? 1 : -1)),
      }));
    } catch (followError) {
      console.error("Ошибка подписки:", followError);
      setIsFollowing(!next);
    }
  };

  const handleReportProfile = async () => {
    if (!authService.isAuthenticated() || !profile) {
      toast("Необходимо авторизоваться", "error");
      return;
    }
    const reportPayload = await requestReport();
    if (!reportPayload) return;

    try {
      await moderationService.createReport({
        type: "profile",
        reason: reportPayload.reason.trim(),
        description: reportPayload.description.trim(),
        reported_user_id: Number(profile.id),
      });
      toast("Жалоба отправлена", "success");
    } catch (error) {
      console.error("Ошибка отправки жалобы на профиль:", error);
      toast("Не удалось отправить жалобу", "error");
    }
  };

  const handleToggleBlockUser = async () => {
    if (!profile) return;
    const nextBlocked = !profile.is_blocked;
    const confirmed = await confirm(
      nextBlocked
        ? "Заблокировать пользователя?"
        : "Разблокировать пользователя?"
    );
    if (!confirmed) return;

    try {
      setAdminActionLoading("toggle-block");
      await moderationService.blockUser(profile.id);
      setProfile((prev) =>
        prev ? { ...prev, is_blocked: nextBlocked } : prev
      );
      toast(
        nextBlocked
          ? "Пользователь заблокирован"
          : "Пользователь разблокирован",
        "success"
      );
      setAdminMenuOpen(false);
    } catch (err) {
      console.error("Ошибка смены блокировки пользователя:", err);
      toast("Не удалось изменить статус блокировки", "error");
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!profile) return;
    const confirmed = await confirm(
      "Удалить пользователя? Это действие необратимо."
    );
    if (!confirmed) return;

    try {
      setAdminActionLoading("delete");
      await moderationService.deleteUser(profile.id);
      toast("Пользователь удален", "success");
      setError("Пользователь удален");
      setProfile(null);
      setRecipes([]);
      setAdminMenuOpen(false);
    } catch (err) {
      console.error("Ошибка удаления пользователя:", err);
      toast("Не удалось удалить пользователя", "error");
    } finally {
      setAdminActionLoading(null);
    }
  };

  return (
    <div className="flex w-full gap-5">
      <div className="hidden lg:flex lg:w-55.75">
        <LeftPart />
      </div>

      <div className="w-full pb-10 lg:w-169.5">
        {loading && (
          <div className="rounded-[20px] bg-white p-8 text-center font-nunito text-umami-gray">
            Загрузка...
          </div>
        )}

        {!loading && error && isNotFoundErrorMessage(error) && (
          <NotFoundState
            title="Ошибка 404"
            description="Пользователь не найден или профиль был удален."
            actionHref="/"
            actionLabel="Вернуться на главную"
          />
        )}

        {!loading && error && !isNotFoundErrorMessage(error) && (
          <div className="rounded-[20px] bg-white p-8 text-center font-nunito text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && profile && (
          <div className="flex flex-col gap-4">
            <div className="relative flex h-[190px] items-center rounded-[20px] border border-[#eaeaea] bg-white p-5">
              {!isOwnProfile && isAdmin ? (
                <div ref={adminMenuRef} className="absolute right-5 top-5 z-20">
                  <button
                    type="button"
                    onClick={() => setAdminMenuOpen((prev) => !prev)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-umami-light-gray/60 bg-white hover:bg-[#f7f4ea]"
                    aria-label="Действия администратора"
                  >
                    <Image
                      width={18}
                      height={18}
                      src="/DotsThreeOutlineVertical.svg"
                      alt="admin-actions"
                    />
                  </button>
                  {adminMenuOpen ? (
                    <div className="absolute right-0 top-9 min-w-[220px] rounded-xl border border-umami-light-gray/60 bg-white p-1 shadow-md">
                      <button
                        type="button"
                        disabled={adminActionLoading !== null}
                        onClick={() => void handleToggleBlockUser()}
                        className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-umami-dark-gray hover:bg-[#f7f4ea] disabled:opacity-60"
                      >
                        {profile.is_blocked ? "Разблокировать" : "Заблокировать"}
                      </button>
                      <button
                        type="button"
                        disabled={adminActionLoading !== null}
                        onClick={() => void handleDeleteUser()}
                        className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
                      >
                        Удалить
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex w-full items-center gap-5">
                <Image
                  src={getSafeImageUrl(profile.avatar_url)}
                  alt={profile.name}
                  width={150}
                  height={150}
                  className="h-[150px] w-[150px] rounded-full object-cover"
                />
                <div className="min-w-0 flex-1 pr-10">
                  <h1 className="truncate font-nunito text-xl font-bold text-black">
                    {profile.name}
                  </h1>
                  <p className="font-inter text-sm text-umami-gray">
                    @{profile.username}
                  </p>
                  {profile.is_blocked ? (
                    <p className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                      Пользователь заблокирован
                    </p>
                  ) : null}
                  {profile.bio ? (
                    <p className="mt-1 line-clamp-2 max-w-[560px] font-inter text-sm text-umami-gray">
                      О себе: {profile.bio}
                    </p>
                  ) : null}
                  <div className="mt-2 flex gap-6 text-center text-black">
                    <div>
                      <p className="font-nunito text-xl font-semibold leading-none">
                        {stats.recipes}
                      </p>
                      <p className="mt-1 font-nunito text-sm">Рецепты</p>
                    </div>
                    <div>
                      <p className="font-nunito text-xl font-semibold leading-none">
                        {stats.following}
                      </p>
                      <p className="mt-1 font-nunito text-sm">Подписки</p>
                    </div>
                    <div>
                      <p className="font-nunito text-xl font-semibold leading-none">
                        {stats.followers}
                      </p>
                      <p className="mt-1 font-nunito text-sm">Подписчики</p>
                    </div>
                  </div>
                  {!isOwnProfile && authService.isAuthenticated() ? (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleFollow()}
                        className={`rounded-full px-3 py-1 font-nunito text-xs font-bold ${
                          isFollowing
                            ? "bg-[#f1ebdb] text-umami-dark-gray"
                            : "bg-umami-green text-white"
                        }`}
                      >
                        {isFollowing ? "Вы подписаны" : "Подписаться"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReportProfile()}
                        className="rounded-full border border-umami-light-gray/60 bg-white px-3 py-1 font-nunito text-xs font-bold text-umami-dark-gray hover:bg-[#f7f4ea]"
                      >
                        Пожаловаться
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {recipes.length === 0 ? (
              <div className="rounded-[20px] bg-white p-8 text-center font-nunito text-umami-gray">
                У автора пока нет рецептов
              </div>
            ) : (
              <div ref={feedColumnRef} className="flex flex-col gap-3 pb-10">
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

      <div className="hidden lg:flex lg:w-63.75">
        <RightPart />
      </div>
    </div>
  );
}



