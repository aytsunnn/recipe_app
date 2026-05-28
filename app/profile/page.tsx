"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import LeftPart from "../components/MainScreen/NavigationLeftPart";
import FollowUsersModal from "./components/FollowUsersModal";
import ProfileHeaderCard from "./components/ProfileHeaderCard";
import ProfileOverviewSection from "./components/ProfileOverviewSection";
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
import { getUserFriendlyErrorMessage } from "../utils/errorUtils";
import { toolsService } from "../services/toolsService";
import { useUiFeedback } from "../components/UiFeedbackProvider";
import CustomSelect from "../components/ui/CustomSelect";

interface UserStats {
  followingCount: number;
  followersCount: number;
  recipesCount: number;
}

interface IngredientRow {
  ingredient_id: number | null;
  ingredient_name: string;
  quantity: number | string;
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
  portion: number | string;
  cooking_time: number | string;
  calorific: number | string;
  proteins: number | string;
  fats: number | string;
  carbohydrates: number | string;
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

const UNIT_OVERRIDE_MARKER = "__unit_override:";

const parseUnitOverrideFromNote = (
  note: string | null | undefined
): { cleanNote: string; unitOverride: string | null } => {
  const raw = (note || "").trim();
  if (!raw) return { cleanNote: "", unitOverride: null };
  const parts = raw.split(/\s+/);
  const marker = parts.find((part) => part.startsWith(UNIT_OVERRIDE_MARKER));
  const unitOverride = marker
    ? marker.slice(UNIT_OVERRIDE_MARKER.length).trim() || null
    : null;
  const cleanNote = parts
    .filter((part) => !part.startsWith(UNIT_OVERRIDE_MARKER))
    .join(" ")
    .trim();
  return { cleanNote, unitOverride };
};

const mergeNoteWithUnitOverride = (
  note: string,
  selectedUnit: string,
  linkedUnit: string
): string => {
  const unit = selectedUnit.trim();
  const linked = linkedUnit.trim();
  const baseNote = parseUnitOverrideFromNote(note).cleanNote;
  const needsOverride =
    Boolean(unit) &&
    (!linked || unit.toLowerCase() !== linked.toLowerCase());
  if (!needsOverride) return baseNote;
  return `${baseNote} ${UNIT_OVERRIDE_MARKER}${unit}`.trim();
};

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
  "Легко": "1",
  "Средне": "3",
  "Сложно": "5",
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

function ProfilePageContent() {
  const { confirm, toast } = useUiFeedback();
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
    bio: "",
    avatar_url: null as string | null,
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
  const [openRecipeActionsId, setOpenRecipeActionsId] = useState<string | null>(
    null
  );
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
  const [focusedIngredientIndex, setFocusedIngredientIndex] = useState<number | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const createProcessedRef = useRef(false);

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenRecipeActionsId(null);
    };

    if (!openRecipeActionsId) return;
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [openRecipeActionsId]);

  const filteredRecipes = useMemo(() => {
    if (recipeFilter === "public") return recipes.filter((r) => !r.is_private);
    if (recipeFilter === "private") return recipes.filter((r) => r.is_private);
    return recipes;
  }, [recipes, recipeFilter]);

  const feedColumnRef = useRef<HTMLDivElement | null>(null);

  const getSafeImageUrl = (url: string | null) => {
    return normalizeImageUrl(url, "/avatar.jpg");
  };

  const loadMeta = useCallback(async () => {
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
  }, []);

  const loadProfile = async (currentUser: User) => {
    const [following, followers, ownRecipesRaw] =
      await Promise.all([
        followService.getFollowing(currentUser.id),
        followService.getFollowers(currentUser.id),
        userService.getRecipes(currentUser.id),
      ]);

    const followingIds = new Set(following.map((follow) => follow.id));
    const mutualFriends = followers.filter((follower) =>
      followingIds.has(follower.id)
    );

    setFriends(mutualFriends);
    const allById = new Map<string, Recipe>();
    ownRecipesRaw.forEach((recipe) => {
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
        const shouldLoadMeta = searchParams?.get("create") === "1";
        if (shouldLoadMeta) {
          await Promise.all([loadMeta(), loadProfile(userData)]);
        } else {
          await loadProfile(userData);
        }
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
  }, [router, searchParams]);

  const handleEditProfile = () => {
    if (!user) return;
    setEditFormData({
      name: user.name,
      username: user.username,
      email: user.email || "",
      bio: ((user as unknown as { bio?: string | null }).bio || ""),
      avatar_url: user.avatar_url || null,
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
      toast("Заполните имя, имя пользователя и email", "error");
      return;
    }

    if (
      hasPasswordChange &&
      editFormData.newPassword !== editFormData.confirmNewPassword
    ) {
      toast("Новый пароль и подтверждение не совпадают", "error");
      return;
    }

    if (hasPasswordChange && editFormData.newPassword.length < 8) {
      toast("Новый пароль должен содержать минимум 8 символов", "error");
      return;
    }

    if (needsVerification && !isEditVerificationStep) {
      try {
        setIsEditProfileLoading(true);
        await authService.resendVerificationCode(normalizedEmail);
        setIsEditVerificationStep(true);
        setEditProfileMessage("Код подтверждения отправлен на email");
        if (hasPasswordChange) {
          toast("Код подтверждения для смены пароля отправлен", "info");
        }
      } catch (error) {
        console.error("Ошибка отправки кода подтверждения:", error);
        setEditProfileMessage("Не удалось отправить код подтверждения");
        if (hasPasswordChange) {
          toast("Не удалось отправить код для смены пароля", "error");
        }
      } finally {
        setIsEditProfileLoading(false);
      }
      return;
    }

    if (needsVerification && !editFormData.verifyCode.trim()) {
      if (hasPasswordChange) {
        toast("Введите код подтверждения", "error");
      } else {
        toast("Введите код подтверждения", "error");
      }
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
        bio: editFormData.bio.trim(),
        avatar_url: editFormData.avatar_url,
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
      if (hasPasswordChange) {
        toast("Пароль успешно изменен", "success");
      }
    } catch (error) {
      console.error("Ошибка при обновлении профиля:", error);
      if (hasPasswordChange) {
        toast(
          `Не удалось изменить пароль: ${getUserFriendlyErrorMessage(
            error,
            "Попробуйте еще раз"
          )}`,
          "error"
        );
      } else {
        toast(
          `Не удалось обновить профиль: ${getUserFriendlyErrorMessage(
            error,
            "Попробуйте еще раз"
          )}`,
          "error"
        );
      }
    } finally {
      setIsEditProfileLoading(false);
    }
  };

  const handleResendEditVerificationCode = async () => {
    const normalizedEmail = editFormData.email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast("Введите email", "error");
      return;
    }

    try {
      setIsEditProfileLoading(true);
      await authService.resendVerificationCode(normalizedEmail);
      setEditProfileMessage("Код отправлен повторно");
      if (editFormData.newPassword.trim().length > 0) {
        toast("Код для смены пароля отправлен повторно", "info");
      }
    } catch (error) {
      console.error("Ошибка повторной отправки кода:", error);
      setEditProfileMessage("Не удалось отправить код повторно");
      if (editFormData.newPassword.trim().length > 0) {
        toast("Не удалось отправить код для смены пароля", "error");
      }
    } finally {
      setIsEditProfileLoading(false);
    }
  };

  const openCreateRecipeEditor = useCallback(async () => {
    setEditingRecipeId(null);
    setRecipeForm(emptyRecipeForm);
    setParseWarnings([]);
    setIsRecipeEditorOpen(true);
    await loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (isLoading) return;
    const shouldOpenCreate = searchParams?.get("create") === "1";
    if (!shouldOpenCreate) {
      createProcessedRef.current = false;
      return;
    }
    if (typeof window === "undefined") return;

    if (createProcessedRef.current) return;
    createProcessedRef.current = true;

    const raw = window.sessionStorage.getItem("microchef_recipe_prefill");
    if (!raw) {
      Promise.resolve().then(() => {
        void openCreateRecipeEditor();
      });
      router.replace("/profile");
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

      Promise.resolve().then(() => {
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
          parsed_from_url: true,
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
      });
    } catch (error) {
      console.error("Ошибка автозаполнения рецепта из микро-шефа:", error);
      Promise.resolve().then(() => {
        void openCreateRecipeEditor();
      });
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
    openCreateRecipeEditor,
  ]);

  const openEditRecipeEditor = async (recipe: Recipe) => {
    void loadMeta();
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
              ...(function () {
                const parsed = parseUnitOverrideFromNote(
                  ingredient.RecipeIngredient?.note || ""
                );
                const linkedUnit =
                  ingredient.RecipeIngredient?.unit_of_measurement ||
                  ingredient.RecipeIngredient?.unit_short_name ||
                  ingredient.RecipeIngredient?.unit_name ||
                  ingredient.RecipeIngredient?.unit ||
                  ingredient.RecipeIngredient?.measure ||
                  ingredient.Unit?.short_name ||
                  ingredient.Unit?.name ||
                  ingredient.unit_of_measurement ||
                  "";
                return {
                  resolvedNote: parsed.cleanNote,
                  resolvedUnit: parsed.unitOverride || linkedUnit,
                };
              })(),
              ingredient_id: Number(ingredient.id),
              ingredient_name: ingredient.name || "",
              quantity: Number(ingredient.RecipeIngredient?.quantity) || 1,
              unit_of_measurement: (function () {
                const parsed = parseUnitOverrideFromNote(
                  ingredient.RecipeIngredient?.note || ""
                );
                return (
                  parsed.unitOverride ||
                  ingredient.RecipeIngredient?.unit_of_measurement ||
                  ingredient.RecipeIngredient?.unit_short_name ||
                  ingredient.RecipeIngredient?.unit_name ||
                  ingredient.RecipeIngredient?.unit ||
                  ingredient.RecipeIngredient?.measure ||
                  ingredient.Unit?.short_name ||
                  ingredient.Unit?.name ||
                  ingredient.unit_of_measurement ||
                  ""
                );
              })(),
              note: parseUnitOverrideFromNote(
                ingredient.RecipeIngredient?.note || ""
              ).cleanNote,
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

    const normalize = (value: string) => value.trim().toLowerCase();
    const selectedAny = selected as unknown as Record<string, unknown> | null;
    const toStringSafe = (value: unknown): string =>
      typeof value === "string" ? value.trim() : "";

    const unitIdRaw =
      selectedAny && (selectedAny.unit_id ?? selectedAny.unitId ?? null);
    const unitId =
      typeof unitIdRaw === "number"
        ? unitIdRaw
        : typeof unitIdRaw === "string" && unitIdRaw.trim()
        ? Number(unitIdRaw)
        : null;

    const byId = Number.isFinite(Number(unitId))
      ? units.find((unit) => Number(unit.id) === Number(unitId))
      : null;

    const unitFromNested =
      selectedAny && selectedAny.Unit && typeof selectedAny.Unit === "object"
        ? (selectedAny.Unit as Record<string, unknown>)
        : null;

    const unitCandidates = [
      toStringSafe(selected?.unit_of_measurement),
      toStringSafe(selectedAny?.unit_of_measurement),
      toStringSafe(selectedAny?.unit),
      toStringSafe(selectedAny?.unit_name),
      toStringSafe(selectedAny?.unit_short_name),
      toStringSafe(unitFromNested?.short_name),
      toStringSafe(unitFromNested?.name),
    ].filter(Boolean);

    const byName =
      unitCandidates
        .map((candidate) =>
          units.find(
            (unit) =>
              normalize(unit.name) === normalize(candidate) ||
              normalize(unit.short_name || unit.name) === normalize(candidate)
          )
        )
        .find(Boolean) || null;

    const resolvedUnit =
      (byId?.short_name || byId?.name || "").trim() ||
      (byName?.short_name || byName?.name || "").trim() ||
      unitCandidates[0] ||
      "";

    setIngredient(index, {
      ingredient_id: ingredientId,
      ingredient_name: selected?.name || "",
      unit_of_measurement: resolvedUnit,
    });
  };

  const handleParseRecipeByUrl = async () => {
    const sourceUrl = recipeForm.source_url.trim();
    if (!sourceUrl) {
      toast("Добавьте ссылку на рецепт", "error");
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
              const matchedIngredient = ingredientsCatalog.find(
                (entry) =>
                  (entry.name || "").trim().toLowerCase() ===
                  name.trim().toLowerCase()
              );
              const matchedIngredientAny = matchedIngredient as
                | (Ingredient & { unit_id?: string | number | null })
                | null;
              const linkedUnitIdRaw =
                matchedIngredientAny?.unit_id ??
                (matchedIngredientAny as unknown as Record<string, unknown>)?.[
                  "unitId"
                ] ??
                null;
              const linkedUnitId =
                typeof linkedUnitIdRaw === "number"
                  ? linkedUnitIdRaw
                  : typeof linkedUnitIdRaw === "string" && linkedUnitIdRaw.trim()
                  ? Number(linkedUnitIdRaw)
                  : null;
              const linkedUnit =
                Number.isFinite(Number(linkedUnitId))
                  ? units.find((item) => Number(item.id) === Number(linkedUnitId))
                  : null;
              const resolvedUnit =
                unit.trim() ||
                (linkedUnit?.short_name || linkedUnit?.name || "").trim();
              if (!name) return null;
              return {
                ingredient_id: matchedIngredient ? Number(matchedIngredient.id) : null,
                ingredient_name: name,
                quantity,
                unit_of_measurement: resolvedUnit,
                note: "",
              } as IngredientRow;
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
      toast("Не удалось распарсить рецепт по ссылке", "error");
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
      toast("Заполните название и описание рецепта", "error");
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
          (item) =>
            (Number(item.ingredient_id) > 0 || item.ingredient_name.trim().length > 0) &&
            Number(item.quantity) > 0
        )
        .map((item) => {
          const unitRaw = item.unit_of_measurement.trim();
          const normalizedUnit = unitRaw.toLowerCase();
          const matchedUnit = unitRaw
            ? units.find(
                (unit) =>
                  (unit.short_name || unit.name).trim().toLowerCase() ===
                    normalizedUnit ||
                  unit.name.trim().toLowerCase() === normalizedUnit
              ) || null
            : null;

          const linkedIngredient = item.ingredient_id
            ? ingredientsCatalog.find(
                (entry) => Number(entry.id) === Number(item.ingredient_id)
              )
            : null;
          const linkedUnit = (linkedIngredient?.unit_of_measurement || "").trim();
          const finalNote = mergeNoteWithUnitOverride(
            item.note,
            unitRaw,
            linkedUnit
          );

          return {
            ...(item.ingredient_id
              ? { id: Number(item.ingredient_id) }
              : { name: item.ingredient_name.trim() }),
            quantity: Number(item.quantity),
            ...(unitRaw ? { unit_of_measurement: unitRaw } : {}),
            ...(matchedUnit ? { unit_id: Number(matchedUnit.id) } : {}),
            ...(finalNote ? { note: finalNote } : {}),
          };
        });

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
        is_parsed: recipeForm.parsed_from_url,
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
      toast(
        `Не удалось сохранить рецепт: ${getUserFriendlyErrorMessage(
          error,
          "Попробуйте еще раз"
        )}`,
        "error"
      );
    } finally {
      setRecipeActionLoading(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!user) return;
    const confirmedDeleteRecipe = await confirm("Удалить этот рецепт?");
    if (!confirmedDeleteRecipe) return;
    try {
      setRecipeActionLoading(true);
      await recipeService.delete(recipeId);
      await loadProfile(user);
    } catch (error) {
      console.error("Ошибка при удалении рецепта:", error);
      toast("Не удалось удалить рецепт", "error");
    } finally {
      setRecipeActionLoading(false);
    }
  };

  const isParsedRecipe = (recipe: Recipe): boolean => {
    const anyRecipe = recipe as unknown as Record<string, unknown>;
    const toBool = (value: unknown) =>
      value === true || value === "true" || value === 1 || value === "1";

    const sourceUrl =
      typeof recipe.source_url === "string" ? recipe.source_url.trim() : "";

    return (
      toBool(recipe.parsed_from_url) ||
      toBool(recipe.is_parsed) ||
      toBool(anyRecipe.parsedFromUrl) ||
      toBool(anyRecipe.isParsed) ||
      toBool(anyRecipe.parsed) ||
      sourceUrl.length > 0
    );
  };

  const handleToggleRecipeVisibility = async (recipe: Recipe) => {
    if (!user) return;

    if (isParsedRecipe(recipe)) {
      toast(
        "Для скопированного рецепта и рецепта от микро-шефа видимость изменить нельзя",
        "error"
      );
      return;
    }

    const nextIsPrivate = !recipe.is_private;
    const nextLabel = nextIsPrivate ? "приватный" : "публичный";
    const confirmed = await confirm(
      `Вы точно хотите изменить видимость на ${nextLabel}?`
    );
    if (!confirmed) return;

    try {
      await recipeService.update(recipe.id, { is_private: nextIsPrivate });
      await loadProfile(user);
    } catch (error) {
      console.error("Ошибка изменения видимости рецепта:", error);
      toast("Не удалось изменить видимость рецепта", "error");
    }
  };

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAvatarLoading(true);
      const avatarUrl = await uploadService.uploadImage(file, "avatars");
      setEditFormData((prev) => ({ ...prev, avatar_url: avatarUrl }));
    } catch (error) {
      console.error("Ошибка обновления аватарки:", error);
      toast("Не удалось обновить аватарку", "error");
    } finally {
      setAvatarLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleDeleteAvatar = async () => {
    setEditFormData((prev) => ({ ...prev, avatar_url: null }));
    setIsAvatarActionsOpen(false);
  };

  const handleDeleteProfile = async () => {
    if (!user || recipeActionLoading) return;
    const confirmed = await confirm(
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
      toast(
        `Не удалось удалить профиль: ${getUserFriendlyErrorMessage(
          error,
          "Попробуйте еще раз"
        )}`,
        "error"
      );
    } finally {
      setRecipeActionLoading(false);
    }
  };

  const handleLogoutProfile = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Ошибка выхода из профиля:", error);
    } finally {
      authService.removeToken();
      authService.dispatchAuthChange();
      router.push("/");
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
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[223px_minmax(0,1fr)] lg:gap-5">
        <aside className="relative hidden lg:block">
          <LeftPart />
        </aside>

        <section className="flex min-w-0 flex-col gap-5">
          <ProfileHeaderCard
            user={user}
            recipesCount={stats.recipesCount}
            followingCount={stats.followingCount}
            followersCount={stats.followersCount}
            onFollowingClick={() => void openFollowModal("following")}
            onFollowersClick={() => void openFollowModal("followers")}
            onEditProfileClick={handleEditProfile}
            onDeleteProfileClick={() => void handleDeleteProfile()}
            onLogoutClick={() => void handleLogoutProfile()}
            recipeActionLoading={recipeActionLoading}
          />

          {!isRecipeEditorOpen && (
            <ProfileOverviewSection
              isEditModalOpen={isEditModalOpen}
              isEditVerificationStep={isEditVerificationStep}
              isEditProfileLoading={isEditProfileLoading}
              editProfileMessage={editProfileMessage}
              editFormData={editFormData}
              setEditFormData={setEditFormData}
              handleSaveProfile={handleSaveProfile}
              handleResendEditVerificationCode={handleResendEditVerificationCode}
              avatarLoading={avatarLoading}
              isAvatarActionsOpen={isAvatarActionsOpen}
              avatarInputRef={avatarInputRef}
              onToggleAvatarActions={() => setIsAvatarActionsOpen((prev) => !prev)}
              onAvatarFileChange={handleAvatarFileChange}
              onAvatarDeleteClick={handleDeleteAvatar}
              closeEditModal={() => {
                setIsEditModalOpen(false);
                setIsEditVerificationStep(false);
                setEditProfileMessage(null);
                setIsAvatarActionsOpen(false);
              }}
              recipes={recipes}
              filteredRecipes={filteredRecipes}
              recipeFilter={recipeFilter}
              setRecipeFilter={setRecipeFilter}
              currentUserId={user.id}
              openRecipeActionsId={openRecipeActionsId}
              onToggleRecipeActions={(recipeId) =>
                setOpenRecipeActionsId((prev) =>
                  prev === recipeId ? null : recipeId
                )
              }
              onEditRecipe={(recipe) => {
                setOpenRecipeActionsId(null);
                void openEditRecipeEditor(recipe);
              }}
              onDeleteRecipe={(recipeId) => {
                setOpenRecipeActionsId(null);
                void handleDeleteRecipe(recipeId);
              }}
              onToggleRecipeVisibility={(recipe) => {
                void handleToggleRecipeVisibility(recipe);
              }}
              onAddRecipeClick={openCreateRecipeEditor}
              feedColumnRef={feedColumnRef}
              friends={friends}
            />
          )}

          {isRecipeEditorOpen && (
            <div className="overflow-hidden rounded-[24px] border border-[#eaeaea] bg-white shadow-[0_12px_36px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between border-b border-[#efefef] bg-[#fcfaf5] px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4">
                <h2 className="font-nunito text-lg font-bold sm:text-xl md:text-2xl text-umami-dark-gray">
                  {editingRecipeId ? "Редактировать рецепт" : "Добавить рецепт"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecipeEditorOpen(false);
                    setEditingRecipeId(null);
                    setRecipeForm(emptyRecipeForm);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-umami-light-gray/50 bg-white hover:bg-umami-light-gray/10 transition-colors duration-200"
                >
                  <Image width={12} height={12} src="/X.svg" alt="close" />
                </button>
              </div>
              <p className="px-6 pt-3 font-inter text-sm text-umami-gray">
                Заполните основные поля, затем ингредиенты и шаги. Секцию можно
                прокручивать.
              </p>

              <div className="px-3 pb-4 pt-3 sm:px-4 sm:pb-5 sm:pt-4 md:px-6 md:pb-6 md:pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
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

                  <div className="col-span-1 grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Сложность
                      </span>
                      <CustomSelect
                        value={recipeForm.difficulty}
                        onChange={(nextValue) =>
                          setRecipeForm({
                            ...recipeForm,
                            difficulty: nextValue,
                          })
                        }
                        options={[
                          { value: "1", label: "Легко" },
                          { value: "3", label: "Средне" },
                          { value: "5", label: "Сложно" },
                        ]}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Порции
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={recipeForm.portion}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setRecipeForm({
                            ...recipeForm,
                            portion: val === "" ? "" : Number(val),
                          });
                        }}
                        className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Время приготовления (мин)
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={recipeForm.cooking_time}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setRecipeForm({
                            ...recipeForm,
                            cooking_time: val === "" ? "" : Number(val),
                          });
                        }}
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

                  <div className="col-span-1 grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2 md:gap-4">
                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Калории
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={recipeForm.calorific}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setRecipeForm({
                            ...recipeForm,
                            calorific: val === "" ? "" : Number(val),
                          });
                        }}
                        className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Белки
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={recipeForm.proteins}
                        onChange={(e) => {
                          const val = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
                          setRecipeForm({
                            ...recipeForm,
                            proteins: val === "" ? "" : val,
                          });
                        }}
                        className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Жиры
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={recipeForm.fats}
                        onChange={(e) => {
                          const val = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
                          setRecipeForm({
                            ...recipeForm,
                            fats: val === "" ? "" : val,
                          });
                        }}
                        className="w-full rounded-full border border-umami-light-gray bg-[#fcfcfc] px-4 py-2 font-nunito text-sm outline-none focus:border-umami-orange/60"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-inter text-sm text-umami-gray">
                        Углеводы
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={recipeForm.carbohydrates}
                        onChange={(e) => {
                          const val = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
                          setRecipeForm({
                            ...recipeForm,
                            carbohydrates: val === "" ? "" : val,
                          });
                        }}
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

                <div className="col-span-1 grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block font-inter text-sm text-umami-gray">
                      Кухня
                    </span>
                    <CustomSelect
                      value={recipeForm.kitchen_id ? String(recipeForm.kitchen_id) : ""}
                      onChange={(nextValue) =>
                        setRecipeForm({
                          ...recipeForm,
                          kitchen_id: nextValue ? Number(nextValue) : null,
                        })
                      }
                      options={[
                        { value: "", label: "Не выбрано", muted: true },
                        ...kitchens.map((item) => ({
                          value: String(item.id),
                          label: item.name,
                        })),
                      ]}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block font-inter text-sm text-umami-gray">
                      Праздник
                    </span>
                    <CustomSelect
                      value={
                        recipeForm.celebration_id
                          ? String(recipeForm.celebration_id)
                          : ""
                      }
                      onChange={(nextValue) =>
                        setRecipeForm({
                          ...recipeForm,
                          celebration_id: nextValue ? Number(nextValue) : null,
                        })
                      }
                      options={[
                        { value: "", label: "Не выбрано", muted: true },
                        ...celebrations.map((item) => ({
                          value: String(item.id),
                          label: item.name,
                        })),
                      ]}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block font-inter text-sm text-umami-gray">
                      Способ приготовления
                    </span>
                    <CustomSelect
                      value={recipeForm.cooking_id ? String(recipeForm.cooking_id) : ""}
                      onChange={(nextValue) =>
                        setRecipeForm({
                          ...recipeForm,
                          cooking_id: nextValue ? Number(nextValue) : null,
                        })
                      }
                      options={[
                        { value: "", label: "Не выбрано", muted: true },
                        ...cookings.map((item) => ({
                          value: String(item.id),
                          label: item.name,
                        })),
                      ]}
                    />
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
                  <div className="space-y-2">
                    {recipeForm.ingredients.map((item, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 gap-2 rounded-2xl border border-[#efefef] bg-[#faf9f6] p-3 sm:grid-cols-2 lg:grid-cols-4"
                        >
                          <div className="relative">
                            <input
                              type="text"
                              value={item.ingredient_name}
                              onFocus={() => setFocusedIngredientIndex(index)}
                              onBlur={() => {
                                setTimeout(() => {
                                  setFocusedIngredientIndex((current) => current === index ? null : current);
                                }, 250);
                              }}
                              onChange={(e) =>
                                setIngredient(index, {
                                  ingredient_id: null,
                                  ingredient_name: e.target.value,
                                })
                              }
                              placeholder="Ингредиент..."
                              className="w-full rounded-full border border-umami-light-gray px-4 py-2 text-sm outline-none focus:border-umami-orange/60"
                            />
                            {focusedIngredientIndex === index && (
                              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-umami-light-gray bg-white shadow-lg">
                                {ingredientsCatalog
                                  .filter((ing) =>
                                    (ing.name || "")
                                      .toLowerCase()
                                      .includes((item.ingredient_name || "").toLowerCase())
                                  )
                                  .slice(0, 10)
                                  .map((ing) => (
                                    <button
                                      key={ing.id}
                                      type="button"
                                      onMouseDown={() => {
                                        handleIngredientSelect(index, String(ing.id));
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-[#faf9f6] transition-colors"
                                    >
                                      {ing.name}
                                    </button>
                                  ))}
                                {ingredientsCatalog.filter((ing) =>
                                  (ing.name || "")
                                    .toLowerCase()
                                    .includes((item.ingredient_name || "").toLowerCase())
                                ).length === 0 && (
                                  <div className="px-4 py-2 text-xs text-umami-gray">
                                    Свой ингредиент (сохранится)
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
                              setIngredient(index, {
                                quantity: val === "" ? "" : (val as unknown as number),
                              });
                            }}
                            placeholder="Кол-во"
                            className="rounded-full border border-umami-light-gray px-4 py-2 text-sm outline-none focus:border-umami-orange/60"
                          />
                          <CustomSelect
                            value={item.unit_of_measurement}
                            onChange={(nextValue) =>
                              setIngredient(index, {
                                unit_of_measurement: nextValue,
                              })
                            }
                            options={[
                              { value: "", label: "Ед. изм.", muted: true },
                              ...units.map((unit) => ({
                                value: unit.short_name || unit.name,
                                label: `${unit.name} (${unit.short_name || unit.name})`,
                              })),
                              ...(item.unit_of_measurement &&
                              !units.some(
                                (unit) =>
                                  (unit.short_name || unit.name) ===
                                  item.unit_of_measurement
                              )
                                ? [
                                    {
                                      value: item.unit_of_measurement,
                                      label: item.unit_of_measurement,
                                    },
                                  ]
                                : []),
                            ]}
                          />
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

                  <div className="col-span-2 mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-inter text-sm text-umami-gray">
                      Видимость рецепта:
                    </span>
                    {!recipeForm.parsed_from_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          setRecipeForm({ ...recipeForm, is_private: false })
                        }
                        className={`rounded-full px-3 py-1 font-nunito text-xs sm:px-4 sm:py-1.5 sm:text-sm ${
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
                      className={`rounded-full px-3 py-1 font-nunito text-xs sm:px-4 sm:py-1.5 sm:text-sm ${
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
                  {recipeForm.parsed_from_url ? (
                    <p className="col-span-2 mt-1 font-inter text-xs text-umami-gray">
                      Для скопированного рецепта и рецепта от микро-шефа видимость изменить нельзя
                    </p>
                  ) : null}
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
      <FollowUsersModal
        type={followModalType}
        users={followModalUsers}
        loading={followModalLoading}
        onClose={() => setFollowModalType(null)}
      />
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[420px] items-center justify-center"><p className="font-nunito text-sm text-umami-gray">Загрузка...</p></div>}>
      <ProfilePageContent />
    </Suspense>
  );
}









