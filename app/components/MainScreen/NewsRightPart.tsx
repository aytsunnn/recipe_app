"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { authService, User } from "../../services/authService";
import { favoriteService } from "../../services/favoriteService";
import { followService } from "../../services/followService";
import { Recipe, recipeService } from "../../services/recipeService";
import { aiService } from "../../services/aiService";
import { useUiFeedback } from "../UiFeedbackProvider";
import { getUserFriendlyErrorMessage } from "../../utils/errorUtils";
import MicrochefLauncherCard from "./MicrochefLauncherCard";
import PopularAuthorsCard from "./PopularAuthorsCard";
import MicrochefChatModal from "./MicrochefChatModal";

type RecipeDraft = {
  title: string;
  description: string;
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
  ingredients: Array<{
    name: string;
    quantity?: string;
    unit?: string;
  }>;
  steps: Array<{
    step_number?: number;
    description: string;
  }>;
};

interface PopularAuthor {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  recipesCount: number;
  likesCount: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  recipeDraft?: RecipeDraft;
  recipeCard?: Recipe;
}

const MICROCHEF_CACHE_KEY = "microchef_chat_cache_v1";
const MICROCHEF_OPEN_KEY = "microchef_open_from_burger";
const MAX_CACHED_MESSAGES = 80;
const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Привет! Я микро-шеф. Напишите продукты через запятую, и я придумаю рецепт.",
};

const toDifficultyValue = (value?: string): string => {
  if (!value) return "1";
  const lowered = value.toLowerCase();
  if (lowered.includes("лег")) return "1";
  if (lowered.includes("сред")) return "3";
  if (lowered.includes("слож")) return "5";
  if (["1", "2", "3", "4", "5"].includes(value)) return value;
  return "1";
};

const getSafeImageUrl = (url: string | null) => {
  if (!url || url === "null" || url === "undefined") return "/avatar.jpg";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/")
  )
    return url;
  return `/${url}`;
};

const toRecipeDraft = (value: unknown): RecipeDraft | null => {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  const source = (
    root.suggestion && typeof root.suggestion === "object"
      ? root.suggestion
      : root.recipe && typeof root.recipe === "object"
      ? root.recipe
      : root
  ) as Record<string, unknown>;

  const title = typeof source.title === "string" ? source.title.trim() : "";
  const description =
    typeof source.description === "string" ? source.description.trim() : "";
  if (!title || !description) return null;

  const readNumber = (raw: unknown): number | undefined => {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const parsed = Number(raw.replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  };

  const readText = (raw: unknown): string | undefined => {
    if (typeof raw !== "string") return undefined;
    const text = raw.trim();
    return text.length > 0 ? text : undefined;
  };

  const normalizeIngredients = (
    input: unknown
  ): Array<{ name: string; quantity?: string; unit?: string }> => {
    if (!Array.isArray(input)) return [];

    return input
      .map((item) => {
        if (typeof item === "string") {
          const name = item.trim();
          return name ? { name } : null;
        }
        if (!item || typeof item !== "object") return null;

        const row = item as Record<string, unknown>;
        const name = readText(row.name);
        if (!name) return null;

        const quantityRaw = row.quantity;
        const unitRaw = row.unit ?? row.unit_of_measurement ?? row.measure;
        const quantity =
          typeof quantityRaw === "number"
            ? String(quantityRaw)
            : readText(quantityRaw);
        const unit = readText(unitRaw);

        return { name, quantity, unit };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  };

  const normalizeSteps = (
    input: unknown
  ): Array<{ step_number?: number; description: string }> => {
    if (!Array.isArray(input)) return [];

    return input
      .map((item, index) => {
        if (typeof item === "string") {
          const description = item.trim();
          return description ? { step_number: index + 1, description } : null;
        }
        if (!item || typeof item !== "object") return null;

        const row = item as Record<string, unknown>;
        const description = readText(row.description);
        if (!description) return null;

        const step_number = readNumber(row.step_number);
        return { step_number, description };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  };

  return {
    title,
    description,
    difficulty: readText(source.difficulty),
    portion: readNumber(source.portion),
    cooking_time: readNumber(source.cooking_time),
    calorific: readNumber(source.calorific),
    proteins: readNumber(source.proteins),
    fats: readNumber(source.fats),
    carbohydrates: readNumber(source.carbohydrates),
    kitchen:
      readText((source.Kitchen as Record<string, unknown> | undefined)?.name) ??
      readText(source.kitchen),
    celebration:
      readText(
        (source.Celebration as Record<string, unknown> | undefined)?.name
      ) ?? readText(source.celebration),
    cookingType:
      readText(
        (source.TypeCooking as Record<string, unknown> | undefined)?.name
      ) ?? readText(source.cooking_type),
    ingredients: normalizeIngredients(source.ingredients),
    steps: normalizeSteps(source.steps),
  };
};

const toRecipeCard = (value: unknown): Recipe | null => {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  const source = (
    root.suggestion && typeof root.suggestion === "object"
      ? root.suggestion
      : root.recipe && typeof root.recipe === "object"
      ? root.recipe
      : root
  ) as Record<string, unknown>;

  const title = typeof source.title === "string" ? source.title : "";
  const description =
    typeof source.description === "string" ? source.description : "";
  if (!title || !description) {
    return null;
  }
  const id =
    typeof source.id === "string"
      ? source.id
      : `ai-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const userId =
    typeof source.user_id === "string" ? source.user_id : "ai-assistant-user";

  const userRaw =
    source.User && typeof source.User === "object"
      ? (source.User as Record<string, unknown>)
      : null;

  return {
    id,
    user_id: userId,
    title,
    description,
    difficulty:
      typeof source.difficulty === "string" ? source.difficulty : "без уровня",
    image_url: typeof source.image_url === "string" ? source.image_url : null,
    is_private: Boolean(source.is_private),
    kitchen_id:
      typeof source.kitchen_id === "string" ? source.kitchen_id : null,
    celebration_id:
      typeof source.celebration_id === "string" ? source.celebration_id : null,
    cooking_id:
      typeof source.cooking_id === "string" ? source.cooking_id : null,
    portion: typeof source.portion === "number" ? source.portion : 1,
    calorific: typeof source.calorific === "number" ? source.calorific : null,
    cooking_time:
      typeof source.cooking_time === "number" ? source.cooking_time : 0,
    createdAt:
      typeof source.createdAt === "string"
        ? source.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof source.updatedAt === "string"
        ? source.updatedAt
        : new Date().toISOString(),
    User: {
      id: userRaw && typeof userRaw.id === "string" ? userRaw.id : userId,
      username:
        userRaw && typeof userRaw.username === "string"
          ? userRaw.username
          : "micro-chef",
      name:
        userRaw && typeof userRaw.name === "string"
          ? userRaw.name
          : "Микро-шеф",
      avatar_url:
        userRaw && typeof userRaw.avatar_url === "string"
          ? userRaw.avatar_url
          : null,
    },
    Kitchen: null,
    Likes: Array.isArray(source.Likes)
      ? (source.Likes as Array<{ id: string; user_id: string }>)
      : [],
    Comments: Array.isArray(source.Comments)
      ? (source.Comments as Array<{ id: string }>)
      : [],
    Categories: Array.isArray(source.Categories) ? source.Categories : [],
    _count:
      source._count && typeof source._count === "object"
        ? (source._count as { Likes: number; Comments: number })
        : undefined,
  };
};

const summarizeAiResponse = (value: unknown): string => {
  if (!value)
    return "Пока не удалось получить ответ. Попробуйте уточнить запрос.";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const asRecord = value as Record<string, unknown>;
    if (typeof asRecord.text === "string") return asRecord.text;
    if (typeof asRecord.message === "string") return asRecord.message;
  }
  return "Рецепт сгенерирован. Откройте карточку ниже.";
};

export default function RightPart() {
  const { toast } = useUiFeedback();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [popularAuthors, setPopularAuthors] = useState<PopularAuthor[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(true);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);
  const [expandedDraftIds, setExpandedDraftIds] = useState<Set<string>>(
    new Set()
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    DEFAULT_WELCOME_MESSAGE,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(MICROCHEF_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        messages?: ChatMessage[];
        expandedDraftIds?: string[];
      };

      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        const normalized = parsed.messages.filter(
          (message): message is ChatMessage =>
            Boolean(
              message &&
                typeof message === "object" &&
                typeof message.id === "string" &&
                (message.role === "user" || message.role === "assistant")
            )
        );
        Promise.resolve().then(() => {
          setMessages(
            normalized.length > 0 ? normalized : [DEFAULT_WELCOME_MESSAGE]
          );
        });
      }

      if (Array.isArray(parsed.expandedDraftIds)) {
        Promise.resolve().then(() => {
          setExpandedDraftIds(
            new Set(
              parsed.expandedDraftIds.filter(
                (id): id is string => typeof id === "string" && id.length > 0
              )
            )
          );
        });
      }
    } catch (error) {
      console.error("Ошибка чтения кэша чата микро-шефа:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const trimmedMessages = messages.slice(-MAX_CACHED_MESSAGES);
      const payload = JSON.stringify({
        messages: trimmedMessages,
        expandedDraftIds: Array.from(expandedDraftIds),
      });
      window.sessionStorage.setItem(MICROCHEF_CACHE_KEY, payload);
    } catch (error) {
      console.error("Ошибка сохранения кэша чата микро-шефа:", error);
    }
  }, [messages, expandedDraftIds]);

  useEffect(() => {
    const syncAuth = async () => {
      const auth = authService.isAuthenticated();
      setIsAuthenticated(auth);
      if (!auth) {
        setCurrentUser(null);
        setFollowingIds(new Set());
        return;
      }
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      if (!user) return;
      try {
        const following = await followService.getFollowing(user.id);
        setFollowingIds(new Set(following.map((item) => item.id)));
      } catch (error) {
        console.error("Ошибка загрузки подписок:", error);
      }
    };

    syncAuth();
    window.addEventListener("auth-change", syncAuth);
    return () => window.removeEventListener("auth-change", syncAuth);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const isAnyModalOpen = isChatOpen;
    if (!isAnyModalOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [isChatOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const openFromBurgerIfNeeded = () => {
      const shouldOpen = window.sessionStorage.getItem(MICROCHEF_OPEN_KEY);
      const searchParams = new URLSearchParams(window.location.search);
      const fromQuery = searchParams.get("microchef") === "1";

      if (shouldOpen === "1" || fromQuery) {
        window.sessionStorage.removeItem(MICROCHEF_OPEN_KEY);
        if (fromQuery) {
          searchParams.delete("microchef");
          const nextQuery = searchParams.toString();
          const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
          window.history.replaceState(null, "", nextUrl);
        }
        setIsChatOpen(true);
      }
    };

    openFromBurgerIfNeeded();
    window.addEventListener("microchef-open-request", openFromBurgerIfNeeded);
    return () =>
      window.removeEventListener(
        "microchef-open-request",
        openFromBurgerIfNeeded
      );
  }, []);

  useEffect(() => {
    const loadPopularAuthors = async () => {
      try {
        setIsLoadingAuthors(true);
        const recipes = await recipeService.getAll({ limit: 60 });
        const byAuthor = new Map<string, PopularAuthor>();

        recipes.forEach((recipe: Recipe) => {
          if (!recipe.User?.id) return;
          const existing = byAuthor.get(recipe.User.id);
          const likesCount = recipe._count?.Likes ?? recipe.Likes?.length ?? 0;
          if (existing) {
            existing.recipesCount += 1;
            existing.likesCount += likesCount;
            return;
          }
          byAuthor.set(recipe.User.id, {
            id: recipe.User.id,
            name: recipe.User.name,
            username: recipe.User.username,
            avatar_url: recipe.User.avatar_url,
            recipesCount: 1,
            likesCount,
          });
        });

        const sorted = Array.from(byAuthor.values())
          .sort(
            (a, b) =>
              b.likesCount + b.recipesCount - (a.likesCount + a.recipesCount)
          )
          .slice(0, 5);

        setPopularAuthors(sorted);
      } catch (error) {
        console.error("Ошибка загрузки популярных авторов:", error);
      } finally {
        setIsLoadingAuthors(false);
      }
    };

    loadPopularAuthors();
  }, []);

  const canSend = useMemo(
    () => chatInput.trim().length > 0 && !chatLoading,
    [chatInput, chatLoading]
  );

  const handleToggleFollow = async (authorId: string) => {
    if (!isAuthenticated || !currentUser) return;
    const wasFollowing = followingIds.has(authorId);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(authorId);
      else next.add(authorId);
      return next;
    });

    try {
      if (wasFollowing) await followService.unfollow(authorId);
      else await followService.follow(authorId);
    } catch (error) {
      console.error("Ошибка обновления подписки:", error);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(authorId);
        else next.delete(authorId);
        return next;
      });
    }
  };

  const handleSaveAiRecipeToFavorites = async (title: string) => {
    try {
      const recipes = await recipeService.getAll({ search: title, limit: 1 });
      const first = recipes[0];
      if (!first) {
        toast(
          "Рецепт не найден в базе. Сначала сохраните его как обычный рецепт.",
          "error"
        );
        return;
      }
      await favoriteService.addToFavorites(first.id);
      toast("Рецепт добавлен в избранное", "success");
    } catch (error) {
      console.error("Ошибка при добавлении ИИ-рецепта в избранное:", error);
      toast("Не удалось добавить в избранное", "error");
    }
  };

  const handleSaveDraftAsPrivateRecipe = async (
    messageId: string,
    draft: RecipeDraft
  ) => {
    try {
      setSavingDraftId(messageId);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "microchef_recipe_prefill",
          JSON.stringify({
            title: draft.title,
            description: draft.description,
            difficulty: toDifficultyValue(draft.difficulty),
            portion: draft.portion ?? 1,
            cooking_time: draft.cooking_time ?? 30,
            calorific: draft.calorific ?? 0,
            proteins: draft.proteins ?? 0,
            fats: draft.fats ?? 0,
            carbohydrates: draft.carbohydrates ?? 0,
            kitchen: draft.kitchen ?? "",
            celebration: draft.celebration ?? "",
            cookingType: draft.cookingType ?? "",
            ingredients: draft.ingredients,
            steps: draft.steps,
            is_private: true,
            parsed_from_url: true,
            is_parsed: true,
          })
        );
      }
      setIsChatOpen(false);
      router.push("/profile?create=1&source=microchef");
    } catch (error) {
      console.error("Ошибка подготовки рецепта из микро-шефа:", error);
      toast("Не удалось открыть форму создания рецепта", "error");
    } finally {
      setSavingDraftId(null);
    }
  };

  const handleSendMessage = async () => {
    const userText = chatInput.trim();
    if (!userText) return;

    setChatInput("");
    if (chatInputRef.current) {
      chatInputRef.current.style.height = "38px";
    }
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: userText },
    ]);
    setChatLoading(true);

    try {
      const products = userText
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20);

      const response = await aiService.generateByProducts([
        products.length > 0 ? products.join(", ") : userText,
      ]);
      const recipeDraft = toRecipeDraft(response);
      const recipeCard = toRecipeCard(response);

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text:
            recipeDraft || recipeCard
              ? undefined
              : summarizeAiResponse(response),
          recipeDraft,
          recipeCard,
        },
      ]);
    } catch (error) {
      console.error("Ошибка чата микро-шефа:", error);
      const rawErrorText = getUserFriendlyErrorMessage(error, "");
      const normalizedErrorText = rawErrorText.toLowerCase();
      const isChefBusyError =
        normalizedErrorText.includes("api error (500)") ||
        normalizedErrorText.includes("ошибка генерации") ||
        normalizedErrorText.includes('"message":"ошибка генерации"');
      const errorText = isChefBusyError
        ? "Шеф сейчас занят, попробуйте позже."
        : rawErrorText ||
          "Не получилось получить ответ. Попробуйте еще раз через пару секунд.";
      setMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: "assistant",
          text: errorText,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      <div className="hidden lg:flex w-full flex-col gap-4">
        <MicrochefLauncherCard
          isVisible={isAuthenticated}
          onOpen={() => setIsChatOpen(true)}
        />

        <PopularAuthorsCard
          isLoading={isLoadingAuthors}
          authors={popularAuthors}
          currentUserId={currentUser?.id}
          isAuthenticated={isAuthenticated}
          followingIds={followingIds}
          getSafeImageUrl={getSafeImageUrl}
          onToggleFollow={(authorId) => {
            void handleToggleFollow(authorId);
          }}
        />
      </div>

      <MicrochefChatModal
        isOpen={isChatOpen}
        messages={messages}
        chatLoading={chatLoading}
        savingDraftId={savingDraftId}
        expandedDraftIds={expandedDraftIds}
        chatInputRef={chatInputRef}
        chatInput={chatInput}
        canSend={canSend}
        onClose={() => setIsChatOpen(false)}
        onSaveDraft={(messageId, draft) => {
          void handleSaveDraftAsPrivateRecipe(messageId, draft);
        }}
        onToggleExpanded={(messageId) =>
          setExpandedDraftIds((prev) => {
            const next = new Set(prev);
            if (next.has(messageId)) next.delete(messageId);
            else next.add(messageId);
            return next;
          })
        }
        onInputChange={setChatInput}
        onSend={() => {
          void handleSendMessage();
        }}
      />
    </>
  );
}
