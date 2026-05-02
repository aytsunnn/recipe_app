"use client";

import { useEffect, useState } from "react";
import { authService, User } from "../services/authService";
import { followService, FollowUser } from "../services/followService";
import { userService } from "../services/userService";
import { Recipe } from "../services/recipeService";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import FeedCard from "../components/FeedCard";

interface UserStats {
  followingCount: number;
  followersCount: number;
  recipesCount: number;
  friendsCount: number;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats>({
    followingCount: 0,
    followersCount: 0,
    recipesCount: 0,
    friendsCount: 0,
  });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [friends, setFriends] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    username: "",
    email: "",
  });
  const router = useRouter();

  const getSafeImageUrl = (url: string | null) => {
    if (!url || url === "null" || url === "undefined") return "/avatar.jpg";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
      return url;
    }
    return `/${url}`;
  };

  useEffect(() => {
    const loadUser = async () => {
      if (!authService.isAuthenticated()) {
        router.push("/");
        return;
      }

      const userData = await authService.getCurrentUser();
      if (!userData) {
        router.push("/");
        return;
      }

      setUser(userData);

      // Загружаем статистику
      try {
        const [following, followers, userRecipes] = await Promise.all([
          followService.getFollowing(userData.id),
          followService.getFollowers(userData.id),
          userService.getRecipes(userData.id),
        ]);

        // Вычисляем друзей (взаимные подписки)
        const followingIds = new Set(following.map((f: FollowUser) => f.id));
        const mutualFriends = followers.filter((f: FollowUser) => followingIds.has(f.id));

        setFriends(mutualFriends);
        setStats({
          followingCount: following.length,
          followersCount: followers.length,
          recipesCount: userRecipes.length,
          friendsCount: mutualFriends.length,
        });

        setRecipes(userRecipes);
      } catch (error) {
        console.error("Ошибка при загрузке данных профиля:", error);
      }

      setIsLoading(false);
    };

    loadUser();
  }, [router]);

  const handleLogout = () => {
    authService.removeToken();
    authService.dispatchAuthChange();
    router.push("/");
  };

  const handleEditProfile = () => {
    if (user) {
      setEditFormData({
        name: user.name,
        username: user.username,
        email: user.email || "",
      });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const updatedUser = await userService.updateProfile(editFormData);
      // Обновляем пользователя с сохранением email
      setUser({
        ...updatedUser,
        email: updatedUser.email || user?.email || "",
      });
      setIsEditModalOpen(false);
      alert("Профиль успешно обновлен");
    } catch (error) {
      console.error("Ошибка при обновлении профиля:", error);
      alert("Не удалось обновить профиль");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <p className="text-umami-gray">Загрузка...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="w-full gap-5 flex flex-row">
        {/* Левая навигация */}
        <div className="flex w-55.75">
          <div className="w-full flex flex-col gap-1">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-umami-orange/10 text-umami-orange font-nunito font-medium text-sm transition-colors"
            >
              <Image width={20} height={20} src="/User.svg" alt="profile" />
              Личный кабинет
            </Link>
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-umami-dark-gray hover:bg-umami-light-yellow font-nunito font-medium text-sm transition-colors"
            >
              <Image width={20} height={20} src="/House.svg" alt="home" />
              Главная
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-500 hover:bg-red-50 font-nunito font-medium text-sm transition-colors text-left"
            >
              <Image width={20} height={20} src="/SignOut.svg" alt="logout" />
              Выйти
            </button>
          </div>
        </div>

        {/* Центральная часть — профиль и посты */}
        <div className="flex flex-col w-169.5 gap-5">
          {/* Карточка профиля */}
          <div className="bg-white rounded-lg border border-umami-light-gray/50 p-6">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                <Image
                  width={96}
                  height={96}
                  src={getSafeImageUrl(user.avatar_url)}
                  className="w-full h-full object-cover"
                  alt="avatar"
                />
              </div>
              <div className="flex-1">
                <h1 className="font-nunito font-black text-xl text-umami-dark-gray">
                  {user.name}
                </h1>
                {/* Статистика */}
                <div className="flex gap-6 mt-2">
                  <div className="text-center">
                    <p className="font-nunito font-bold text-lg text-umami-dark-gray">
                      {stats.recipesCount}
                    </p>
                    <p className="font-inter text-xs text-umami-gray">Рецепты</p>
                  </div>
                  <div className="text-center">
                    <p className="font-nunito font-bold text-lg text-umami-dark-gray">
                      {stats.followingCount}
                    </p>
                    <p className="font-inter text-xs text-umami-gray">Подписки</p>
                  </div>
                  <div className="text-center">
                    <p className="font-nunito font-bold text-lg text-umami-dark-gray">
                      {stats.followersCount}
                    </p>
                    <p className="font-inter text-xs text-umami-gray">Подписчики</p>
                  </div>
                </div>
                <button
                  onClick={handleEditProfile}
                  className="mt-3 bg-umami-green hover:bg-[#6A805E] text-white font-nunito font-medium text-sm px-5 py-1.5 rounded-full transition-colors"
                >
                  Редактировать профиль
                </button>
              </div>
            </div>
          </div>

          {/* Посты пользователя */}
          {recipes.length > 0 ? (
            <div className="flex flex-col gap-4">
              {recipes.map((recipe) => (
                <FeedCard
                  key={recipe.id}
                  recipe={recipe}
                  currentUserId={user.id}
                  isFollowing={false}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-umami-light-gray/50 p-8 text-center">
              <p className="font-nunito font-bold text-lg text-umami-gray">
                Пока нет рецептов
              </p>
              <p className="font-inter text-sm text-umami-light-gray mt-1">
                Ваши рецепты появятся здесь
              </p>
            </div>
          )}
        </div>

        {/* Правая часть — друзья */}
        <div className="flex w-63.75">
          <div className="w-full bg-white rounded-lg border border-umami-light-gray/50 p-4 h-fit sticky top-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-nunito font-bold text-base text-umami-dark-gray">
                Друзья
              </h3>
              <span className="font-inter text-sm text-umami-gray">
                {friends.length}
              </span>
            </div>
            {friends.length > 0 ? (
              <div className="flex flex-col gap-3">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      <Image
                        width={32}
                        height={32}
                        src={getSafeImageUrl(friend.avatar_url)}
                        className="w-full h-full object-cover"
                        alt="avatar"
                      />
                    </div>
                    <p className="font-inter text-sm text-umami-dark-gray">
                      {friend.name}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-inter text-sm text-umami-gray text-center py-4">
                Пока нет друзей
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно редактирования профиля */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-umami-dark-gray/80">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="font-nunito font-black text-2xl text-umami-dark-gray mb-6">
              Редактировать профиль
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="font-inter text-sm text-umami-gray mb-1 block">
                  Имя
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="border w-full border-umami-light-gray rounded-full px-4 py-2 font-nunito text-sm text-umami-dark-gray focus:outline-none focus:border-umami-green"
                />
              </div>
              <div>
                <label className="font-inter text-sm text-umami-gray mb-1 block">
                  Имя пользователя
                </label>
                <input
                  type="text"
                  value={editFormData.username}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, username: e.target.value })
                  }
                  className="border w-full border-umami-light-gray rounded-full px-4 py-2 font-nunito text-sm text-umami-dark-gray focus:outline-none focus:border-umami-green"
                />
              </div>
              <div>
                <label className="font-inter text-sm text-umami-gray mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  className="border w-full border-umami-light-gray rounded-full px-4 py-2 font-nunito text-sm text-umami-dark-gray focus:outline-none focus:border-umami-green"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSaveProfile}
                className="flex-1 bg-umami-green hover:bg-[#6A805E] text-white font-nunito font-medium px-6 py-2 rounded-full transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 bg-umami-gray hover:bg-gray-500 text-white font-nunito font-medium px-6 py-2 rounded-full transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
