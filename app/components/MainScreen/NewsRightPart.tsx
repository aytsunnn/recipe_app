"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { authService, User } from "../../services/authService";
import { favoriteService } from "../../services/favoriteService";
import { followService } from "../../services/followService";
import { Recipe, recipeService } from "../../services/recipeService";
import { aiService } from "../../services/aiService";

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
        setMessages(
          normalized.length > 0 ? normalized : [DEFAULT_WELCOME_MESSAGE]
        );
      }

      if (Array.isArray(parsed.expandedDraftIds)) {
        setExpandedDraftIds(
          new Set(
            parsed.expandedDraftIds.filter(
              (id): id is string => typeof id === "string" && id.length > 0
            )
          )
        );
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
        alert(
          "Рецепт не найден в базе. Сначала сохраните его как обычный рецепт."
        );
        return;
      }
      await favoriteService.addToFavorites(first.id);
      alert("Рецепт добавлен в избранное");
    } catch (error) {
      console.error("Ошибка при добавлении ИИ-рецепта в избранное:", error);
      alert("Не удалось добавить в избранное");
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
          })
        );
      }
      setIsChatOpen(false);
      router.push("/profile?create=1&source=microchef");
    } catch (error) {
      console.error("Ошибка подготовки рецепта из микро-шефа:", error);
      alert("Не удалось открыть форму создания рецепта");
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
      const rawErrorText =
        error instanceof Error && error.message ? error.message : "";
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
      <div className="flex w-full flex-col gap-4">
        {isAuthenticated && (
          <div className="rounded-[15px] border border-[#eaeaea] bg-white p-3">
            <p className="font-nunito text-base font-bold text-umami-dark-gray">
              Микро-шеф
            </p>
            <p className="mt-1 font-inter text-sm text-umami-gray">
              Подскажет рецепт по вашим продуктам.
            </p>
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="mt-3 w-full rounded-full bg-umami-orange px-3 py-2 font-nunito text-sm font-bold text-white hover:bg-[#dd8c45]"
            >
              Открыть чат
            </button>
          </div>
        )}

        <div className="rounded-[15px] border border-[#eaeaea] bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-nunito text-base font-bold text-umami-dark-gray">
              Популярные авторы
            </p>
          </div>

          {isLoadingAuthors ? (
            <p className="py-3 text-sm text-umami-gray">Загрузка...</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {popularAuthors.map((author) => {
                const isOwn = currentUser?.id === author.id;
                const isFollowing = followingIds.has(author.id);
                return (
                  <Link
                    key={author.id}
                    href={`/users/${author.id}`}
                    className="rounded-[10px] border border-[#ececec] p-2.5 transition-colors hover:bg-[#fcfaf5]"
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={getSafeImageUrl(author.avatar_url)}
                        width={36}
                        height={36}
                        alt={author.name}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-nunito text-sm font-bold text-umami-dark-gray">
                          {author.name}
                        </p>
                        <p className="truncate font-inter text-xs text-umami-gray">
                          @{author.username}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 font-inter text-xs text-umami-gray">
                      {author.recipesCount} рецептов • {author.likesCount}{" "}
                      лайков
                    </p>
                    {isAuthenticated && !isOwn && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          void handleToggleFollow(author.id);
                        }}
                        className={`mt-2 w-full rounded-full px-3 py-1.5 font-nunito text-xs font-bold ${
                          isFollowing
                            ? "bg-[#f1ebdb] text-umami-dark-gray"
                            : "bg-umami-green text-white"
                        }`}
                      >
                        {isFollowing ? "Вы подписаны" : "Подписаться"}
                      </button>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isChatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={() => setIsChatOpen(false)}
        >
          <div
            className="grid h-[80vh] w-full max-w-[1080px] grid-cols-[minmax(0,1fr)_320px] gap-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-full flex-col overflow-hidden rounded-[20px] border border-[#eaeaea] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-nunito text-xl font-bold text-umami-dark-gray">
                  Чат с микро-шефом
                </h3>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  aria-label="Закрыть чат"
                >
                  <Image src="/X.svg" alt="close" width={24} height={24} />
                </button>
              </div>

              <div className="modal-thin-scroll flex-1 space-y-2 overflow-y-auto rounded-2xl border border-[#efefef] bg-[#faf9f6] p-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${
                      message.role === "user" ? "ml-auto" : ""
                    } w-fit max-w-[85%]`}
                  >
                    {message.recipeCard || message.recipeDraft ? (
                      <div className="w-fit max-w-[560px] rounded-2xl border border-[#E9E1D2] bg-white p-4">
                        <div className="w-full text-left">
                          <p className="line-clamp-2 font-nunito text-lg font-bold text-umami-dark-gray">
                            {message.recipeDraft?.title ||
                              message.recipeCard?.title}
                          </p>
                          <p className="mt-1 line-clamp-3 text-sm text-umami-gray">
                            {message.recipeDraft?.description ||
                              message.recipeCard?.description}
                          </p>
                          <p className="mt-2 text-xs text-umami-gray">
                            {message.recipeDraft?.portion ??
                            message.recipeCard?.portion
                              ? `${
                                  message.recipeDraft?.portion ??
                                  message.recipeCard?.portion
                                } порц. • `
                              : ""}
                            {message.recipeDraft?.cooking_time ??
                            message.recipeCard?.cooking_time
                              ? `${
                                  message.recipeDraft?.cooking_time ??
                                  message.recipeCard?.cooking_time
                                } мин • `
                              : ""}
                            {message.recipeDraft?.difficulty ||
                              message.recipeCard?.difficulty ||
                              "без уровня"}
                          </p>
                        </div>

                        <div className="mt-3 flex gap-2">
                          {message.recipeDraft ? (
                            <button
                              type="button"
                              disabled={savingDraftId === message.id}
                              onClick={() =>
                                void handleSaveDraftAsPrivateRecipe(
                                  message.id,
                                  message.recipeDraft!
                                )
                              }
                              className="rounded-full bg-umami-green px-3 py-1.5 font-nunito text-xs font-bold text-white disabled:opacity-60"
                            >
                              {savingDraftId === message.id
                                ? "Сохраняем..."
                                : "Сохранить как приватный"}
                            </button>
                          ) : null}

                          {message.recipeDraft ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDraftIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(message.id))
                                    next.delete(message.id);
                                  else next.add(message.id);
                                  return next;
                                })
                              }
                              className="rounded-full bg-umami-orange px-3 py-1.5 font-nunito text-xs font-bold text-white"
                            >
                              {expandedDraftIds.has(message.id)
                                ? "Свернуть"
                                : "Подробнее"}
                            </button>
                          ) : null}
                        </div>

                        {message.recipeDraft &&
                        expandedDraftIds.has(message.id) ? (
                          <div className="mt-3 space-y-3 rounded-xl border border-[#E6D6BE] bg-[#FFF8EC] p-3">
                            <div className="grid grid-cols-2 gap-2 text-xs text-[#6A533A]">
                              {typeof message.recipeDraft.calorific ===
                              "number" ? (
                                <p>Калории: {message.recipeDraft.calorific}</p>
                              ) : null}
                              {typeof message.recipeDraft.proteins ===
                              "number" ? (
                                <p>Белки: {message.recipeDraft.proteins}</p>
                              ) : null}
                              {typeof message.recipeDraft.fats === "number" ? (
                                <p>Жиры: {message.recipeDraft.fats}</p>
                              ) : null}
                              {typeof message.recipeDraft.carbohydrates ===
                              "number" ? (
                                <p>
                                  Углеводы: {message.recipeDraft.carbohydrates}
                                </p>
                              ) : null}
                              {message.recipeDraft.kitchen ? (
                                <p>Кухня: {message.recipeDraft.kitchen}</p>
                              ) : null}
                              {message.recipeDraft.celebration ? (
                                <p>
                                  Праздник: {message.recipeDraft.celebration}
                                </p>
                              ) : null}
                              {message.recipeDraft.cookingType ? (
                                <p>Тип: {message.recipeDraft.cookingType}</p>
                              ) : null}
                            </div>

                            {message.recipeDraft.ingredients.length > 0 ? (
                              <div>
                                <p className="font-nunito text-xs font-bold uppercase tracking-wide text-[#9A846B]">
                                  Ингредиенты
                                </p>
                                <ul className="mt-1 list-disc pl-5 text-sm text-[#5E5142]">
                                  {message.recipeDraft.ingredients.map(
                                    (item, idx) => (
                                      <li
                                        key={`inline-ing-${message.id}-${idx}`}
                                      >
                                        {item.name}
                                        {item.quantity
                                          ? ` — ${item.quantity}`
                                          : ""}
                                        {item.unit ? ` ${item.unit}` : ""}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            ) : null}

                            {message.recipeDraft.steps.length > 0 ? (
                              <div>
                                <p className="font-nunito text-xs font-bold uppercase tracking-wide text-[#9A846B]">
                                  Шаги
                                </p>
                                <ol className="mt-1 list-decimal pl-5 text-sm text-[#5E5142]">
                                  {message.recipeDraft.steps.map(
                                    (item, idx) => (
                                      <li
                                        key={`inline-step-${message.id}-${idx}`}
                                      >
                                        {item.description}
                                      </li>
                                    )
                                  )}
                                </ol>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div
                        className={`inline-block max-w-full whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                          message.role === "user"
                            ? "bg-umami-orange text-white"
                            : "bg-white text-umami-dark-gray"
                        }`}
                      >
                        {message.text}
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="max-w-[85%] rounded-2xl bg-white px-3 py-2 text-sm text-umami-gray">
                    Микро-шеф думает...
                  </div>
                )}
              </div>

              <div className="mt-2.5 flex items-end gap-2">
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onInput={(event) => {
                    const target = event.currentTarget;
                    target.style.height = "0px";
                    const nextHeight = Math.min(target.scrollHeight, 136);
                    target.style.height = `${Math.max(nextHeight, 38)}px`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (canSend) {
                        void handleSendMessage();
                      }
                    }
                  }}
                  placeholder="Например: курица, рис, сливки, чеснок"
                  rows={1}
                  className="modal-thin-scroll max-h-34 min-h-9 flex-1 resize-none overflow-y-auto rounded-xl border border-[#E4DDCF] bg-[#FFFEFC] px-3 py-2 text-sm leading-5 outline-none transition-colors focus:border-[#D9C5A6]"
                />
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={handleSendMessage}
                  className="inline-flex h-9 items-center gap-1.5 self-end rounded-full bg-umami-green px-3 py-1.5 font-nunito text-xs font-bold text-white disabled:opacity-50"
                >
                  Отправить
                  <Image
                    src="/PaperPlane.svg"
                    alt="send"
                    width={16}
                    height={16}
                  />
                </button>
              </div>
            </div>

            <aside className="h-full rounded-[20px] border border-[#ECE5D8] bg-[#FFFCF7] p-4">
              <p className="font-nunito text-base font-bold text-[#4D3E2E]">
                Как спросить
              </p>
              <p className="mt-1 text-xs text-[#8B7A67]">
                Короткий формат запроса дает лучший результат.
              </p>

              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-[#EFE5D6] bg-white px-3 py-2">
                  <p className="font-nunito text-[11px] font-bold uppercase tracking-wide text-[#9A846B]">
                    Шаг 1
                  </p>
                  <p className="mt-1 text-sm text-[#5E5142]">
                    Продукты через запятую
                  </p>
                </div>

                <div className="rounded-xl border border-[#EFE5D6] bg-white px-3 py-2">
                  <p className="font-nunito text-[11px] font-bold uppercase tracking-wide text-[#9A846B]">
                    Шаг 2
                  </p>
                  <p className="mt-1 text-sm text-[#5E5142]">
                    Добавьте условия, если нужно
                  </p>
                </div>

                <div className="rounded-xl border border-[#E6D6BE] bg-[#FFF5E7] px-3 py-2">
                  <p className="font-nunito text-[11px] font-bold uppercase tracking-wide text-[#B07534]">
                    Пример
                  </p>
                  <p className="mt-1 text-sm text-[#6A533A]">
                    курица, рис, томаты, без сахара, на 2 порции
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
