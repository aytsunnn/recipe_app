"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUiFeedback } from "../../components/UiFeedbackProvider";
import { authService } from "../../services/authService";
import { Recipe, recipeService } from "../../services/recipeService";
import { WeekMenuEntry, weekMenuService } from "../../services/weekMenuService";
import { normalizeImageUrl } from "../../utils/imageUrl";

const DAYS = [
  { id: 1, label: "Понедельник" },
  { id: 2, label: "Вторник" },
  { id: 3, label: "Среда" },
  { id: 4, label: "Четверг" },
  { id: 5, label: "Пятница" },
  { id: 6, label: "Суббота" },
  { id: 7, label: "Воскресенье" },
] as const;

interface WeekMenuContentProps {
  editable: boolean;
}

export default function WeekMenuContent({ editable }: WeekMenuContentProps) {
  const { toast, confirm } = useUiFeedback();
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [entries, setEntries] = useState<WeekMenuEntry[]>([]);
  const [pickerDayId, setPickerDayId] = useState<number | null>(null);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
  });

  const recipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes.forEach((recipe) => map.set(String(recipe.id), recipe));
    return map;
  }, [recipes]);

  const resolveRenderableRecipe = (entry: WeekMenuEntry): Recipe | null => {
    const fallback = recipesById.get(String(entry.recipe_id)) || null;
    const source = (entry.Recipe || entry.recipe || null) as Recipe | null;
    if (!source && !fallback) return null;
    if (!source) return fallback;
    if (!source.User && fallback) {
      return { ...fallback, ...source, User: fallback.User };
    }
    return source;
  };

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
    Promise.resolve().then(() => {
      void loadAll();
    });
  }, []);

  const handleAddRecipe = async (dayId: number, recipeId: string) => {
    const currentDayEntries = grouped.get(dayId) || [];
    if (currentDayEntries.length >= 5) {
      toast("На день можно добавить максимум 5 рецептов", "error");
      return;
    }
    try {
      setSavingDay(dayId);
      await weekMenuService.addToWeekMenu(dayId, Number(recipeId), currentDayEntries.length + 1);
      await loadAll();
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
    const isConfirmed = await confirm("Удалить рецепт из меню недели?");
    if (!isConfirmed) return;

    try {
      await weekMenuService.removeFromWeekMenu(entryId);
      setEntries((prev) => prev.filter((entry) => String(entry.id) !== String(entryId)));
      toast("Рецепт удален из меню недели", "success");
    } catch (error) {
      console.error("Ошибка удаления из меню недели:", error);
      toast("Не удалось удалить рецепт", "error");
    }
  };

  const toggleDay = (dayId: number) => {
    setOpenDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  if (loading) {
    return (
      <div className="mt-4 rounded-[20px] bg-white p-8 text-center font-nunito text-umami-gray">
        Загрузка...
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-4">
        {DAYS.map((day) => {
          const dayEntries = grouped.get(day.id) || [];
          return (
            <section
              key={day.id}
              className="rounded-[20px] border border-umami-light-gray/50 bg-white p-4"
            >
              <div
                className={`flex items-center justify-between gap-2 ${openDays[day.id] ? "mb-3" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className="flex min-w-0 items-center gap-2 text-left"
                >
                  <Image
                    src="/CaretDown.svg"
                    alt=""
                    width={20}
                    height={20}
                    className={`transition-transform ${openDays[day.id] ? "rotate-180" : ""}`}
                  />
                  <h2 className="font-nunito text-lg font-bold text-umami-dark-gray">{day.label}</h2>
                </button>
                <p className="text-xs text-umami-gray">{dayEntries.length} / 5</p>
              </div>

              {openDays[day.id] && editable ? (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-umami-light-gray/50 bg-[#fcfbf8] p-3">
                  <p className="font-inter text-sm text-umami-gray">Добавить рецепт</p>
                  <button
                    type="button"
                    disabled={savingDay === day.id || dayEntries.length >= 5}
                    onClick={() => {
                      setPickerDayId(day.id);
                      setRecipeSearch("");
                    }}
                    aria-label="Открыть выбор рецепта"
                  >
                    <Image src="/PlusCircleGray.svg" alt="" width={22} height={22} />
                  </button>
                </div>
              ) : null}

              {!openDays[day.id] ? null : dayEntries.length === 0 ? (
                <p className="text-sm text-umami-gray">На этот день меню пока не добавлено</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {dayEntries.map((entry) => {
                    const recipe = resolveRenderableRecipe(entry);
                    if (!recipe) return null;
                    return (
                      <Link
                        key={entry.id}
                        href={`/recipes/${recipe.id}?from=week-menu`}
                        className="relative overflow-hidden rounded-xl border border-umami-light-gray/50 bg-white"
                      >
                        {editable ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void handleDeleteRecipe(entry.id);
                            }}
                            className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 hover:bg-white"
                            aria-label="Удалить рецепт из меню"
                          >
                            <Image src="/Xred.svg" alt="" width={14} height={14} />
                          </button>
                        ) : null}
                        <div className="aspect-square w-full bg-[#f2f2f2]">
                          <Image
                            src={normalizeImageUrl(recipe.image_url, "/image_placeholder.jpg")}
                            alt={recipe.title}
                            width={220}
                            height={220}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="p-2">
                          <p className="line-clamp-2 font-nunito text-xs font-bold text-umami-dark-gray">
                            {recipe.title}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {editable && pickerDayId ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[1180px] rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-nunito text-lg font-bold text-umami-dark-gray">
                Выберите рецепт для: {DAYS.find((d) => d.id === pickerDayId)?.label}
              </h3>
              <button
                type="button"
                onClick={() => setPickerDayId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-umami-light-gray/50 bg-white hover:bg-umami-light-gray/10 transition-colors duration-200"
              >
                <Image width={12} height={12} src="/X.svg" alt="close" />
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
                <p className="py-8 text-center text-sm text-umami-gray">Ничего не найдено</p>
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
                          src={normalizeImageUrl(recipe.image_url, "/image_placeholder.jpg")}
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
    </>
  );
}
