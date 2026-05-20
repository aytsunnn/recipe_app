"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useUiFeedback } from "../../components/UiFeedbackProvider";
import { authService } from "../../services/authService";
import {
  DietPlan,
  DietPlanRecipeInput,
  dietPlanService,
} from "../../services/dietPlanService";
import { Recipe, recipeService } from "../../services/recipeService";
import { normalizeImageUrl } from "../../utils/imageUrl";

const DAY_OPTIONS = [
  { value: 1, label: "Понедельник" },
  { value: 2, label: "Вторник" },
  { value: 3, label: "Среда" },
  { value: 4, label: "Четверг" },
  { value: 5, label: "Пятница" },
  { value: 6, label: "Суббота" },
  { value: 7, label: "Воскресенье" },
];

type Tab = "public" | "mine";

export default function DietPlansPanel() {
  const { toast, confirm } = useUiFeedback();
  const [tab, setTab] = useState<Tab>("public");
  const [loading, setLoading] = useState(true);
  const [publicPlans, setPublicPlans] = useState<DietPlan[]>([]);
  const [myPlans, setMyPlans] = useState<DietPlan[]>([]);
  const [search, setSearch] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [entries, setEntries] = useState<DietPlanRecipeInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [isRecipePickerOpen, setIsRecipePickerOpen] = useState(false);
  const [recipePickerSearch, setRecipePickerSearch] = useState("");

  const isAuth = authService.isAuthenticated();

  const loadData = async () => {
    try {
      setLoading(true);
      const [pub, mine, recipesData] = await Promise.all([
        dietPlanService.getPublic(search),
        isAuth ? dietPlanService.getMine() : Promise.resolve([]),
        recipeService.getAll({ page: 1, limit: 250 }),
      ]);
      setPublicPlans(pub);
      setMyPlans(mine);
      setRecipes(recipesData.filter((recipe) => !recipe.is_private));
    } catch (error) {
      console.error("Ошибка загрузки рационов:", error);
      toast("Не удалось загрузить рационы", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const visiblePlans = useMemo(
    () => (tab === "public" ? publicPlans : myPlans),
    [tab, publicPlans, myPlans]
  );

  const recipeById = useMemo(() => {
    const map = new Map<number, Recipe>();
    recipes.forEach((recipe) => map.set(Number(recipe.id), recipe));
    return map;
  }, [recipes]);

  const filteredPickerRecipes = useMemo(() => {
    const q = recipePickerSearch.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((recipe) =>
      `${recipe.title} ${recipe.User?.name || ""} ${recipe.User?.username || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [recipes, recipePickerSearch]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setIsPrivate(false);
    setEntries([]);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const updateEntry = (index: number, patch: Partial<DietPlanRecipeInput>) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    );
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const addRecipeToPlan = (recipeId: number) => {
    const nextOrder = Math.min(5, entries.length + 1);
    setEntries((prev) => [
      ...prev,
      { recipe_id: recipeId, day_of_week: 1, meal_order: nextOrder },
    ]);
    setIsRecipePickerOpen(false);
    setRecipePickerSearch("");
  };

  const submit = async () => {
    if (!isAuth) {
      toast("Нужна авторизация", "error");
      return;
    }
    if (!title.trim()) {
      toast("Введите название", "error");
      return;
    }
    const validEntries = entries.filter(
      (entry) =>
        entry.recipe_id > 0 &&
        entry.day_of_week >= 1 &&
        entry.day_of_week <= 7 &&
        entry.meal_order >= 1 &&
        entry.meal_order <= 5
    );
    if (validEntries.length === 0) {
      toast("Добавьте хотя бы один рецепт в рацион", "error");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        is_private: isPrivate,
        recipes: validEntries,
      };
      if (editingId) {
        await dietPlanService.update(editingId, payload);
        toast("Рацион обновлен", "success");
      } else {
        await dietPlanService.create(payload);
        toast("Рацион создан", "success");
      }
      resetForm();
      setShowForm(false);
      await loadData();
      setTab("mine");
    } catch (error) {
      console.error("Ошибка сохранения рациона:", error);
      toast("Не удалось сохранить рацион", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = async (id: string) => {
    try {
      const plan = await dietPlanService.getById(id);
      setEditingId(id);
      setTitle(plan.title || "");
      setDescription(plan.description || "");
      setIsPrivate(Boolean(plan.is_private));
      setEntries(plan.recipes || []);
      setShowForm(true);
    } catch (error) {
      console.error("Ошибка загрузки рациона:", error);
      toast("Не удалось открыть рацион", "error");
    }
  };

  const removePlan = async (id: string) => {
    const ok = await confirm("Удалить рацион?");
    if (!ok) return;
    try {
      await dietPlanService.remove(id);
      toast("Рацион удален", "success");
      await loadData();
      if (editingId === id) {
        resetForm();
        setShowForm(false);
      }
    } catch (error) {
      console.error("Ошибка удаления рациона:", error);
      toast("Не удалось удалить рацион", "error");
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-[24px] border border-umami-light-gray/50 bg-gradient-to-r from-[#fff8ed] to-[#fffdf8] p-5 shadow-sm">
        <p className="font-nunito text-2xl font-bold text-umami-dark-gray">Рационы</p>
        <p className="mt-1 font-inter text-sm text-umami-gray">
          Собирайте планы питания из рецептов и сохраняйте их для себя или делитесь публично.
        </p>
      </div>

      <div className="rounded-[24px] border border-umami-light-gray/50 bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск рационов по названию"
          className="h-10 w-full rounded-full border border-umami-light-gray/50 bg-[#fcfcfc] px-4 text-sm outline-none focus:border-umami-orange/60"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("public")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              tab === "public"
                ? "bg-umami-orange text-white"
                : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
            }`}
          >
            Публичные
          </button>
          {isAuth ? (
            <button
              type="button"
              onClick={() => setTab("mine")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                tab === "mine"
                  ? "bg-umami-orange text-white"
                  : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
              }`}
            >
              Мои
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-full bg-[#f3efe2] px-3 py-1.5 text-xs font-bold text-umami-dark-gray hover:bg-[#ece4cf]"
          >
            Обновить
          </button>

          {isAuth && tab === "mine" ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="ml-auto flex items-center gap-1 rounded-full bg-umami-orange px-3 py-1.5 text-xs font-bold text-white"
            >
              <span className="text-sm leading-none">+</span>
              Создать рацион
            </button>
          ) : null}
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-umami-gray">Загрузка...</p>
        ) : visiblePlans.length === 0 ? (
          <p className="mt-3 text-sm text-umami-gray">Рационы не найдены</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {visiblePlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl border border-umami-light-gray/50 bg-[#fcfbf8] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-nunito text-base font-bold text-umami-dark-gray">
                      {plan.title}
                    </p>
                    {plan.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-umami-gray">
                        {plan.description}
                      </p>
                    ) : null}
                  </div>
                  {tab === "mine" ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void startEdit(plan.id)}
                        className="rounded-full bg-[#f3efe2] px-3 py-1 text-xs font-bold text-umami-dark-gray hover:bg-[#ece4cf]"
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => void removePlan(plan.id)}
                        className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                      >
                        Удалить
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-umami-gray">
                  Позиций: {plan.recipes?.length ?? 0}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAuth && showForm ? (
        <div className="rounded-[24px] border border-umami-light-gray/50 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-nunito text-lg font-bold text-umami-dark-gray">
            {editingId ? "Редактирование рациона" : "Создание рациона"}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm text-umami-gray">Название</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например: Полезная неделя"
                className="h-10 w-full rounded-full border border-umami-light-gray/50 bg-[#fcfcfc] px-4 text-sm outline-none focus:border-umami-orange/60"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-umami-dark-gray">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(event) => setIsPrivate(event.target.checked)}
                className="h-4 w-4 accent-umami-orange"
              />
              Приватный рацион
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm text-umami-gray">Описание</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Коротко опишите идею рациона"
                className="min-h-[96px] w-full rounded-2xl border border-umami-light-gray/50 bg-[#fcfcfc] px-4 py-3 text-sm outline-none focus:border-umami-orange/60"
              />
            </label>
          </div>

          <div className="mt-4 rounded-2xl border border-[#efefef] bg-[#faf9f6] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-nunito text-sm font-bold text-umami-dark-gray">Рецепты в рационе</p>
              <button
                type="button"
                onClick={() => setIsRecipePickerOpen(true)}
                className="rounded-full bg-[#f3efe2] px-4 py-1.5 text-xs font-bold text-umami-dark-gray hover:bg-[#ece4cf]"
              >
                Добавить рецепт
              </button>
            </div>

            <div className="space-y-3">
              {entries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-umami-light-gray/70 bg-white p-4 text-center">
                  <p className="text-xs text-umami-gray">Добавьте хотя бы одну позицию в рацион.</p>
                </div>
              ) : null}
              {entries.map((entry, index) => {
                const recipe = recipeById.get(entry.recipe_id);
                return (
                  <div
                    key={`${index}-${entry.recipe_id}`}
                    className="overflow-hidden rounded-2xl border border-umami-light-gray/50 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.04)] md:grid md:grid-cols-[minmax(0,1fr)_330px]"
                  >
                    <div className="overflow-hidden bg-[#fcfbf8]">
                      <div className="h-28 w-full bg-[#f2f2f2]">
                        <Image
                          src={normalizeImageUrl(recipe?.image_url || null, "/placeholder.jpg")}
                          alt="recipe"
                          width={480}
                          height={180}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="px-3 py-2">
                        <p className="truncate font-nunito text-sm font-extrabold text-umami-dark-gray">
                          {recipe?.title || `Рецепт #${entry.recipe_id}`}
                        </p>
                        <p className="mt-0.5 text-xs text-umami-gray">
                          Позиция #{index + 1}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-between gap-3 p-3">
                      <div className="grid grid-cols-1 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-umami-gray">
                            День недели
                          </span>
                          <select
                            value={entry.day_of_week}
                            onChange={(event) =>
                              updateEntry(index, { day_of_week: Number(event.target.value) })
                            }
                            className="h-10 w-full rounded-full border border-umami-light-gray/50 px-3 text-sm"
                          >
                            {DAY_OPTIONS.map((day) => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-umami-gray">
                            Порядок приема пищи
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={entry.meal_order}
                            onChange={(event) =>
                              updateEntry(index, { meal_order: Number(event.target.value) })
                            }
                            className="h-10 w-full rounded-full border border-umami-light-gray/50 px-3 text-sm"
                            placeholder="Порядок"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEntry(index)}
                        className="self-end rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="rounded-full bg-umami-orange px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {editingId ? "Сохранить рацион" : "Создать рацион"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-full bg-[#f3efe2] px-5 py-2 text-xs font-bold text-umami-dark-gray"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}

      {isRecipePickerOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[1100px] rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-nunito text-lg font-bold text-umami-dark-gray">Выберите рецепт</h3>
              <button
                type="button"
                onClick={() => {
                  setIsRecipePickerOpen(false);
                  setRecipePickerSearch("");
                }}
                className="rounded-full border border-umami-light-gray/60 px-3 py-1 text-sm text-umami-dark-gray hover:bg-[#f7f4ea]"
              >
                Закрыть
              </button>
            </div>

            <input
              value={recipePickerSearch}
              onChange={(event) => setRecipePickerSearch(event.target.value)}
              placeholder="Поиск рецепта..."
              className="mb-4 h-10 w-full rounded-xl border border-umami-light-gray/60 px-3 text-sm outline-none"
            />

            <div className="max-h-[70vh] overflow-y-auto pr-1">
              {filteredPickerRecipes.length === 0 ? (
                <p className="py-8 text-center text-sm text-umami-gray">Ничего не найдено</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {filteredPickerRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => addRecipeToPlan(Number(recipe.id))}
                      className="overflow-hidden rounded-xl border border-umami-light-gray/50 bg-white text-left transition hover:border-umami-orange/50 hover:shadow-sm"
                    >
                      <div className="aspect-square w-full bg-[#f2f2f2]">
                        <Image
                          src={normalizeImageUrl(recipe.image_url, "/placeholder.jpg")}
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
