"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import FeedCard from "../components/FeedCard";
import { authService, User } from "../services/authService";
import { followService, FollowUser } from "../services/followService";
import { Recipe, recipeService } from "../services/recipeService";
import { userService } from "../services/userService";
import { metaService, Category, Celebration, Cooking, Kitchen } from "../services/metaService";

interface UserStats {
  followingCount: number;
  followersCount: number;
  recipesCount: number;
}

interface IngredientRow {
  id: number;
  quantity: number;
  note: string;
}

interface StepRow {
  description: string;
  image_url: string;
}

interface RecipeFormData {
  title: string;
  description: string;
  difficulty: string;
  portion: number;
  cooking_time: number;
  calorific: number;
  proteins: number;
  fats: number;
  carbohydrates: number;
  is_private: boolean;
  kitchen_id: number | null;
  celebration_id: number | null;
  cooking_id: number | null;
  categories: number[];
  ingredients: IngredientRow[];
  steps: StepRow[];
}

const navItems = [
  { href: "/profile", label: "Личный кабинет", icon: "/User.svg", active: true },
  { href: "/favorites", label: "Избранное", icon: "/Favorites.svg" },
  { href: "/", label: "Главная", icon: "/House.svg" },
  { href: "/profile#week-menu", label: "Меню недели", icon: "/ClipboardText.svg" },
  { href: "/recipes/random", label: "Случайный рецепт", icon: "/DiceFive.svg" },
  { href: "/profile#settings", label: "Настройки", icon: "/Settings.svg" },
];

const emptyRecipeForm: RecipeFormData = {
  title: "",
  description: "",
  difficulty: "Легко",
  portion: 1,
  cooking_time: 30,
  calorific: 0,
  proteins: 0,
  fats: 0,
  carbohydrates: 0,
  is_private: false,
  kitchen_id: null,
  celebration_id: null,
  cooking_id: null,
  categories: [],
  ingredients: [{ id: 1, quantity: 1, note: "" }],
  steps: [{ description: "", image_url: "" }],
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats>({
    followingCount: 0,
    followersCount: 0,
    recipesCount: 0,
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

  const [isRecipeEditorOpen, setIsRecipeEditorOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeForm, setRecipeForm] = useState<RecipeFormData>(emptyRecipeForm);
  const [recipeActionLoading, setRecipeActionLoading] = useState(false);

  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [cookings, setCookings] = useState<Cooking[]>([]);

  const visibleFriends = useMemo(() => friends.slice(0, 6), [friends]);

  const getSafeImageUrl = (url: string | null) => {
    if (!url || url === "null" || url === "undefined") return "/avatar.jpg";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
      return url;
    }
    return `/${url}`;
  };

  const loadMeta = async () => {
    try {
      const data = await metaService.getAll();
      setKitchens(data.kitchens);
      setCategories(data.categories);
      setCelebrations(data.celebrations);
      setCookings(data.cookings);
    } catch (error) {
      console.error("Ошибка загрузки метаданных рецепта:", error);
    }
  };

  const loadProfile = async (currentUser: User) => {
    const [following, followers, userRecipes] = await Promise.all([
      followService.getFollowing(currentUser.id),
      followService.getFollowers(currentUser.id),
      userService.getRecipes(currentUser.id),
    ]);

    const followingIds = new Set(following.map((follow) => follow.id));
    const mutualFriends = followers.filter((follower) => followingIds.has(follower.id));

    setFriends(mutualFriends);
    setRecipes(userRecipes);
    setStats({
      followingCount: following.length,
      followersCount: followers.length,
      recipesCount: userRecipes.length,
    });
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!authService.isAuthenticated()) {
        router.push("/");
        return;
      }

      const userData = await authService.getCurrentUser();
      if (!userData) {
        router.push("/");
        return;
      }

      if (cancelled) return;
      setUser(userData);

      try {
        await Promise.all([loadMeta(), loadProfile(userData)]);
      } catch (error) {
        console.error("Ошибка при загрузке профиля:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleEditProfile = () => {
    if (!user) return;
    setEditFormData({
      name: user.name,
      username: user.username,
      email: user.email || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      const updatedUser = await userService.updateProfile(editFormData);
      setUser({
        ...updatedUser,
        email: updatedUser.email || user?.email || "",
      });
      setIsEditModalOpen(false);
      authService.dispatchAuthChange();
    } catch (error) {
      console.error("Ошибка при обновлении профиля:", error);
      alert("Не удалось обновить профиль");
    }
  };

  const openCreateRecipeEditor = () => {
    setEditingRecipeId(null);
    setRecipeForm(emptyRecipeForm);
    setIsRecipeEditorOpen(true);
  };

  const openEditRecipeEditor = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setRecipeForm({
      title: recipe.title || "",
      description: recipe.description || "",
      difficulty: recipe.difficulty || "Легко",
      portion: recipe.portion || 1,
      cooking_time: recipe.cooking_time || 30,
      calorific: recipe.calorific || 0,
      proteins: 0,
      fats: 0,
      carbohydrates: 0,
      is_private: Boolean(recipe.is_private),
      kitchen_id: recipe.kitchen_id ? Number(recipe.kitchen_id) : null,
      celebration_id: recipe.celebration_id ? Number(recipe.celebration_id) : null,
      cooking_id: recipe.cooking_id ? Number(recipe.cooking_id) : null,
      categories: [],
      ingredients: [{ id: 1, quantity: 1, note: "" }],
      steps: [{ description: "", image_url: "" }],
    });
    setIsRecipeEditorOpen(true);
  };

  const setIngredient = (index: number, patch: Partial<IngredientRow>) => {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      ),
    }));
  };

  const setStep = (index: number, patch: Partial<StepRow>) => {
    setRecipeForm((prev) => ({
      ...prev,
      steps: prev.steps.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    }));
  };

  const handleSaveRecipe = async () => {
    if (!user) return;
    if (!recipeForm.title.trim() || !recipeForm.description.trim()) {
      alert("Заполните название и описание рецепта");
      return;
    }

    try {
      setRecipeActionLoading(true);
      const payload = {
        title: recipeForm.title.trim(),
        description: recipeForm.description.trim(),
        difficulty: recipeForm.difficulty,
        portion: Number(recipeForm.portion) || 1,
        cooking_time: Number(recipeForm.cooking_time) || 1,
        calorific: Number(recipeForm.calorific) || 0,
        proteins: Number(recipeForm.proteins) || 0,
        fats: Number(recipeForm.fats) || 0,
        carbohydrates: Number(recipeForm.carbohydrates) || 0,
        is_private: recipeForm.is_private,
        kitchen_id: recipeForm.kitchen_id,
        celebration_id: recipeForm.celebration_id,
        cooking_id: recipeForm.cooking_id,
        categories: recipeForm.categories,
        ingredients: recipeForm.ingredients.filter((item) => item.id > 0),
        steps: recipeForm.steps.filter((item) => item.description.trim().length > 0),
      };

      if (editingRecipeId) {
        await recipeService.update(editingRecipeId, payload);
      } else {
        await recipeService.create(payload);
      }

      await loadProfile(user);
      setIsRecipeEditorOpen(false);
      setEditingRecipeId(null);
      setRecipeForm(emptyRecipeForm);
    } catch (error) {
      console.error("Ошибка при сохранении рецепта:", error);
      alert("Не удалось сохранить рецепт");
    } finally {
      setRecipeActionLoading(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!user) return;
    if (!window.confirm("Удалить этот рецепт?")) return;
    try {
      setRecipeActionLoading(true);
      await recipeService.delete(recipeId);
      await loadProfile(user);
    } catch (error) {
      console.error("Ошибка при удалении рецепта:", error);
      alert("Не удалось удалить рецепт");
    } finally {
      setRecipeActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <p className="font-nunito text-sm text-umami-gray">Загрузка...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <div className="grid w-full grid-cols-[223px_minmax(0,1fr)] gap-5">
        <aside className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex h-[30px] items-center gap-2.5 rounded-[7px] px-[5px] font-nunito text-xs font-bold text-umami-dark-gray transition-colors ${
                item.active ? "bg-[#f1ebdb]" : "hover:bg-[#f1ebdb]/70"
              }`}
            >
              <Image width={20} height={20} src={item.icon} alt="" />
              <span>{item.label}</span>
            </Link>
          ))}
        </aside>

        <section className="flex min-w-0 flex-col gap-5">
          <div className="flex h-[190px] items-center rounded-[20px] border border-[#eaeaea] bg-white p-5">
            <div className="flex w-full items-center gap-5">
              <div className="relative h-[150px] w-[150px] shrink-0 overflow-hidden rounded-full bg-[#d9d9d9]">
                <Image
                  width={150}
                  height={150}
                  src={getSafeImageUrl(user.avatar_url)}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex min-w-0 flex-col gap-5">
                <h1 className="font-nunito text-xl font-bold text-black">{user.name}</h1>
                <div className="flex gap-6 text-center text-black">
                  <div>
                    <p className="font-nunito text-xl font-semibold leading-none">
                      {stats.recipesCount}
                    </p>
                    <p className="mt-1 font-nunito text-sm">Рецепты</p>
                  </div>
                  <div>
                    <p className="font-nunito text-xl font-semibold leading-none">
                      {stats.followingCount}
                    </p>
                    <p className="mt-1 font-nunito text-sm">Подписки</p>
                  </div>
                  <div>
                    <p className="font-nunito text-xl font-semibold leading-none">
                      {stats.followersCount}
                    </p>
                    <p className="mt-1 font-nunito text-sm">Подписчики</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleEditProfile}
                    className="w-fit rounded-full bg-umami-green px-3 py-[5px] font-nunito text-xs text-white transition-colors hover:bg-[#6a805e]"
                  >
                    Редактировать профиль
                  </button>
                  <button
                    type="button"
                    onClick={openCreateRecipeEditor}
                    className="w-fit rounded-full bg-umami-orange px-3 py-[5px] font-nunito text-xs text-white transition-colors hover:bg-[#dd8c45]"
                  >
                    + Добавить рецепт
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!isRecipeEditorOpen && (
            <div className="grid grid-cols-[678px_255px] gap-5">
              <div className="flex min-w-0 flex-col gap-2.5">
                {recipes.length > 0 ? (
                  recipes.map((recipe) => (
                    <div key={recipe.id} className="relative">
                      <div className="absolute right-3 top-3 z-10 flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditRecipeEditor(recipe)}
                          className="rounded-full bg-white/95 px-3 py-1 font-nunito text-xs font-bold text-umami-dark-gray shadow"
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          className="rounded-full bg-red-500 px-3 py-1 font-nunito text-xs font-bold text-white shadow"
                        >
                          Удалить
                        </button>
                      </div>
                      {recipe.is_private && (
                        <span className="absolute left-3 top-3 z-10 rounded-full bg-[#333]/90 px-3 py-1 font-nunito text-xs font-bold text-white">
                          Приватный
                        </span>
                      )}
                      <FeedCard recipe={recipe} currentUserId={user.id} isFollowing={false} />
                    </div>
                  ))
                ) : (
                  <div className="rounded-[15px] border border-[#eaeaea] bg-white p-8 text-center">
                    <p className="font-nunito text-lg font-bold text-umami-gray">Пока нет рецептов</p>
                    <p className="mt-1 font-inter text-sm text-umami-light-gray">
                      Нажмите "Добавить рецепт", чтобы создать первый.
                    </p>
                  </div>
                )}
              </div>

              <aside className="h-fit rounded-[15px] border border-[#eaeaea] bg-white p-2.5">
                <div className="mb-2 flex items-center justify-between font-inter text-base">
                  <h2 className="text-[#222]">Друзья</h2>
                  <span className="text-[#999]">{friends.length}</span>
                </div>
                {visibleFriends.length > 0 ? (
                  <div className="flex flex-col gap-[5px]">
                    {visibleFriends.map((friend) => (
                      <div key={friend.id} className="flex items-center gap-[5px]">
                        <div className="relative h-[30px] w-[30px] shrink-0 overflow-hidden rounded-full bg-[#d9d9d9]">
                          <Image
                            width={30}
                            height={30}
                            src={getSafeImageUrl(friend.avatar_url)}
                            alt="avatar"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="truncate font-inter text-sm text-umami-dark-gray">{friend.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center font-inter text-sm text-umami-gray">Пока нет друзей</p>
                )}
              </aside>
            </div>
          )}

          {isRecipeEditorOpen && (
            <div className="rounded-[20px] border border-[#eaeaea] bg-white p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-nunito text-2xl font-bold text-umami-dark-gray">
                  {editingRecipeId ? "Редактировать рецепт" : "Добавить рецепт"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecipeEditorOpen(false);
                    setEditingRecipeId(null);
                    setRecipeForm(emptyRecipeForm);
                  }}
                  className="rounded-full bg-umami-gray px-4 py-1.5 font-nunito text-sm text-white"
                >
                  Закрыть
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="col-span-2 block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">Название</span>
                  <input
                    type="text"
                    value={recipeForm.title}
                    onChange={(e) => setRecipeForm({ ...recipeForm, title: e.target.value })}
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  />
                </label>

                <label className="col-span-2 block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">Описание</span>
                  <textarea
                    value={recipeForm.description}
                    onChange={(e) => setRecipeForm({ ...recipeForm, description: e.target.value })}
                    className="h-24 w-full rounded-2xl border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">Сложность</span>
                  <select
                    value={recipeForm.difficulty}
                    onChange={(e) => setRecipeForm({ ...recipeForm, difficulty: e.target.value })}
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  >
                    <option value="Легко">Легко</option>
                    <option value="Средне">Средне</option>
                    <option value="Сложно">Сложно</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">Порции</span>
                  <input
                    type="number"
                    min={1}
                    value={recipeForm.portion}
                    onChange={(e) =>
                      setRecipeForm({ ...recipeForm, portion: Number(e.target.value) || 1 })
                    }
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">
                    Время приготовления (мин)
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={recipeForm.cooking_time}
                    onChange={(e) =>
                      setRecipeForm({ ...recipeForm, cooking_time: Number(e.target.value) || 1 })
                    }
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">Калории</span>
                  <input
                    type="number"
                    min={0}
                    value={recipeForm.calorific}
                    onChange={(e) =>
                      setRecipeForm({ ...recipeForm, calorific: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">Белки</span>
                  <input
                    type="number"
                    min={0}
                    value={recipeForm.proteins}
                    onChange={(e) =>
                      setRecipeForm({ ...recipeForm, proteins: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">Жиры</span>
                  <input
                    type="number"
                    min={0}
                    value={recipeForm.fats}
                    onChange={(e) => setRecipeForm({ ...recipeForm, fats: Number(e.target.value) || 0 })}
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">Углеводы</span>
                  <input
                    type="number"
                    min={0}
                    value={recipeForm.carbohydrates}
                    onChange={(e) =>
                      setRecipeForm({ ...recipeForm, carbohydrates: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">Кухня</span>
                  <select
                    value={recipeForm.kitchen_id ?? ""}
                    onChange={(e) =>
                      setRecipeForm({
                        ...recipeForm,
                        kitchen_id: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  >
                    <option value="">Не выбрано</option>
                    {kitchens.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">Праздник</span>
                  <select
                    value={recipeForm.celebration_id ?? ""}
                    onChange={(e) =>
                      setRecipeForm({
                        ...recipeForm,
                        celebration_id: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  >
                    <option value="">Не выбрано</option>
                    {celebrations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">
                    Способ приготовления
                  </span>
                  <select
                    value={recipeForm.cooking_id ?? ""}
                    onChange={(e) =>
                      setRecipeForm({
                        ...recipeForm,
                        cooking_id: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm"
                  >
                    <option value="">Не выбрано</option>
                    {cookings.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="col-span-2">
                  <span className="mb-1 block font-inter text-sm text-umami-gray">Категории</span>
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-umami-light-gray p-3">
                    {categories.map((item) => {
                      const selected = recipeForm.categories.includes(Number(item.id));
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setRecipeForm((prev) => ({
                              ...prev,
                              categories: selected
                                ? prev.categories.filter((id) => id !== Number(item.id))
                                : [...prev.categories, Number(item.id)],
                            }))
                          }
                          className={`rounded-full px-3 py-1 text-sm font-nunito ${
                            selected ? "bg-umami-orange text-white" : "bg-gray-100 text-umami-gray"
                          }`}
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-inter text-sm text-umami-gray">Ингредиенты</span>
                    <button
                      type="button"
                      onClick={() =>
                        setRecipeForm((prev) => ({
                          ...prev,
                          ingredients: [...prev.ingredients, { id: 1, quantity: 1, note: "" }],
                        }))
                      }
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-nunito"
                    >
                      + ингредиент
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recipeForm.ingredients.map((item, index) => (
                      <div key={index} className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min={1}
                          value={item.id}
                          onChange={(e) => setIngredient(index, { id: Number(e.target.value) || 1 })}
                          placeholder="ID"
                          className="rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                        />
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            setIngredient(index, { quantity: Number(e.target.value) || 1 })
                          }
                          placeholder="Кол-во"
                          className="rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={item.note}
                          onChange={(e) => setIngredient(index, { note: e.target.value })}
                          placeholder="Примечание"
                          className="rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-inter text-sm text-umami-gray">Шаги</span>
                    <button
                      type="button"
                      onClick={() =>
                        setRecipeForm((prev) => ({
                          ...prev,
                          steps: [...prev.steps, { description: "", image_url: "" }],
                        }))
                      }
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-nunito"
                    >
                      + шаг
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recipeForm.steps.map((item, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => setStep(index, { description: e.target.value })}
                          placeholder="Описание шага"
                          className="rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={item.image_url}
                          onChange={(e) => setStep(index, { image_url: e.target.value })}
                          placeholder="URL картинки шага"
                          className="rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 mt-1 flex items-center gap-3">
                  <span className="font-inter text-sm text-umami-gray">Видимость рецепта:</span>
                  <button
                    type="button"
                    onClick={() => setRecipeForm({ ...recipeForm, is_private: false })}
                    className={`rounded-full px-4 py-1.5 font-nunito text-sm ${
                      !recipeForm.is_private
                        ? "bg-umami-green text-white"
                        : "bg-gray-100 text-umami-gray"
                    }`}
                  >
                    Публичный
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipeForm({ ...recipeForm, is_private: true })}
                    className={`rounded-full px-4 py-1.5 font-nunito text-sm ${
                      recipeForm.is_private
                        ? "bg-umami-orange text-white"
                        : "bg-gray-100 text-umami-gray"
                    }`}
                  >
                    Приватный
                  </button>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  type="button"
                  disabled={recipeActionLoading}
                  onClick={handleSaveRecipe}
                  className="flex-1 rounded-full bg-umami-green px-6 py-2 font-nunito font-medium text-white transition-colors hover:bg-[#6a805e] disabled:opacity-60"
                >
                  {recipeActionLoading ? "Сохраняем..." : "Сохранить рецепт"}
                </button>
                <button
                  type="button"
                  disabled={recipeActionLoading}
                  onClick={() => {
                    setIsRecipeEditorOpen(false);
                    setEditingRecipeId(null);
                    setRecipeForm(emptyRecipeForm);
                  }}
                  className="flex-1 rounded-full bg-umami-gray px-6 py-2 font-nunito font-medium text-white transition-colors hover:bg-gray-500 disabled:opacity-60"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-umami-dark-gray/80 p-4">
          <div className="w-full max-w-md rounded-[20px] bg-white p-8 shadow-2xl">
            <h2 className="mb-6 font-nunito text-2xl font-bold text-umami-dark-gray">
              Редактировать профиль
            </h2>
            <div className="flex flex-col gap-4">
              <label className="block">
                <span className="mb-1 block font-inter text-sm text-umami-gray">Имя</span>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-inter text-sm text-umami-gray">
                  Имя пользователя
                </span>
                <input
                  type="text"
                  value={editFormData.username}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, username: e.target.value })
                  }
                  className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-inter text-sm text-umami-gray">Email</span>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
                />
              </label>
            </div>
            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={handleSaveProfile}
                className="flex-1 rounded-full bg-umami-green px-6 py-2 font-nunito font-medium text-white"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 rounded-full bg-umami-gray px-6 py-2 font-nunito font-medium text-white"
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
