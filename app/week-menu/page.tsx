"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import LeftPart from "../components/MainScreen/NavigationLeftPart";
import RightPart from "../components/MainScreen/NewsRightPart";
import { authService } from "../services/authService";
import { recipeService, Recipe } from "../services/recipeService";
import { WeekMenuEntry, weekMenuService } from "../services/weekMenuService";
import { isAdminRole } from "../utils/role";
import { useUiFeedback } from "../components/UiFeedbackProvider";
import FeedCard from "../components/feed-card/FeedCard";

const DAYS = [
  { id: 1, label: "Понедельник" },
  { id: 2, label: "Вторник" },
  { id: 3, label: "Среда" },
  { id: 4, label: "Четверг" },
  { id: 5, label: "Пятница" },
  { id: 6, label: "Суббота" },
  { id: 7, label: "Воскресенье" },
] as const;

const MEALS = ["Завтрак", "Обед", "Перекус", "Полдник", "Ужин"] as const;

type SelectedByDay = Record<number, string>;

export default function WeekMenuPage() {
  const { toast } = useUiFeedback();
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [entries, setEntries] = useState<WeekMenuEntry[]>([]);
  const [selectedRecipeByDay, setSelectedRecipeByDay] = useState<SelectedByDay>({});
  const [pickerDayId, setPickerDayId] = useState<number | null>(null);
  const [recipeSearch, setRecipeSearch] = useState("");

  const recipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes.forEach((recipe) => map.set(String(recipe.id), recipe));
    return map;
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const query = recipeSearch.trim().toLowerCase();
    if (!query) return recipes;
    return recipes.filter((recipe) =>
      `${recipe.title} ${recipe.User?.name || ""} ${recipe.User?.username || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [recipes, recipeSearch]);

  const grouped = useMemo(() => {
    const groupedMap = new Map<number, WeekMenuEntry[]>();
    DAYS.forEach((day) => groupedMap.set(day.id, []));
    entries.forEach((entry) => {
      const current = groupedMap.get(entry.day_of_week);
      if (current) current.push(entry);
    });
    groupedMap.forEach((value) => {
      value.sort((a, b) => {
        const orderA = a.meal_order ?? 999;
        const orderB = b.meal_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return String(a.id).localeCompare(String(b.id), "ru");
      });
    });
    return groupedMap;
  }, [entries]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const me = await authService.getCurrentUser();
      setCurrentUserId(me?.id);
      const role = me?.role || authService.getRoleFromToken();
      setIsAdmin(isAdminRole(role));

      const [menuResult, recipesResult] = await Promise.all([
        weekMenuService.getWeekMenu(),
        recipeService.getAll({ page: 1, limit: 200 }),
      ]);

      setEntries(menuResult);
      setRecipes(recipesResult.filter((recipe) => !recipe.is_private));
    } catch (error) {
      console.error("Ошибка загрузки меню недели:", error);
      toast("Не удалось загрузить меню недели", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleSelectRecipe = (dayId: number, recipeId: string) => {
    setSelectedRecipeByDay((prev) => ({ ...prev, [dayId]: recipeId }));
  };

  const handleAddRecipe = async (dayId: number, forcedRecipeId?: string) => {
    const selected = forcedRecipeId || selectedRecipeByDay[dayId];
    if (!selected) {
      toast("Выберите рецепт", "error");
      return;
    }
    const currentDayEntries = grouped.get(dayId) || [];
    if (currentDayEntries.length >= 5) {
      toast("На день можно добавить максимум 5 рецептов", "error");
      return;
    }

    try {
      setSavingDay(dayId);
      await weekMenuService.addToWeekMenu(dayId, Number(selected), currentDayEntries.length + 1);
      await loadAll();
      setSelectedRecipeByDay((prev) => ({ ...prev, [dayId]: "" }));
      setPickerDayId(null);
      toast("Рецепт добавлен в меню недели", "success");
    } catch (error) {
      console.error("Ошибка добавления в меню недели:", error);
      toast("Не удалось добавить рецепт", "error");
    } finally {
      setSavingDay(null);
    }
  };

  const handleDeleteRecipe = async (entryId: string) => {
    try {
      await weekMenuService.removeFromWeekMenu(entryId);
      setEntries((prev) => prev.filter((entry) => String(entry.id) !== String(entryId)));
      toast("Рецепт удален из меню недели", "success");
    } catch (error) {
      console.error("Ошибка удаления из меню недели:", error);
      toast("Не удалось удалить рецепт", "error");
    }
  };

  return (
    <div className="flex w-full gap-5">
      <div className="hidden w-55.75 lg:flex">
        <LeftPart />
      </div>

      <div className="w-full pb-10 lg:w-169.5">
        <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
          <h1 className="font-nunito text-2xl font-bold text-umami-dark-gray">Меню недели</h1>
          <p className="mt-1 font-inter text-sm text-umami-gray">
            Администратор формирует меню на каждый день: от 1 до 5 рецептов.
          </p>
        </div>

        {loading ? (
          <div className="mt-4 rounded-[20px] bg-white p-8 text-center font-nunito text-umami-gray">
            Загрузка...
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {DAYS.map((day) => {
              const dayEntries = grouped.get(day.id) || [];

              return (
                <section
                  key={day.id}
                  className="rounded-[20px] border border-umami-light-gray/50 bg-white p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="font-nunito text-lg font-bold text-umami-dark-gray">{day.label}</h2>
                    <p className="text-xs text-umami-gray">
                      {dayEntries.length} / 5
                    </p>
                  </div>

                  {isAdmin ? (
                    <div className="mb-4 flex items-center justify-between rounded-xl border border-umami-light-gray/50 bg-[#fcfbf8] p-3">
                      <p className="font-inter text-sm text-umami-gray">Добавить рецепт</p>
                      <button
                        type="button"
                        disabled={savingDay === day.id || dayEntries.length >= 5}
                        onClick={() => {
                          setPickerDayId(day.id);
                          setRecipeSearch("");
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-umami-orange/40 bg-white hover:bg-[#fff7ef] disabled:opacity-60"
                        aria-label="Открыть выбор рецепта"
                      >
                        <Image src="/pluscircle.svg" alt="" width={22} height={22} />
                      </button>
                    </div>
                  ) : null}

                  {dayEntries.length === 0 ? (
                    <p className="text-sm text-umami-gray">На этот день меню пока не добавлено</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {dayEntries.map((entry, index) => {
                        const recipe =
                          entry.Recipe || entry.recipe || recipesById.get(String(entry.recipe_id));
                        if (!recipe) return null;
                        return (
                          <div key={entry.id} className="relative">
                            <p className="mb-1 font-nunito text-sm font-bold text-umami-gray">
                              {MEALS[index] || `Прием пищи ${index + 1}`}
                            </p>
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={() => void handleDeleteRecipe(entry.id)}
                                className="absolute right-0 top-0 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-600"
                              >
                                Удалить
                              </button>
                            ) : null}
                            <FeedCard
                              recipe={recipe}
                              currentUserId={currentUserId}
                              isFollowing={false}
                              showAuthorHeader
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden w-63.75 lg:flex">
        <RightPart />
      </div>

      {pickerDayId ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[1180px] rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-nunito text-lg font-bold text-umami-dark-gray">
                Выберите рецепт для: {DAYS.find((d) => d.id === pickerDayId)?.label}
              </h3>
              <button
                type="button"
                onClick={() => setPickerDayId(null)}
                className="rounded-full border border-umami-light-gray/60 px-3 py-1 text-sm text-umami-dark-gray hover:bg-[#f7f4ea]"
              >
                Закрыть
              </button>
            </div>

            <input
              value={recipeSearch}
              onChange={(event) => setRecipeSearch(event.target.value)}
              placeholder="Поиск рецепта..."
              className="mb-4 h-10 w-full rounded-xl border border-umami-light-gray/60 px-3 text-sm outline-none"
            />

            <div className="max-h-[70vh] overflow-y-auto pr-1">
              {filteredRecipes.length === 0 ? (
                <p className="py-8 text-center text-sm text-umami-gray">
                  Ничего не найдено
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {filteredRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => void handleAddRecipe(pickerDayId, recipe.id)}
                      className="overflow-hidden rounded-xl border border-umami-light-gray/50 bg-white text-left transition hover:border-umami-orange/50 hover:shadow-sm"
                    >
                      <div className="aspect-square w-full bg-[#f2f2f2]">
                        <Image
                          src={recipe.image_url || "/image_placeholder.jpg"}
                          alt={recipe.title}
                          width={180}
                          height={180}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="p-2">
                        <p className="line-clamp-2 font-nunito text-xs font-bold text-umami-dark-gray">
                          {recipe.title}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
