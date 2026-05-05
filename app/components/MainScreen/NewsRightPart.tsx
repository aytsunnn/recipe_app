"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  ingredients: string[];
  steps: string[];
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
}

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
    root.recipe && typeof root.recipe === "object" ? root.recipe : root
  ) as Record<string, unknown>;

  const title = typeof source.title === "string" ? source.title.trim() : "";
  const description =
    typeof source.description === "string" ? source.description.trim() : "";
  if (!title || !description) return null;

  const normalizeStringArray = (input: unknown): string[] => {
    if (!Array.isArray(input)) return [];
    return input
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          if (typeof row.description === "string")
            return row.description.trim();
          if (typeof row.name === "string") return row.name.trim();
        }
        return "";
      })
      .filter(Boolean);
  };

  return {
    title,
    description,
    difficulty:
      typeof source.difficulty === "string" ? source.difficulty : undefined,
    portion: typeof source.portion === "number" ? source.portion : undefined,
    cooking_time:
      typeof source.cooking_time === "number" ? source.cooking_time : undefined,
    calorific:
      typeof source.calorific === "number" ? source.calorific : undefined,
    ingredients: normalizeStringArray(source.ingredients),
    steps: normalizeStringArray(source.steps),
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [popularAuthors, setPopularAuthors] = useState<PopularAuthor[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(true);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Привет! Я микро-шеф. Напишите продукты через запятую, и я придумаю рецепт.",
    },
  ]);

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

  const handleSendMessage = async () => {
    const userText = chatInput.trim();
    if (!userText) return;

    setChatInput("");
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

      const response = await aiService.generateByProducts(
        products.length > 0 ? products : [userText]
      );
      const recipeDraft = toRecipeDraft(response);

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: recipeDraft ? undefined : summarizeAiResponse(response),
          recipeDraft,
        },
      ]);
    } catch (error) {
      console.error("Ошибка чата микро-шефа:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: "assistant",
          text: "Не получилось получить ответ. Попробуйте еще раз через пару секунд.",
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10">
          <div className="grid h-[80vh] w-full max-w-[1080px] grid-cols-[minmax(0,1fr)_320px] gap-5">
            <div className="flex h-full flex-col rounded-[20px] border border-[#eaeaea] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-nunito text-xl font-bold text-umami-dark-gray">
                  Чат с микро-шефом
                </h3>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="rounded-full bg-umami-gray px-3 py-1 font-nunito text-xs text-white"
                >
                  Закрыть
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-[#efefef] bg-[#faf9f6] p-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${
                      message.role === "user" ? "ml-auto" : ""
                    } max-w-[85%]`}
                  >
                    {message.recipeDraft ? (
                      <div className="rounded-2xl border border-[#e9e3d3] bg-white px-3 py-3 text-umami-dark-gray">
                        <p className="font-nunito text-lg font-bold">
                          {message.recipeDraft.title}
                        </p>
                        <p className="mt-1 text-sm text-umami-gray">
                          {message.recipeDraft.description}
                        </p>
                        <p className="mt-2 text-xs text-umami-gray">
                          {message.recipeDraft.portion
                            ? `${message.recipeDraft.portion} порц. • `
                            : ""}
                          {message.recipeDraft.cooking_time
                            ? `${message.recipeDraft.cooking_time} мин • `
                            : ""}
                          {message.recipeDraft.difficulty || "без уровня"}
                        </p>
                        {message.recipeDraft.ingredients.length > 0 && (
                          <div className="mt-3">
                            <p className="font-nunito text-sm font-bold">
                              Ингредиенты
                            </p>
                            <ul className="mt-1 list-disc pl-4 text-sm">
                              {message.recipeDraft.ingredients
                                .slice(0, 6)
                                .map((item, idx) => (
                                  <li key={`${message.id}-ing-${idx}`}>
                                    {item}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                        {message.recipeDraft.steps.length > 0 && (
                          <div className="mt-3">
                            <p className="font-nunito text-sm font-bold">
                              Шаги
                            </p>
                            <ol className="mt-1 list-decimal pl-4 text-sm">
                              {message.recipeDraft.steps
                                .slice(0, 4)
                                .map((item, idx) => (
                                  <li key={`${message.id}-step-${idx}`}>
                                    {item}
                                  </li>
                                ))}
                            </ol>
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleSaveAiRecipeToFavorites(
                                message.recipeDraft!.title
                              )
                            }
                            className="rounded-full bg-umami-orange px-3 py-1.5 font-nunito text-xs font-bold text-white"
                          >
                            Сохранить в избранное
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
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

              <div className="mt-3 flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Например: курица, рис, сливки, чеснок"
                  className="h-20 flex-1 resize-none rounded-2xl border border-umami-light-gray px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={handleSendMessage}
                  className="h-fit self-end rounded-full bg-umami-green px-4 py-2 font-nunito text-sm font-bold text-white disabled:opacity-50"
                >
                  Отправить
                </button>
              </div>
            </div>

            <aside className="h-full rounded-[20px] border border-[#eaeaea] bg-white p-4">
              <p className="font-nunito text-base font-bold text-umami-dark-gray">
                Как спросить
              </p>
              <ul className="mt-2 space-y-1 text-sm text-umami-gray">
                <li>Продукты через запятую.</li>
                <li>Можно добавить ограничения.</li>
                <li>Например: без сахара, острое, на 2 порции.</li>
              </ul>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
