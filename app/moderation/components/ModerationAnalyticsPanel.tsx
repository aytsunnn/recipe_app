"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AdminAnalyticsResponse, moderationService } from "../../services/moderationService";
import { recipeService } from "../../services/recipeService";
import { normalizeImageUrl } from "../../utils/imageUrl";

type ChartPoint = { label: string; value: number };

type TopItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  count: number;
  href: string;
};

const toNumber = (value: unknown): number | null => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const prettify = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());

const titleRu = (key: string): string => {
  const normalized = key.toLowerCase();
  if (normalized === "reportsbystatus") return "Статусы жалоб";
  const map: Array<[string, string]> = [
    ["registr", "Регистрации"],
    ["recipe", "Рецепты"],
    ["categor", "Категории"],
    ["kitchen", "Кухни"],
    ["celebr", "Праздники"],
    ["cook", "Способы приготовления"],
    ["like", "Лайки"],
    ["comment", "Комментарии"],
    ["view", "Просмотры"],
    ["follow", "Подписки"],
    ["subscr", "Подписки"],
    ["user", "Пользователи"],
    ["author", "Авторы"],
    ["rating", "Рейтинг"],
    ["review", "Отзывы"],
    ["daily", "По дням"],
    ["weekly", "По неделям"],
    ["monthly", "По месяцам"],
    ["growth", "Рост"],
    ["count", "Количество"],
    ["total", "Итого"],
    ["top", "Топ"],
  ];

  for (const [needle, title] of map) {
    if (normalized.includes(needle)) return title;
  }

  return prettify(key);
};

const extractChart = (name: string, value: unknown): ChartPoint[] => {
  if (!Array.isArray(value)) return [];
  const points: ChartPoint[] = [];

  value.forEach((item, idx) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const entries = Object.entries(row);

    const numericEntry = entries.find(([, v]) => toNumber(v) !== null);
    if (!numericEntry) return;

    const numeric = toNumber(numericEntry[1]);
    if (numeric === null) return;

    const labelEntry =
      entries.find(([k, v]) => typeof v === "string" && k !== numericEntry[0]) ||
      entries.find(([k]) =>
        ["day", "date", "name", "label", "category", "username", "month"].includes(
          k.toLowerCase()
        )
      );

    const label =
      (labelEntry?.[1] as string | undefined) ||
      (row.id !== undefined ? String(row.id) : `${titleRu(name)} ${idx + 1}`);

    points.push({ label, value: numeric });
  });

  return points;
};

const pickArrayByKeywords = (data: AdminAnalyticsResponse, keywords: string[]): unknown[] | null => {
  const entry = Object.entries(data).find(([key, value]) => {
    if (!Array.isArray(value)) return false;
    const lower = key.toLowerCase();
    return keywords.some((needle) => lower.includes(needle));
  });
  return entry ? (entry[1] as unknown[]) : null;
};

const extractTopRecipes = (data: AdminAnalyticsResponse): TopItem[] => {
  const arr = pickArrayByKeywords(data, ["top_recipe", "toprecipes", "recipes_top", "popular_recipe", "top_recipe"]);
  if (!arr) return [];

  return arr
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const recipeNode = (row.Recipe ||
        row.recipe ||
        row.Post ||
        row.post) as Record<string, unknown> | undefined;
      const count =
        toNumber(row.count) ?? toNumber(row.likes_count) ?? toNumber(row.views_count) ?? toNumber(row.total) ?? 0;
      const idRaw = row.recipe_id ?? row.id ?? recipeNode?.id;
      if (idRaw === undefined || idRaw === null) return null;
      const title =
        (row.title as string | undefined) ||
        (recipeNode?.title as string | undefined) ||
        `Рецепт #${idRaw}`;
      const image =
        (row.image_url as string | null | undefined) ||
        (recipeNode?.image_url as string | null | undefined) ||
        (row.image as string | null | undefined) ||
        (row.photo as string | null | undefined) ||
        (row.photo_url as string | null | undefined) ||
        (row.preview as string | null | undefined) ||
        (recipeNode?.image as string | null | undefined) ||
        (recipeNode?.photo as string | null | undefined) ||
        (recipeNode?.photo_url as string | null | undefined) ||
        (recipeNode?.preview as string | null | undefined) ||
        null;

      return {
        id: String(idRaw),
        title,
        imageUrl: image || null,
        count,
        href: `/recipes/${idRaw}?from=moderation`,
      };
    })
    .filter(Boolean)
    .map((i) => i as TopItem)
    .slice(0, 10);
};

const extractTopUsers = (data: AdminAnalyticsResponse): TopItem[] => {
  const arr = pickArrayByKeywords(data, ["top_user", "topusers", "users_top", "popular_user"]);
  if (!arr) return [];

  return arr
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const userNode = (row.User ||
        row.user ||
        row.Author ||
        row.author ||
        row.Profile ||
        row.profile) as Record<string, unknown> | undefined;
      const count =
        toNumber(row.count) ?? toNumber(row.followers_count) ?? toNumber(row.likes_count) ?? toNumber(row.total) ?? 0;
      const idRaw = row.user_id ?? row.id ?? userNode?.id;
      if (idRaw === undefined || idRaw === null) return null;
      const name =
        (row.name as string | undefined) ||
        (userNode?.name as string | undefined) ||
        `user_${idRaw}`;
      const image =
        (row.avatar_url as string | null | undefined) ||
        (userNode?.avatar_url as string | null | undefined) ||
        (row.avatar as string | null | undefined) ||
        (row.avatarUrl as string | null | undefined) ||
        (row.photo as string | null | undefined) ||
        (row.photo_url as string | null | undefined) ||
        (row.image_url as string | null | undefined) ||
        (userNode?.avatar as string | null | undefined) ||
        (userNode?.avatarUrl as string | null | undefined) ||
        (userNode?.photo as string | null | undefined) ||
        (userNode?.photo_url as string | null | undefined) ||
        (userNode?.image_url as string | null | undefined) ||
        null;

      return {
        id: String(idRaw),
        title: name,
        imageUrl: image || null,
        count,
        href: `/users/${idRaw}`,
      };
    })
    .filter(Boolean)
    .map((i) => i as TopItem)
    .slice(0, 10);
};

function TopHorizontalList({ title, items }: { title: string; items: TopItem[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="rounded-xl border border-umami-light-gray/50 bg-white p-3">
      <h3 className="mb-3 font-nunito text-base font-bold text-umami-dark-gray">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-3 rounded-lg p-1 hover:bg-[#fcfbf8]"
          >
            <Image
              src={normalizeImageUrl(
                item.imageUrl,
                title.includes("рецептов") ? "/placeholder.jpg" : "/avatar.jpg"
              )}
              alt={item.title}
              width={44}
              height={44}
              className="h-11 w-11 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-umami-dark-gray">{item.title}</p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#f1ebdb]">
                <div
                  className="h-full bg-umami-orange"
                  style={{ width: `${Math.max((item.count / max) * 100, 2)}%` }}
                />
              </div>
            </div>
            <p className="w-12 text-right text-xs font-bold text-umami-dark-gray">{item.count}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPlot({ title, points, mode }: { title: string; points: ChartPoint[]; mode: "bar" | "line" }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const chartHeight = 220;
  const chartWidth = Math.max(640, points.length * 64);
  const step = chartWidth / Math.max(points.length, 1);
  const barWidth = Math.max(18, Math.min(42, step * 0.55));
  const linePath = points
    .map((point, index) => {
      const x = index * step + step / 2;
      const y = chartHeight - (point.value / max) * (chartHeight - 16);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-xl border border-umami-light-gray/50 bg-white p-3">
      <h3 className="mb-3 font-nunito text-base font-bold text-umami-dark-gray">{title}</h3>
      <div className="w-full overflow-x-auto">
        <svg width={chartWidth} height={280} role="img" aria-label={title}>
          <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#e6e0d2" />
          {[0.25, 0.5, 0.75, 1].map((k) => {
            const y = chartHeight - (chartHeight - 16) * k;
            return <line key={k} x1={0} y1={y} x2={chartWidth} y2={y} stroke="#f3efe6" />;
          })}

          {mode === "bar"
            ? points.map((point, index) => {
                const x = index * step + (step - barWidth) / 2;
                const h = (point.value / max) * (chartHeight - 16);
                const y = chartHeight - h;
                return (
                  <g key={`${point.label}-${index}`}>
                    <rect x={x} y={y} width={barWidth} height={h} fill="#f19a4b">
                      <title>{`${point.label}: ${point.value}`}</title>
                    </rect>
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 16}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#7f7f7f"
                    >
                      {point.label.slice(0, 12)}
                    </text>
                  </g>
                );
              })
            : (
                <>
                  <path d={linePath} fill="none" stroke="#f19a4b" strokeWidth={3} />
                  {points.map((point, index) => {
                    const x = index * step + step / 2;
                    const y = chartHeight - (point.value / max) * (chartHeight - 16);
                    return (
                      <g key={`${point.label}-${index}`}>
                        <circle cx={x} cy={y} r={4} fill="#f19a4b">
                          <title>{`${point.label}: ${point.value}`}</title>
                        </circle>
                        <text
                          x={x}
                          y={chartHeight + 16}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#7f7f7f"
                        >
                          {point.label.slice(0, 12)}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}
        </svg>
      </div>
    </div>
  );
}

export default function ModerationAnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminAnalyticsResponse>({});
  const [userAvatarsById, setUserAvatarsById] = useState<Record<string, string | null>>({});
  const [recipeImagesById, setRecipeImagesById] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [result, usersPage] = await Promise.all([
          moderationService.getAnalytics(),
          moderationService.getUsers(1, 500),
        ]);
        const avatarMap: Record<string, string | null> = {};
        usersPage.items.forEach((user) => {
          avatarMap[String(user.id)] = user.avatar_url ?? null;
        });
        const initialTopRecipes = extractTopRecipes(result);
        const needRecipeImages = initialTopRecipes.filter((recipe) => !recipe.imageUrl);
        const recipePairs = await Promise.all(
          needRecipeImages.map(async (recipe) => {
            try {
              const full = await recipeService.getById(recipe.id);
              return [recipe.id, full.image_url ?? null] as const;
            } catch {
              return [recipe.id, null] as const;
            }
          })
        );
        const recipeMap: Record<string, string | null> = {};
        recipePairs.forEach(([id, image]) => {
          recipeMap[id] = image;
        });
        setData(result);
        setUserAvatarsById(avatarMap);
        setRecipeImagesById(recipeMap);
      } catch (err) {
        console.error("Ошибка загрузки аналитики:", err);
        setError("Не удалось загрузить аналитику");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const topMetrics = useMemo(() => {
    return Object.entries(data)
      .map(([key, value]) => {
        const numeric = toNumber(value);
        if (numeric === null) return null;
        return { key, value: numeric };
      })
      .filter((item): item is { key: string; value: number } => Boolean(item));
  }, [data]);

  const recipeTop = useMemo(
    () =>
      extractTopRecipes(data).map((item) => ({
        ...item,
        imageUrl: item.imageUrl || recipeImagesById[item.id] || null,
      })),
    [data, recipeImagesById]
  );
  const userTop = useMemo(
    () =>
      extractTopUsers(data).map((item) => ({
        ...item,
        imageUrl: item.imageUrl || userAvatarsById[item.id] || null,
      })),
    [data, userAvatarsById]
  );

  const charts = useMemo(() => {
    const skipKeys = new Set<string>();
    if (recipeTop.length) {
      Object.keys(data).forEach((k) => {
        if (k.toLowerCase().includes("top") && k.toLowerCase().includes("recipe")) skipKeys.add(k);
      });
    }
    if (userTop.length) {
      Object.keys(data).forEach((k) => {
        if (k.toLowerCase().includes("top") && k.toLowerCase().includes("user")) skipKeys.add(k);
      });
    }

    return Object.entries(data)
      .filter(([key]) => !skipKeys.has(key))
      .map(([key, value]) => ({ key, points: extractChart(key, value) }))
      .filter((item) => item.points.length > 0)
      .map((item) => ({
        ...item,
        mode: (() => {
          const key = item.key.toLowerCase();
          const isLine =
            key.includes("follow") ||
            key.includes("subscr") ||
            key.includes("registr") ||
            key.includes("recipe");
          return isLine ? ("line" as const) : ("bar" as const);
        })(),
      }));
  }, [data, recipeTop.length, userTop.length]);

  if (loading) {
    return <p className="text-sm text-umami-gray">Загрузка аналитики...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-4">
      {topMetrics.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {topMetrics.map((metric) => (
            <div
              key={metric.key}
              className="rounded-xl border border-umami-light-gray/50 bg-[#fcfbf8] p-3"
            >
              <p className="text-xs text-umami-gray">{titleRu(metric.key)}</p>
              <p className="mt-1 font-nunito text-2xl font-bold text-umami-dark-gray">{metric.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {recipeTop.length > 0 ? <TopHorizontalList title="Топ рецептов" items={recipeTop} /> : null}
      {userTop.length > 0 ? <TopHorizontalList title="Топ пользователей" items={userTop} /> : null}

      {charts.length === 0 ? (
        <p className="text-sm text-umami-gray">Нет данных для графиков</p>
      ) : (
        <div className="grid gap-3">
          {charts.map((chart) => (
            <AnalyticsPlot
              key={chart.key}
              title={titleRu(chart.key)}
              points={chart.points}
              mode={chart.mode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
