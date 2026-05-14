"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import FeedCard from "../components/FeedCard";
import ScrollToTopButton from "../components/ScrollToTopButton";
import { authService, User } from "../services/authService";
import { followService, FollowUser } from "../services/followService";
import { Recipe, recipeService } from "../services/recipeService";
import { uploadService } from "../services/uploadService";
import { userService } from "../services/userService";
import {
  metaService,
  Category,
  Celebration,
  Cooking,
  Ingredient,
  Kitchen,
  Unit,
} from "../services/metaService";
import { normalizeImageUrl } from "../utils/imageUrl";
import { toolsService } from "../services/toolsService";

interface UserStats {
  followingCount: number;
  followersCount: number;
  recipesCount: number;
}

interface IngredientRow {
  ingredient_id: number | null;
  ingredient_name: string;
  quantity: number;
  unit_of_measurement: string;
  note: string;
}

interface StepRow {
  description: string;
  image_url: string;
  image_file: File | null;
  image_preview: string;
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
  image_url: string;
  image_file: File | null;
  image_preview: string;
  is_private: boolean;
  kitchen_id: number | null;
  celebration_id: number | null;
  cooking_id: number | null;
  categories: number[];
  ingredients: IngredientRow[];
  steps: StepRow[];
  source_url: string;
  parsed_from_url: boolean;
}

interface MicrochefPrefill {
  title?: string;
  description?: string;
  difficulty?: string;
  portion?: number;
  cooking_time?: number;
  calorific?: number;
  proteins?: number;
  fats?: number;
  carbohydrates?: number;
  kitchen?: string;
  celebration?: string;
  cookingType?: string;
  ingredients?: Array<{ name?: string; quantity?: string; unit?: string }>;
  steps?: Array<{ description?: string }>;
  is_private?: boolean;
}

const DIFFICULTY_TO_API: Record<string, "1" | "2" | "3" | "4" | "5"> = {
  Легко: "1",
  Средне: "3",
  Сложно: "5",
  easy: "1",
  medium: "3",
  hard: "5",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
};

const normalizeDifficulty = (
  value: string | null | undefined
): "1" | "2" | "3" | "4" | "5" => {
  if (!value) return "1";
  return DIFFICULTY_TO_API[value] || "1";
};

const navItems = [
  { href: "/", label: "Главная", icon: "/House.svg" },
  {
    href: "/profile",
    label: "Личный кабинет",
    icon: "/User.svg",
    active: true,
  },
  { href: "/favorites", label: "Избранное", icon: "/Favorites.svg" },
  {
    href: "/profile#week-menu",
    label: "Меню недели",
    icon: "/ClipboardText.svg",
  },
  { href: "/recipes/random", label: "Случайный рецепт", icon: "/DiceFive.svg" },
];

const emptyRecipeForm: RecipeFormData = {
  title: "",
  description: "",
  difficulty: "1",
  portion: 1,
  cooking_time: 30,
  calorific: 0,
  proteins: 0,
  fats: 0,
  carbohydrates: 0,
  image_url: "",
  image_file: null,
  image_preview: "",
  is_private: false,
  kitchen_id: null,
  celebration_id: null,
  cooking_id: null,
  categories: [],
  ingredients: [
    {
      ingredient_id: null,
      ingredient_name: "",
      quantity: 1,
      unit_of_measurement: "",
      note: "",
    },
  ],
  steps: [
    { description: "", image_url: "", image_file: null, image_preview: "" },
  ],
  source_url: "",
  parsed_from_url: false,
};

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    newPassword: "",
    confirmNewPassword: "",
    verifyCode: "",
  });
  const [isEditProfileLoading, setIsEditProfileLoading] = useState(false);
  const [isEditVerificationStep, setIsEditVerificationStep] = useState(false);
  const [editProfileMessage, setEditProfileMessage] = useState<string | null>(
    null
  );

  const [isRecipeEditorOpen, setIsRecipeEditorOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeForm, setRecipeForm] = useState<RecipeFormData>(emptyRecipeForm);
  const [recipeActionLoading, setRecipeActionLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [isAvatarActionsOpen, setIsAvatarActionsOpen] = useState(false);
  const [recipeFilter, setRecipeFilter] = useState<
    "all" | "public" | "private"
  >("all");
  const [followModalType, setFollowModalType] = useState<
    "following" | "followers" | null
  >(null);
  const [followModalUsers, setFollowModalUsers] = useState<FollowUser[]>([]);
  const [followModalLoading, setFollowModalLoading] = useState(false);

  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [cookings, setCookings] = useState<Cooking[]>([]);
  const [ingredientsCatalog, setIngredientsCatalog] = useState<Ingredient[]>(
    []
  );
  const [units, setUnits] = useState<Unit[]>([]);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const filteredRecipes = useMemo(() => {
    if (recipeFilter === "public") return recipes.filter((r) => !r.is_private);
    if (recipeFilter === "private") return recipes.filter((r) => r.is_private);
    return recipes;
  }, [recipes, recipeFilter]);

  const visibleFriends = useMemo(() => friends.slice(0, 6), [friends]);
  const feedColumnRef = useRef<HTMLDivElement | null>(null);

  const getSafeImageUrl = (url: string | null) => {
    return normalizeImageUrl(url, "/avatar.jpg");
  };

  const loadMeta = async () => {
    try {
      const data = await metaService.getAll();
      setKitchens(data.kitchens);
      setCategories(data.categories);
      setCelebrations(data.celebrations);
      setCookings(data.cookings);
      setIngredientsCatalog(data.ingredients);
      setUnits(data.units || []);
    } catch (error) {
      console.error("Ошибка загрузки метаданных рецепта:", error);
    }
  };

  const loadProfile = async (currentUser: User) => {
    const [following, followers, ownRecipesFromFeed, ownPrivateRecipes] =
      await Promise.all([
        followService.getFollowing(currentUser.id),
        followService.getFollowers(currentUser.id),
        recipeService.getAll({
          user_id: currentUser.id,
          limit: 500,
        }),
        recipeService.getAll({
          user_id: currentUser.id,
          is_private: true,
          limit: 500,
        }),
      ]);

    const followingIds = new Set(following.map((follow) => follow.id));
    const mutualFriends = followers.filter((follower) =>
      followingIds.has(follower.id)
    );

    setFriends(mutualFriends);
    const allById = new Map<string, Recipe>();
    [...ownRecipesFromFeed, ...ownPrivateRecipes].forEach((recipe) => {
      if (String(recipe.user_id) === String(currentUser.id)) {
        allById.set(recipe.id, recipe);
      }
    });
    const ownRecipes = Array.from(allById.values()).sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );
    setRecipes(ownRecipes);
    setStats({
      followingCount: following.length,
      followersCount: followers.length,
      recipesCount: ownRecipes.length,
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
      newPassword: "",
      confirmNewPassword: "",
      verifyCode: "",
    });
    setIsEditVerificationStep(false);
    setEditProfileMessage(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const normalizedEmail = editFormData.email.trim().toLowerCase();
    const isEmailChanged =
      normalizedEmail !== (user.email || "").trim().toLowerCase();
    const hasPasswordChange = editFormData.newPassword.trim().length > 0;
    const needsVerification = isEmailChanged || hasPasswordChange;

    if (
      !editFormData.name.trim() ||
      !editFormData.username.trim() ||
      !normalizedEmail
    ) {
      alert("Заполните имя, имя пользователя и email");
      return;
    }

    if (
      hasPasswordChange &&
      editFormData.newPassword !== editFormData.confirmNewPassword
    ) {
      alert("Новый пароль и подтверждение не совпадают");
      return;
    }

    if (hasPasswordChange && editFormData.newPassword.length < 8) {
      alert("Новый пароль должен содержать минимум 8 символов");
      return;
    }

    if (needsVerification && !isEditVerificationStep) {
      try {
        setIsEditProfileLoading(true);
        await authService.requestEmailCode(normalizedEmail);
        setIsEditVerificationStep(true);
        setEditProfileMessage("Код подтверждения отправлен на email");
      } catch (error) {
        console.error("Ошибка отправки кода подтверждения:", error);
        setEditProfileMessage("Не удалось отправить код подтверждения");
      } finally {
        setIsEditProfileLoading(false);
      }
      return;
    }

    if (needsVerification && !editFormData.verifyCode.trim()) {
      alert("Введите код подтверждения");
      return;
    }

    try {
      setIsEditProfileLoading(true);

      if (needsVerification) {
        await authService.verifyEmail({
          email: normalizedEmail,
          code: editFormData.verifyCode.trim(),
        });
      }

      const updatedUser = await userService.updateProfile({
        name: editFormData.name.trim(),
        username: editFormData.username.trim(),
        email: normalizedEmail,
      });

      if (hasPasswordChange) {
        await authService.resetPassword({
          email: normalizedEmail,
          code: editFormData.verifyCode.trim(),
          new_password: editFormData.newPassword,
        });
      }

      setUser({
        ...updatedUser,
        email: updatedUser.email || user?.email || "",
      });
      setIsEditModalOpen(false);
      setIsEditVerificationStep(false);
      setEditProfileMessage(null);
      authService.dispatchAuthChange();
    } catch (error) {
      console.error("Ошибка при обновлении профиля:", error);
      alert(
        error instanceof Error
          ? `Не удалось обновить профиль: ${error.message}`
          : "Не удалось обновить профиль"
      );
    } finally {
      setIsEditProfileLoading(false);
    }
  };

  const handleResendEditVerificationCode = async () => {
    const normalizedEmail = editFormData.email.trim().toLowerCase();
    if (!normalizedEmail) {
      alert("Введите email");
      return;
    }

    try {
      setIsEditProfileLoading(true);
      await authService.requestEmailCode(normalizedEmail);
      setEditProfileMessage("Код отправлен повторно");
    } catch (error) {
      console.error("Ошибка повторной отправки кода:", error);
      setEditProfileMessage("Не удалось отправить код повторно");
    } finally {
      setIsEditProfileLoading(false);
    }
  };

  const openCreateRecipeEditor = () => {
    setEditingRecipeId(null);
    setRecipeForm(emptyRecipeForm);
    setParseWarnings([]);
    setIsRecipeEditorOpen(true);
  };

  useEffect(() => {
    if (isLoading) return;
    const shouldOpenCreate = searchParams?.get("create") === "1";
    if (!shouldOpenCreate || typeof window === "undefined") return;

    const raw = window.sessionStorage.getItem("microchef_recipe_prefill");
    if (!raw) {
      openCreateRecipeEditor();
      return;
    }

    try {
      const prefill = JSON.parse(raw) as MicrochefPrefill;
      const toNum = (value: unknown, fallback: number) => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string") {
          const parsed = Number(value.replace(",", "."));
          if (Number.isFinite(parsed)) return parsed;
        }
        return fallback;
      };

      const matchByName = (
        options: Array<{ id: string; name: string }>,
        name?: string
      ) => {
        if (!name) return null;
        const normalized = name.trim().toLowerCase();
        const found = options.find(
          (item) => item.name.trim().toLowerCase() === normalized
        );
        return found ? Number(found.id) : null;
      };

      const ingredients = Array.isArray(prefill.ingredients)
        ? prefill.ingredients.map((item) => {
            const ingredientName = (item?.name || "").trim();
            const quantityRaw = (item?.quantity || "").trim();
            const parsedQuantity = Number(quantityRaw.replace(",", "."));
            const unit = (item?.unit || "").trim();

            const matchedIngredient = ingredientsCatalog.find(
              (entry) =>
                entry.name.trim().toLowerCase() ===
                ingredientName.trim().toLowerCase()
            );

            return {
              ingredient_id: matchedIngredient ? Number(matchedIngredient.id) : null,
              ingredient_name: ingredientName,
              quantity:
                Number.isFinite(parsedQuantity) && parsedQuantity > 0
                  ? parsedQuantity
                  : 1,
              unit_of_measurement: unit,
              note:
                !Number.isFinite(parsedQuantity) && quantityRaw
                  ? `Количество: ${quantityRaw}`
                  : "",
            };
          })
        : [];

      const steps = Array.isArray(prefill.steps)
        ? prefill.steps
            .map((step) => (step?.description || "").trim())
            .filter(Boolean)
            .map((description) => ({
              description,
              image_url: "",
              image_file: null,
              image_preview: "",
            }))
        : [];

      setEditingRecipeId(null);
      setParseWarnings([]);
      setRecipeForm({
        ...emptyRecipeForm,
        title: (prefill.title || "").trim(),
        description: (prefill.description || "").trim(),
        difficulty: normalizeDifficulty(prefill.difficulty),
        portion: Math.max(1, Math.round(toNum(prefill.portion, 1))),
        cooking_time: Math.max(1, Math.round(toNum(prefill.cooking_time, 30))),
        calorific: Math.max(0, Math.round(toNum(prefill.calorific, 0))),
        proteins: Math.max(0, Math.round(toNum(prefill.proteins, 0))),
        fats: Math.max(0, Math.round(toNum(prefill.fats, 0))),
        carbohydrates: Math.max(0, Math.round(toNum(prefill.carbohydrates, 0))),
        is_private: true,
        kitchen_id: matchByName(kitchens, prefill.kitchen),
        celebration_id: matchByName(celebrations, prefill.celebration),
        cooking_id: matchByName(cookings, prefill.cookingType),
        ingredients:
          ingredients.length > 0
            ? ingredients
            : [
                {
                  ingredient_id: null,
                  ingredient_name: "",
                  quantity: 1,
                  unit_of_measurement: "",
                  note: "",
                },
              ],
        steps:
          steps.length > 0
            ? steps
            : [{ description: "", image_url: "", image_file: null, image_preview: "" }],
      });
      setIsRecipeEditorOpen(true);
    } catch (error) {
      console.error("Ошибка автозаполнения рецепта из микро-шефа:", error);
      openCreateRecipeEditor();
    } finally {
      window.sessionStorage.removeItem("microchef_recipe_prefill");
      router.replace("/profile");
    }
  }, [
    isLoading,
    searchParams,
    kitchens,
    celebrations,
    cookings,
    ingredientsCatalog,
    router,
  ]);

  const openEditRecipeEditor = async (recipe: Recipe) => {
    let fullRecipe = recipe;
    try {
      fullRecipe = await recipeService.getById(recipe.id);
    } catch (error) {
      console.error(
        "Не удалось загрузить полные данные рецепта для редактирования:",
        error
      );
    }

    const sortedSteps = (fullRecipe.Steps || [])
      .slice()
      .sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0));
    const recipeAny = fullRecipe as unknown as Record<string, unknown>;
    const toBool = (value: unknown): boolean => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value === 1;
      if (typeof value === "string") {
        const lowered = value.trim().toLowerCase();
        return lowered === "true" || lowered === "1" || lowered === "yes";
      }
      return false;
    };
    const sourceUrlFromApi = (
      typeof fullRecipe.source_url === "string"
        ? fullRecipe.source_url
        : typeof recipeAny.sourceUrl === "string"
        ? (recipeAny.sourceUrl as string)
        : typeof recipeAny.sourceURL === "string"
        ? (recipeAny.sourceURL as string)
        : ""
    ).trim();
    const isParsedRecipe =
      toBool(fullRecipe.parsed_from_url) ||
      toBool(recipeAny.parsedFromUrl) ||
      toBool(recipeAny.is_parsed) ||
      toBool(recipeAny.isParsed) ||
      toBool(recipeAny.parsed) ||
      sourceUrlFromApi.length > 0;

    setEditingRecipeId(recipe.id);
    setRecipeForm({
      title: fullRecipe.title || "",
      description: fullRecipe.description || "",
      difficulty: normalizeDifficulty(fullRecipe.difficulty),
      portion: fullRecipe.portion || 1,
      cooking_time: fullRecipe.cooking_time || 30,
      calorific: fullRecipe.calorific || 0,
      proteins: fullRecipe.proteins || 0,
      fats: fullRecipe.fats || 0,
      carbohydrates: fullRecipe.carbohydrates || 0,
      image_url: fullRecipe.image_url || "",
      image_file: null,
      image_preview: fullRecipe.image_url || "",
      is_private: isParsedRecipe ? true : Boolean(fullRecipe.is_private),
      kitchen_id: fullRecipe.kitchen_id ? Number(fullRecipe.kitchen_id) : null,
      celebration_id: fullRecipe.celebration_id
        ? Number(fullRecipe.celebration_id)
        : null,
      cooking_id: fullRecipe.cooking_id ? Number(fullRecipe.cooking_id) : null,
      categories: (fullRecipe.Categories || [])
        .map((category) => {
          if (typeof category === "number") return category;
          if (typeof category === "string") return Number(category);
          if (category && typeof category === "object") {
            const row = category as { id?: unknown };
            return Number(row.id);
          }
          return NaN;
        })
        .filter((value) => Number.isFinite(value)),
      ingredients:
        (fullRecipe.Ingredients || []).length > 0
          ? (fullRecipe.Ingredients || []).map((ingredient) => ({
              ingredient_id: Number(ingredient.id),
              ingredient_name: ingredient.name || "",
              quantity: Number(ingredient.RecipeIngredient?.quantity) || 1,
              unit_of_measurement:
                ingredient.Unit?.short_name ||
                ingredient.Unit?.name ||
                ingredient.unit_of_measurement ||
                "",
              note: ingredient.RecipeIngredient?.note || "",
            }))
          : [
              {
                ingredient_id: null,
                ingredient_name: "",
                quantity: 1,
                unit_of_measurement: "",
                note: "",
              },
            ],
      steps:
        sortedSteps.length > 0
          ? sortedSteps.map((step) => ({
              description: step.description || "",
              image_url: step.image_url || "",
              image_file: null,
              image_preview: step.image_url || "",
            }))
          : [
              {
                description: "",
                image_url: "",
                image_file: null,
                image_preview: "",
              },
            ],
      source_url: sourceUrlFromApi,
      parsed_from_url: isParsedRecipe,
    });
    setParseWarnings([]);
    setIsRecipeEditorOpen(true);
  };

  const openFollowModal = async (type: "following" | "followers") => {
    if (!user) return;
    setFollowModalType(type);
    setFollowModalLoading(true);
    try {
      const data =
        type === "following"
          ? await followService.getFollowing(user.id)
          : await followService.getFollowers(user.id);
      setFollowModalUsers(data);
    } catch (error) {
      console.error("Ошибка загрузки списка подписок:", error);
      setFollowModalUsers([]);
    } finally {
      setFollowModalLoading(false);
    }
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
      steps: prev.steps.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      ),
    }));
  };

  const handleRecipeImageFileChange = (file: File | null) => {
    if (!file) {
      setRecipeForm((prev) => ({
        ...prev,
        image_file: null,
        image_preview: "",
        image_url: "",
      }));
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setRecipeForm((prev) => ({
      ...prev,
      image_file: file,
      image_preview: previewUrl,
    }));
  };

  const handleStepImageFileChange = (index: number, file: File | null) => {
    if (!file) {
      setStep(index, { image_file: null, image_preview: "", image_url: "" });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setStep(index, { image_file: file, image_preview: previewUrl });
  };

  const handleIngredientSelect = (index: number, ingredientIdValue: string) => {
    const ingredientId = ingredientIdValue ? Number(ingredientIdValue) : null;
    const selected = ingredientId
      ? ingredientsCatalog.find(
          (ingredient) => Number(ingredient.id) === ingredientId
        )
      : null;

    setIngredient(index, {
      ingredient_id: ingredientId,
      ingredient_name: selected?.name || "",
      unit_of_measurement: selected?.unit_of_measurement || "",
    });
  };

  const handleParseRecipeByUrl = async () => {
    const sourceUrl = recipeForm.source_url.trim();
    if (!sourceUrl) {
      alert("Добавьте ссылку на рецепт");
      return;
    }

    const toStringValue = (value: unknown): string => {
      if (typeof value === "string") return value.trim();
      if (typeof value === "number") return String(value);
      return "";
    };

    const toNumberValue = (value: unknown): number | null => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
        const num = Number(normalized);
        return Number.isFinite(num) ? num : null;
      }
      return null;
    };

    const findRecipeLikeObject = (root: unknown): Record<string, unknown> => {
      if (!root) return {};
      if (typeof root === "string") {
        try {
          const parsed = JSON.parse(root);
          return findRecipeLikeObject(parsed);
        } catch {
          return {};
        }
      }
      if (typeof root !== "object") return {};

      const queue: Record<string, unknown>[] = [
        root as Record<string, unknown>,
      ];
      while (queue.length > 0) {
        const current = queue.shift()!;
        const hasRecipeShape =
          typeof current.title === "string" ||
          typeof current.description === "string" ||
          Array.isArray(current.ingredients) ||
          Array.isArray(current.steps);
        if (hasRecipeShape) return current;

        for (const value of Object.values(current)) {
          if (value && typeof value === "object") {
            if (Array.isArray(value)) {
              value.forEach((entry) => {
                if (entry && typeof entry === "object") {
                  queue.push(entry as Record<string, unknown>);
                }
              });
            } else {
              queue.push(value as Record<string, unknown>);
            }
          }
        }
      }

      return root as Record<string, unknown>;
    };

    try {
      setParseLoading(true);
      setParseWarnings([]);

      const payload = await toolsService.parseRecipeByUrl(sourceUrl);
      const raw = findRecipeLikeObject(payload);

      const parsedIngredients = Array.isArray(raw.ingredients)
        ? raw.ingredients
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const row = item as Record<string, unknown>;
              const name = toStringValue(row.name);
              const quantityRaw =
                toNumberValue(row.quantity) ??
                toNumberValue(row.amount) ??
                toNumberValue(row.value);
              const quantity =
                Number.isFinite(quantityRaw) && quantityRaw > 0
                  ? quantityRaw
                  : 1;
              const unit =
                toStringValue(row.unit) ||
                toStringValue(row.unit_of_measurement) ||
                toStringValue(row.measure);
              if (!name) return null;
              return {
                ingredient_id: null,
                ingredient_name: name,
                quantity,
                unit_of_measurement: unit,
                note: "",
              } satisfies IngredientRow;
            })
            .filter((item): item is IngredientRow => Boolean(item))
        : [];

      const parsedSteps = Array.isArray(raw.steps)
        ? raw.steps
            .map((item) => {
              if (typeof item === "string") {
                const description = item.trim();
                if (!description) return null;
                return {
                  description,
                  image_url: "",
                  image_file: null,
                  image_preview: "",
                } satisfies StepRow;
              }
              if (!item || typeof item !== "object") return null;
              const row = item as Record<string, unknown>;
              const description =
                toStringValue(row.description) ||
                toStringValue(row.text) ||
                toStringValue(row.step);
              const imageUrl =
                toStringValue(row.image_url) ||
                toStringValue(row.image) ||
                toStringValue(row.photo);
              if (!description) return null;
              return {
                description,
                image_url: imageUrl,
                image_file: null,
                image_preview: imageUrl,
              } satisfies StepRow;
            })
            .filter((item): item is StepRow => Boolean(item))
        : [];

      const title = toStringValue(raw.title);
      const description = toStringValue(raw.description);
      const parsedSiteLabel = (() => {
        try {
          const host = new URL(sourceUrl).hostname
            .replace(/^www\./i, "")
            .trim();
          return host || "сайта";
        } catch {
          return "сайта";
        }
      })();
      const descriptionFromSite = `Рецепт с сайта ${parsedSiteLabel}`;
      const difficultyRaw =
        toStringValue(raw.difficulty) ||
        toStringValue(raw.level) ||
        toStringValue(raw.complexity);
      const difficulty = normalizeDifficulty(difficultyRaw || "1");
      const nextWarnings: string[] = [];

      if (!title) nextWarnings.push("Название не найдено");
      if (!description)
        nextWarnings.push(
          "Описание из статьи не найдено, подставлено имя сайта"
        );
      if (parsedIngredients.length === 0)
        nextWarnings.push("Ингредиенты не найдены");
      if (parsedSteps.length === 0) nextWarnings.push("Шаги не найдены");
      const parsedImageUrl =
        toStringValue(raw.image_url) ||
        toStringValue(raw.image) ||
        toStringValue(raw.photo);

      if (!parsedImageUrl) nextWarnings.push("Фото рецепта не найдено");

      setParseWarnings(nextWarnings);

      setRecipeForm((prev) => ({
        ...prev,
        title: title || prev.title,
        description: descriptionFromSite,
        difficulty,
        image_url: parsedImageUrl || prev.image_url,
        image_preview: parsedImageUrl || prev.image_preview,
        portion:
          (toNumberValue(raw.portion) ?? toNumberValue(raw.servings) ?? 0) > 0
            ? Number(toNumberValue(raw.portion) ?? toNumberValue(raw.servings))
            : prev.portion,
        cooking_time:
          (toNumberValue(raw.cooking_time) ?? toNumberValue(raw.time) ?? 0) > 0
            ? Number(toNumberValue(raw.cooking_time) ?? toNumberValue(raw.time))
            : prev.cooking_time,
        calorific:
          (toNumberValue(raw.calorific) ?? toNumberValue(raw.calories)) !==
            null &&
          Number(toNumberValue(raw.calorific) ?? toNumberValue(raw.calories)) >=
            0
            ? Number(
                toNumberValue(raw.calorific) ?? toNumberValue(raw.calories)
              )
            : prev.calorific,
        proteins:
          Number.isFinite(Number(raw.proteins)) && Number(raw.proteins) >= 0
            ? Number(raw.proteins)
            : prev.proteins,
        fats:
          Number.isFinite(Number(raw.fats)) && Number(raw.fats) >= 0
            ? Number(raw.fats)
            : prev.fats,
        carbohydrates:
          Number.isFinite(Number(raw.carbohydrates)) &&
          Number(raw.carbohydrates) >= 0
            ? Number(raw.carbohydrates)
            : prev.carbohydrates,
        ingredients:
          parsedIngredients.length > 0 ? parsedIngredients : prev.ingredients,
        steps: parsedSteps.length > 0 ? parsedSteps : prev.steps,
        parsed_from_url: true,
        is_private: true,
      }));
    } catch (error) {
      console.error("Ошибка парсинга рецепта:", error);
      alert("Не удалось распарсить рецепт по ссылке");
    } finally {
      setParseLoading(false);
    }
  };

  const handleResetParsedRecipe = () => {
    setParseWarnings([]);
    setRecipeForm({
      ...emptyRecipeForm,
      is_private: false,
      parsed_from_url: false,
    });
  };

  const handleSaveRecipe = async () => {
    if (!user) return;
    if (!recipeForm.title.trim() || !recipeForm.description.trim()) {
      alert("Заполните название и описание рецепта");
      return;
    }

    try {
      setRecipeActionLoading(true);
      let recipeImageUrl = recipeForm.image_url?.trim() || "";
      if (recipeForm.image_file) {
        recipeImageUrl = await uploadService.uploadImage(
          recipeForm.image_file,
          "recipes"
        );
      }

      const stepsWithUploads = await Promise.all(
        recipeForm.steps.map(async (step) => {
          const description = step.description.trim();
          if (!description) return null;
          let stepImageUrl = step.image_url?.trim() || "";
          if (step.image_file) {
            stepImageUrl = await uploadService.uploadImage(
              step.image_file,
              "steps"
            );
          }
          return {
            description,
            ...(stepImageUrl ? { image_url: stepImageUrl } : {}),
          };
        })
      );
      const normalizedSteps = stepsWithUploads.filter(
        (item): item is { description: string; image_url?: string } =>
          Boolean(item)
      );

      const normalizedIngredients = recipeForm.ingredients
        .filter(
          (item) => Number(item.ingredient_id) > 0 && Number(item.quantity) > 0
        )
        .map((item) => ({
          id: Number(item.ingredient_id),
          quantity: Number(item.quantity),
          ...(item.unit_of_measurement.trim()
            ? { unit_of_measurement: item.unit_of_measurement.trim() }
            : {}),
          ...(item.note.trim() ? { note: item.note.trim() } : {}),
        }));

      const normalizedDifficulty = normalizeDifficulty(recipeForm.difficulty);

      const payload: Record<string, unknown> = {
        title: recipeForm.title.trim(),
        description: recipeForm.description.trim(),
        difficulty: normalizedDifficulty,
        ...(recipeImageUrl ? { image_url: recipeImageUrl } : {}),
        portion: Number(recipeForm.portion) || 1,
        cooking_time: Number(recipeForm.cooking_time) || 1,
        calorific: Number(recipeForm.calorific) || 0,
        proteins: Number(recipeForm.proteins) || 0,
        fats: Number(recipeForm.fats) || 0,
        carbohydrates: Number(recipeForm.carbohydrates) || 0,
        is_private: recipeForm.parsed_from_url ? true : recipeForm.is_private,
        ...(Number.isFinite(Number(recipeForm.kitchen_id)) &&
        recipeForm.kitchen_id
          ? { kitchen_id: Number(recipeForm.kitchen_id) }
          : {}),
        ...(Number.isFinite(Number(recipeForm.celebration_id)) &&
        recipeForm.celebration_id
          ? { celebration_id: Number(recipeForm.celebration_id) }
          : {}),
        ...(Number.isFinite(Number(recipeForm.cooking_id)) &&
        recipeForm.cooking_id
          ? { cooking_id: Number(recipeForm.cooking_id) }
          : {}),
        ...(recipeForm.categories.length > 0
          ? { categories: recipeForm.categories }
          : {}),
        ...(normalizedIngredients.length > 0
          ? { ingredients: normalizedIngredients }
          : {}),
        ...(normalizedSteps.length > 0 ? { steps: normalizedSteps } : {}),
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
      alert(
        error instanceof Error
          ? `Не удалось сохранить рецепт: ${error.message}`
          : "Не удалось сохранить рецепт"
      );
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

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAvatarLoading(true);
      const avatarUrl = await uploadService.uploadImage(file, "avatars");
      const updatedUser = await userService.updateProfile({
        avatar_url: avatarUrl,
      });
      setUser((prev) =>
        prev
          ? {
              ...prev,
              ...updatedUser,
              avatar_url: updatedUser.avatar_url ?? avatarUrl,
            }
          : prev
      );
      authService.dispatchAuthChange();
    } catch (error) {
      console.error("Ошибка обновления аватарки:", error);
      alert("Не удалось обновить аватарку");
    } finally {
      setAvatarLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user) return;
    try {
      setAvatarLoading(true);
      const updatedUser = await userService.updateProfile({ avatar_url: null });
      setUser((prev) =>
        prev
          ? {
              ...prev,
              ...updatedUser,
              avatar_url: null,
            }
          : prev
      );
      authService.dispatchAuthChange();
    } catch (error) {
      console.error("Ошибка удаления аватарки:", error);
      alert("Не удалось удалить аватарку");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!user || recipeActionLoading) return;
    const confirmed = window.confirm(
      "Удалить профиль? Это действие необратимо."
    );
    if (!confirmed) return;

    try {
      setRecipeActionLoading(true);
      await userService.deleteProfile();
      try {
        await authService.logout();
      } catch {
        // Профиль уже удален, logout может вернуть ошибку.
      }
      authService.removeToken();
      authService.dispatchAuthChange();
      router.push("/");
    } catch (error) {
      console.error("Ошибка удаления профиля:", error);
      alert(
        error instanceof Error
          ? `Не удалось удалить профиль: ${error.message}`
          : "Не удалось удалить профиль"
      );
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
                <button
                  type="button"
                  onClick={() => setIsAvatarActionsOpen((prev) => !prev)}
                  className="absolute inset-0 z-10"
                  aria-label="Открыть действия с аватаркой"
                />
                {isAvatarActionsOpen && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/55 p-2">
                    <button
                      type="button"
                      disabled={avatarLoading}
                      onClick={() => {
                        avatarInputRef.current?.click();
                        setIsAvatarActionsOpen(false);
                      }}
                      className="w-full max-w-[130px] rounded-full bg-white px-3 py-1.5 font-nunito text-xs text-umami-dark-gray transition-colors hover:bg-[#f4f4f4] disabled:opacity-60"
                    >
                      {avatarLoading ? "Загрузка..." : "Изменить фото"}
                    </button>
                    <button
                      type="button"
                      disabled={avatarLoading}
                      onClick={() => {
                        void handleDeleteAvatar();
                        setIsAvatarActionsOpen(false);
                      }}
                      className="w-full max-w-[130px] rounded-full bg-red-500 px-3 py-1.5 font-nunito text-xs text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                    >
                      Удалить фото
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />

              <div className="flex min-w-0 flex-col gap-5">
                <h1 className="font-nunito text-xl font-bold text-black">
                  {user.name}
                </h1>
                <div className="flex gap-6 text-center text-black">
                  <div>
                    <p className="font-nunito text-xl font-semibold leading-none">
                      {stats.recipesCount}
                    </p>
                    <p className="mt-1 font-nunito text-sm">Рецепты</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openFollowModal("following")}
                  >
                    <p className="font-nunito text-xl font-semibold leading-none">
                      {stats.followingCount}
                    </p>
                    <p className="mt-1 font-nunito text-sm">Подписки</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void openFollowModal("followers")}
                  >
                    <p className="font-nunito text-xl font-semibold leading-none">
                      {stats.followersCount}
                    </p>
                    <p className="mt-1 font-nunito text-sm">Подписчики</p>
                  </button>
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
                    disabled={recipeActionLoading}
                    onClick={() => void handleDeleteProfile()}
                    className="w-fit rounded-full bg-red-500 px-3 py-[5px] font-nunito text-xs text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                  >
                    Удалить профиль
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
                {isEditModalOpen ? (
                  <div className="rounded-[20px] border border-[#eaeaea] bg-white p-6">
                    <h2 className="mb-4 font-nunito text-2xl font-bold text-umami-dark-gray">
                      Редактировать профиль
                    </h2>
                    {editProfileMessage && (
                      <p className="mb-4 rounded-xl bg-[#f6f6f6] px-3 py-2 font-nunito text-sm text-umami-dark-gray">
                        {editProfileMessage}
                      </p>
                    )}
                    <div className="flex flex-col gap-4">
                      <label className="block">
                        <span className="mb-1 block font-inter text-sm text-umami-gray">
                          Имя
                        </span>
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              name: e.target.value,
                            })
                          }
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
                            setEditFormData({
                              ...editFormData,
                              username: e.target.value,
                            })
                          }
                          className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-inter text-sm text-umami-gray">
                          Email
                        </span>
                        <input
                          type="email"
                          value={editFormData.email}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              email: e.target.value,
                            })
                          }
                          className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-inter text-sm text-umami-gray">
                          Новый пароль
                        </span>
                        <input
                          type="password"
                          value={editFormData.newPassword}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              newPassword: e.target.value,
                            })
                          }
                          placeholder="Оставьте пустым, если не меняете"
                          className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-inter text-sm text-umami-gray">
                          Подтвердите новый пароль
                        </span>
                        <input
                          type="password"
                          value={editFormData.confirmNewPassword}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              confirmNewPassword: e.target.value,
                            })
                          }
                          placeholder="Повторите новый пароль"
                          className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
                        />
                      </label>
                      {isEditVerificationStep && (
                        <>
                          <label className="block">
                            <span className="mb-1 block font-inter text-sm text-umami-gray">
                              Код подтверждения
                            </span>
                            <input
                              type="text"
                              value={editFormData.verifyCode}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  verifyCode: e.target.value,
                                })
                              }
                              placeholder="Введите код из письма"
                              className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleResendEditVerificationCode}
                            disabled={isEditProfileLoading}
                            className="w-fit font-nunito text-xs text-umami-green underline disabled:opacity-60"
                          >
                            Отправить код повторно
                          </button>
                        </>
                      )}
                    </div>
                    <div className="mt-6 flex gap-4">
                      <button
                        type="button"
                        disabled={isEditProfileLoading}
                        onClick={handleSaveProfile}
                        className="flex-1 rounded-full bg-umami-green px-6 py-2 font-nunito font-medium text-white disabled:opacity-60"
                      >
                        {isEditProfileLoading
                          ? "Сохраняем..."
                          : isEditVerificationStep
                          ? "Подтвердить и сохранить"
                          : "Сохранить"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditModalOpen(false);
                          setIsEditVerificationStep(false);
                          setEditProfileMessage(null);
                        }}
                        className="flex-1 rounded-full bg-umami-gray px-6 py-2 font-nunito font-medium text-white"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : recipes.length > 0 ? (
                  <div ref={feedColumnRef} className="flex flex-col gap-2.5 pb-10">
                    {/* Фильтры рецептов */}
                    <div className="flex gap-2.5 mb-2.5">
                      <button
                        onClick={() => setRecipeFilter("all")}
                        className={`px-4 py-1.5 rounded-full font-nunito text-xs font-bold transition-colors ${
                          recipeFilter === "all"
                            ? "bg-umami-green text-white"
                            : "bg-white border border-[#eaeaea] text-umami-gray hover:bg-gray-50"
                        }`}
                      >
                        Все ({recipes.length})
                      </button>
                      <button
                        onClick={() => setRecipeFilter("public")}
                        className={`px-4 py-1.5 rounded-full font-nunito text-xs font-bold transition-colors ${
                          recipeFilter === "public"
                            ? "bg-umami-green text-white"
                            : "bg-white border border-[#eaeaea] text-umami-gray hover:bg-gray-50"
                        }`}
                      >
                        Публичные ({recipes.filter((r) => !r.is_private).length}
                        )
                      </button>
                      <button
                        onClick={() => setRecipeFilter("private")}
                        className={`px-4 py-1.5 rounded-full font-nunito text-xs font-bold transition-colors ${
                          recipeFilter === "private"
                            ? "bg-umami-green text-white"
                            : "bg-white border border-[#eaeaea] text-umami-gray hover:bg-gray-50"
                        }`}
                      >
                        Приватные ({recipes.filter((r) => r.is_private).length})
                      </button>
                    </div>

                    {filteredRecipes.length > 0 ? (
                      filteredRecipes.map((recipe) => (
                        <div key={recipe.id} className="relative">
                          {recipe.is_private && (
                            <span className="absolute left-3 top-3 z-10 rounded-full bg-[#333]/90 px-3 py-1 font-nunito text-xs font-bold text-white">
                              Приватный
                            </span>
                          )}
                          <FeedCard
                            recipe={recipe}
                            currentUserId={user.id}
                            isFollowing={false}
                            showAuthorHeader={false}
                            detailsQuery="from=profile"
                            footerRightSlot={
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void openEditRecipeEditor(recipe)
                                  }
                                  className="rounded-full bg-white px-3 py-1 font-nunito text-xs font-bold text-umami-dark-gray border border-umami-light-gray/70"
                                >
                                  Редактировать
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecipe(recipe.id)}
                                  className="rounded-full bg-red-500 px-3 py-1 font-nunito text-xs font-bold text-white"
                                >
                                  Удалить
                                </button>
                              </>
                            }
                          />
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[15px] border border-[#eaeaea] bg-white p-8 text-center">
                        <p className="font-nunito text-base font-bold text-umami-gray">
                          Нет рецептов в этой категории
                        </p>
                      </div>
                    )}
                    <ScrollToTopButton anchorRef={feedColumnRef} />
                  </div>
                ) : (
                  <div className="rounded-[15px] border border-[#eaeaea] bg-white p-8 text-center">
                    <p className="font-nunito text-lg font-bold text-umami-gray">
                      Пока нет рецептов
                    </p>
                    <p className="mt-1 font-inter text-sm text-umami-light-gray">
                      Нажмите &quot;Добавить рецепт&quot;, чтобы создать первый.
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
                      <div
                        key={friend.id}
                        className="flex items-center gap-[5px]"
                      >
                        <div className="relative h-[30px] w-[30px] shrink-0 overflow-hidden rounded-full bg-[#d9d9d9]">
                          <Image
                            width={30}
                            height={30}
                            src={getSafeImageUrl(friend.avatar_url)}
                            alt="avatar"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="truncate font-inter text-sm text-umami-dark-gray">
                          {friend.name}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center font-inter text-sm text-umami-gray">
                    Пока нет друзей
                  </p>
                )}
              </aside>
            </div>
          )}

          {isRecipeEditorOpen && (
            <div className="overflow-hidden rounded-[24px] border border-[#eaeaea] bg-white shadow-[0_12px_36px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between border-b border-[#efefef] bg-[#fcfaf5] px-6 py-4">
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
              <p className="px-6 pt-3 font-inter text-sm text-umami-gray">
                Заполните основные поля, затем ингредиенты и шаги. Секцию можно
                прокручивать.
              </p>

              <div className="px-6 pb-6 pt-4">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2 rounded-2xl border border-[#efefef] bg-[#faf9f6] p-4">
                    <span className="mb-1 block font-inter text-sm text-umami-gray">
                      Ссылка на рецепт для парсинга
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={recipeForm.source_url}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            source_url: e.target.value,
                          })
                        }
                        placeholder="https://..."
                        className="w-full rounded-full border border-umami-light-gray bg-white px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                      />
                      <button
                        type="button"
                        onClick={handleParseRecipeByUrl}
                        disabled={parseLoading}
                        className="whitespace-nowrap rounded-full bg-umami-orange px-4 py-2 font-nunito text-sm text-white disabled:opacity-60"
                      >
                        {parseLoading ? "Парсинг..." : "Заполнить"}
                      </button>
                      {recipeForm.parsed_from_url ? (
                        <button
                          type="button"
                          onClick={handleResetParsedRecipe}
                          className="whitespace-nowrap rounded-full bg-umami-gray px-4 py-2 font-nunito text-sm text-white"
                        >
                          Сбросить
                        </button>
                      ) : null}
                    </div>
                    {parseWarnings.length > 0 ? (
                      <div className="mt-2 rounded-2xl border border-umami-light-gray bg-[#fff8ea] p-3">
                        <p className="font-inter text-xs text-umami-gray">
                          Не удалось получить поля:
                        </p>
                        <p className="mt-1 font-inter text-sm text-umami-dark-gray">
                          {parseWarnings.join(", ")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <label className="col-span-2 block">
                    <span className="mb-1 block font-inter text-sm text-umami-gray">
                      Название
                    </span>
                    <input
                      type="text"
                      value={recipeForm.title}
                      onChange={(e) =>
                        setRecipeForm({ ...recipeForm, title: e.target.value })
                      }
                      className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                    />
                  </label>

                  <label className="col-span-2 block">
                    <span className="mb-1 block font-inter text-sm text-umami-gray">
                      Описание
                    </span>
                    <textarea
                      value={recipeForm.description}
                      onChange={(e) =>
                        setRecipeForm({
                          ...recipeForm,
                          description: e.target.value,
                        })
                      }
                      className="h-24 w-full rounded-2xl border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                    />
                  </label>

                  <label className="col-span-2 block">
                    <span className="mb-1 block font-inter text-sm text-umami-gray">
                      Фото рецепта
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleRecipeImageFileChange(e.target.files?.[0] || null)
                      }
                      className="w-full rounded-2xl border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                    />
                    {recipeForm.image_preview && (
                      <div className="relative mt-2 w-full overflow-hidden rounded-2xl border border-umami-light-gray">
                        <Image
                          src={getSafeImageUrl(recipeForm.image_preview)}
                          alt="recipe preview"
                          width={960}
                          height={960}
                          className="h-auto w-full rounded-2xl object-contain"
                        />
                      </div>
                    )}
                  </label>

                  <div className="col-span-2 grid grid-cols-3 gap-3">
                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Сложность
                      </span>
                      <select
                        value={recipeForm.difficulty}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            difficulty: e.target.value,
                          })
                        }
                        className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                      >
                        <option value="1">Легко</option>
                        <option value="3">Средне</option>
                        <option value="5">Сложно</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Порции
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={recipeForm.portion}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            portion: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
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
                          setRecipeForm({
                            ...recipeForm,
                            cooking_time: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                      />
                    </label>
                  </div>

                  <div className="col-span-2 rounded-xl border border-[#f3d8b6] bg-[#fff7ec] px-3 py-2">
                    <p className="font-inter text-xs text-umami-gray">
                      Если не заполнять поля белки, жиры и углеводы, их
                      рассчитает ИИ после публикации рецепта.
                    </p>
                  </div>

                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Калории
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={recipeForm.calorific}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            calorific: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Белки
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={recipeForm.proteins}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            proteins: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Жиры
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={recipeForm.fats}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            fats: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Углеводы
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={recipeForm.carbohydrates}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            carbohydrates: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                      />
                    </label>
                  </div>

                  <div className="col-span-2 rounded-2xl border border-[#efefef] bg-[#faf9f6] p-4">
                    <span className="mb-1 block font-inter text-sm text-umami-gray">
                      Категории
                    </span>
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-umami-light-gray p-3">
                      {categories.map((item) => {
                        const selected = recipeForm.categories.includes(
                          Number(item.id)
                        );
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setRecipeForm((prev) => ({
                                ...prev,
                                categories: selected
                                  ? prev.categories.filter(
                                      (id) => id !== Number(item.id)
                                    )
                                  : [...prev.categories, Number(item.id)],
                              }))
                            }
                            className={`rounded-full px-3 py-1 text-sm font-nunito ${
                              selected
                                ? "bg-umami-orange text-white"
                                : "bg-gray-100 text-umami-gray"
                            }`}
                          >
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                <div className="col-span-2 grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className="mb-1 block font-inter text-sm text-umami-gray">
                      Кухня
                    </span>
                    <select
                      value={recipeForm.kitchen_id ?? ""}
                      onChange={(e) =>
                        setRecipeForm({
                          ...recipeForm,
                          kitchen_id: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
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
                    <span className="mb-1 block font-inter text-sm text-umami-gray">
                      Праздник
                    </span>
                    <select
                      value={recipeForm.celebration_id ?? ""}
                      onChange={(e) =>
                        setRecipeForm({
                          ...recipeForm,
                          celebration_id: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
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
                          cooking_id: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                    >
                      <option value="">Не выбрано</option>
                      {cookings.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                  <div className="col-span-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-inter text-sm text-umami-gray">
                        Ингредиенты
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRecipeForm((prev) => ({
                            ...prev,
                            ingredients: [
                              ...prev.ingredients,
                              {
                                ingredient_id: null,
                                ingredient_name: "",
                                quantity: 1,
                                unit_of_measurement: "",
                                note: "",
                              },
                            ],
                          }))
                        }
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-nunito"
                      >
                        + ингредиент
                      </button>
                    </div>
                    <div className="space-y-3">
                      {recipeForm.ingredients.map((item, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-4 gap-2 rounded-2xl border border-[#efefef] bg-[#faf9f6] p-3"
                        >
                          <select
                            value={item.ingredient_id ?? ""}
                            onChange={(e) =>
                              handleIngredientSelect(index, e.target.value)
                            }
                            className="rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                          >
                            <option value="">Ингредиент</option>
                            {ingredientsCatalog.map((ingredient) => (
                              <option key={ingredient.id} value={ingredient.id}>
                                {ingredient.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            value={item.quantity}
                            onChange={(e) =>
                              setIngredient(index, {
                                quantity: Number(e.target.value) || 1,
                              })
                            }
                            placeholder="Кол-во"
                            className="rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                          />
                          <select
                            value={item.unit_of_measurement}
                            onChange={(e) =>
                              setIngredient(index, {
                                unit_of_measurement: e.target.value,
                              })
                            }
                            className="rounded-full border border-umami-light-gray px-4 py-2 text-sm text-umami-gray"
                          >
                            <option value="">Ед. изм.</option>
                            {units.map((unit) => (
                              <option
                                key={`${index}-${unit.id}`}
                                value={unit.short_name || unit.name}
                              >
                                {unit.name} ({unit.short_name || unit.name})
                              </option>
                            ))}
                            {item.unit_of_measurement &&
                              !units.some(
                                (unit) =>
                                  (unit.short_name || unit.name) ===
                                  item.unit_of_measurement
                              ) && (
                                <option value={item.unit_of_measurement}>
                                  {item.unit_of_measurement}
                                </option>
                              )}
                          </select>
                          <input
                            type="text"
                            value={item.note}
                            onChange={(e) =>
                              setIngredient(index, { note: e.target.value })
                            }
                            placeholder="Примечание"
                            className="rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 rounded-2xl border border-[#efefef] bg-[#faf9f6] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-inter text-sm text-umami-gray">
                        Шаги
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRecipeForm((prev) => ({
                            ...prev,
                            steps: [
                              ...prev.steps,
                              {
                                description: "",
                                image_url: "",
                                image_file: null,
                                image_preview: "",
                              },
                            ],
                          }))
                        }
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-nunito"
                      >
                        + шаг
                      </button>
                    </div>
                    <div className="space-y-2">
                      {recipeForm.steps.map((item, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 gap-2 rounded-2xl border border-umami-light-gray p-3"
                        >
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              setStep(index, { description: e.target.value })
                            }
                            placeholder="Описание шага"
                            className="rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                          />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleStepImageFileChange(
                                index,
                                e.target.files?.[0] || null
                              )
                            }
                            className="rounded-2xl border border-umami-light-gray px-4 py-2 text-sm"
                          />
                          <input
                            type="text"
                            value={item.image_url}
                            onChange={(e) =>
                              setStep(index, { image_url: e.target.value })
                            }
                            placeholder="или ссылка на фото шага"
                            className="rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                          />
                          {item.image_preview && (
                            <div className="relative w-full overflow-hidden rounded-2xl border border-umami-light-gray">
                              <Image
                                src={getSafeImageUrl(item.image_preview)}
                                alt="step preview"
                                width={960}
                                height={960}
                                className="h-auto w-full rounded-2xl object-contain"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 mt-1 flex items-center gap-3">
                    <span className="font-inter text-sm text-umami-gray">
                      Видимость рецепта:
                    </span>
                    {!recipeForm.parsed_from_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          setRecipeForm({ ...recipeForm, is_private: false })
                        }
                        className={`rounded-full px-4 py-1.5 font-nunito text-sm ${
                          !recipeForm.is_private
                            ? "bg-umami-green text-white"
                            : "bg-gray-100 text-umami-gray"
                        }`}
                      >
                        Публичный
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        if (!recipeForm.parsed_from_url) {
                          setRecipeForm({ ...recipeForm, is_private: true });
                        }
                      }}
                      className={`rounded-full px-4 py-1.5 font-nunito text-sm ${
                        recipeForm.is_private
                          ? "bg-umami-orange text-white"
                          : "bg-gray-100 text-umami-gray"
                      } ${
                        recipeForm.parsed_from_url
                          ? "cursor-not-allowed opacity-85"
                          : ""
                      }`}
                    >
                      Приватный
                    </button>
                  </div>
                </div>

              <div className="mt-6 flex gap-3 border-t border-[#efefef] pt-3">
                <button
                  type="button"
                  disabled={recipeActionLoading}
                  onClick={handleSaveRecipe}
                  className="flex-1 rounded-full bg-umami-green px-4 py-1.75 font-nunito text-sm font-medium text-white transition-colors hover:bg-[#6a805e] disabled:opacity-60"
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
                  className="flex-1 rounded-full bg-umami-gray px-4 py-1.75 font-nunito text-sm font-medium text-white transition-colors hover:bg-gray-500 disabled:opacity-60"
                >
                  Отмена
                </button>
              </div>
              </div>
            </div>
          )}
        </section>
      </div>
      {followModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[520px] rounded-[20px] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-nunito text-xl font-bold text-umami-dark-gray">
                {followModalType === "following" ? "Подписки" : "Подписчики"}
              </h3>
              <button
                type="button"
                onClick={() => setFollowModalType(null)}
                className="rounded-full bg-umami-gray px-3 py-1 font-nunito text-xs text-white"
              >
                Закрыть
              </button>
            </div>
            {followModalLoading ? (
              <p className="py-4 text-sm text-umami-gray">Загрузка...</p>
            ) : followModalUsers.length === 0 ? (
              <p className="py-4 text-sm text-umami-gray">Список пуст</p>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {followModalUsers.map((person) => (
                  <Link
                    key={person.id}
                    href={`/users/${person.id}`}
                    onClick={() => setFollowModalType(null)}
                    className="flex items-center gap-3 rounded-xl border border-umami-light-gray/50 p-2 hover:bg-[#faf7ef]"
                  >
                    <Image
                      width={40}
                      height={40}
                      src={getSafeImageUrl(person.avatar_url)}
                      alt={person.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-nunito text-sm font-bold text-umami-dark-gray">
                        {person.name}
                      </p>
                      <p className="truncate font-inter text-xs text-umami-gray">
                        @{person.username}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
