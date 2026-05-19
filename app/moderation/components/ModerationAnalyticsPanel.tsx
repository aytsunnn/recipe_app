"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AdminAnalyticsResponse, moderationService } from "../../services/moderationService";
import { normalizeImageUrl } from "../../utils/imageUrl";

type ChartPoint = { label: string; value: number };

type TopItem = {
  id: string;
  title: string;
  subtitle?: string;
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
      const count =
        toNumber(row.count) ?? toNumber(row.likes_count) ?? toNumber(row.views_count) ?? toNumber(row.total) ?? 0;
      const idRaw = row.recipe_id ?? row.id ?? (row.Recipe as Record<string, unknown> | undefined)?.id;
      if (idRaw === undefined || idRaw === null) return null;
      const title =
        (row.title as string | undefined) ||
        ((row.Recipe as Record<string, unknown> | undefined)?.title as string | undefined) ||
        `Рецепт #${idRaw}`;
      const image =
        (row.image_url as string | null | undefined) ||
        ((row.Recipe as Record<string, unknown> | undefined)?.image_url as string | null | undefined) ||
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
      const count =
        toNumber(row.count) ?? toNumber(row.followers_count) ?? toNumber(row.likes_count) ?? toNumber(row.total) ?? 0;
      const idRaw = row.user_id ?? row.id ?? (row.User as Record<string, unknown> | undefined)?.id;
      if (idRaw === undefined || idRaw === null) return null;
      const username =
        (row.username as string | undefined) ||
        ((row.User as Record<string, unknown> | undefined)?.username as string | undefined) ||
        `user_${idRaw}`;
      const name =
        (row.name as string | undefined) ||
        ((row.User as Record<string, unknown> | undefined)?.name as string | undefined) ||
        username;
      const image =
        (row.avatar_url as string | null | undefined) ||
        ((row.User as Record<string, unknown> | undefined)?.avatar_url as string | null | undefined) ||
        null;

      return {
        id: String(idRaw),
        title: name,
        subtitle: `@${username}`,
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
                title.includes("рецептов") ? "/image_placeholder.jpg" : "/avatar.jpg"
              )}
              alt={item.title}
              width={44}
              height={44}
              className="h-11 w-11 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-umami-dark-gray">{item.title}</p>
              {item.subtitle ? <p className="truncate text-xs text-umami-gray">{item.subtitle}</p> : null}
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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [plotUnavailable, setPlotUnavailable] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || points.length === 0) return;
    let isUnmounted = false;
    let chart: Element | undefined;
    let observer: ResizeObserver | null = null;

    const run = async () => {
      try {
        const Plot = await import("@observablehq/plot");
        if (isUnmounted) return;
        setPlotUnavailable(false);

        const render = (width: number) =>
          Plot.plot({
            width,
            height: 320,
            marginLeft: 48,
            marginBottom: 80,
            marginTop: 24,
            style: {
              background: "white",
              color: "#2f2f2f",
              fontFamily: "Nunito, sans-serif",
            },
            x: {
              label: null,
              tickRotate: -35,
              tickSize: 0,
            },
            y: {
              label: null,
              grid: true,
              tickSize: 0,
            },
            marks:
              mode === "line"
                ? [
                    Plot.line(points, {
                      x: "label",
                      y: "value",
                      stroke: "#f19a4b",
                      strokeWidth: 3,
                    }),
                    Plot.dot(points, { x: "label", y: "value", r: 4, fill: "#f19a4b" }),
                    Plot.tip(
                      points,
                      Plot.pointerX({
                        x: "label",
                        y: "value",
                        title: (d: ChartPoint) => `${d.label}: ${d.value}`,
                      })
                    ),
                    Plot.ruleY([0]),
                  ]
                : [
                    Plot.barY(points, {
                      x: "label",
                      y: "value",
                      fill: "#f19a4b",
                      title: (d: ChartPoint) => `${d.label}: ${d.value}`,
                    }),
                    Plot.tip(
                      points,
                      Plot.pointerX({
                        x: "label",
                        y: "value",
                        title: (d: ChartPoint) => `${d.label}: ${d.value}`,
                      })
                    ),
                    Plot.ruleY([0]),
                  ],
          });

        const draw = () => {
          if (!wrapper) return undefined;
          const width = Math.max(wrapper.clientWidth, 320);
          wrapper.innerHTML = "";
          const nextChart = render(width);
          wrapper.append(nextChart);
          return nextChart;
        };

        chart = draw();
        observer = new ResizeObserver(() => {
          chart?.remove();
          chart = draw();
        });
        observer.observe(wrapper);
      } catch (error) {
        console.error("Не удалось загрузить библиотеку графиков:", error);
        setPlotUnavailable(true);
      }
    };

    void run();

    return () => {
      isUnmounted = true;
      observer?.disconnect();
      chart?.remove();
    };
  }, [points, mode]);

  return (
    <div className="rounded-xl border border-umami-light-gray/50 bg-white p-3">
      <h3 className="mb-3 font-nunito text-base font-bold text-umami-dark-gray">{title}</h3>
      <div ref={wrapperRef} className="w-full overflow-x-auto" />
      {plotUnavailable ? (
        <p className="mt-2 text-xs text-umami-gray">График недоступен: не установлена библиотека @observablehq/plot.</p>
      ) : null}
    </div>
  );
}

export default function ModerationAnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminAnalyticsResponse>({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await moderationService.getAnalytics();
        setData(result);
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

  const recipeTop = useMemo(() => extractTopRecipes(data), [data]);
  const userTop = useMemo(() => extractTopUsers(data), [data]);

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
