"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import LeftPart from "../components/MainScreen/NavigationLeftPart";
import { authService } from "../services/authService";
import {
  AppNotification,
  notificationService,
} from "../services/notificationService";

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [actionBusy, setActionBusy] = useState<"readAll" | "clearAll" | null>(
    null
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!authService.isAuthenticated()) {
          setItems([]);
          setHasMore(false);
          return;
        }
        const result = await notificationService.getMyNotifications(1, limit);
        if (!cancelled) {
          setItems(result.items);
          setPage(1);
          setHasMore(result.hasMore);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Ошибка загрузки уведомлений"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items]
  );

  const loadMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const result = await notificationService.getMyNotifications(
        nextPage,
        limit
      );
      setItems((prev) => {
        const merged = [...prev, ...result.items];
        const seen = new Set<string>();
        return merged.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      });
      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch (e) {
      console.error("Ошибка дозагрузки уведомлений:", e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "220px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, page]);

  const handleOpenNotification = async (item: AppNotification) => {
    if (!item.is_read) {
      setItems((prev) =>
        prev.map((current) =>
          current.id === item.id ? { ...current, is_read: true } : current
        )
      );
      try {
        await notificationService.markAsRead(item.id);
      } catch (e) {
        console.error("Ошибка отметки уведомления как прочитанного:", e);
      }
    }
    if (!item.isSystem && item.targetLink) {
      router.push(item.targetLink);
    }
  };

  const handleReadAll = async () => {
    if (actionBusy) return;
    try {
      setActionBusy("readAll");
      await notificationService.markAllAsRead();
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (e) {
      console.error("Ошибка пометки всех уведомлений:", e);
      alert("Не удалось отметить все уведомления как прочитанные");
    } finally {
      setActionBusy(null);
    }
  };

  const handleClearAll = async () => {
    if (actionBusy) return;
    if (!window.confirm("Очистить историю уведомлений?")) return;
    try {
      setActionBusy("clearAll");
      await notificationService.clearAll();
      setItems([]);
      setHasMore(false);
    } catch (e) {
      console.error("Ошибка очистки уведомлений:", e);
      alert("Не удалось очистить историю уведомлений");
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="w-full gap-5 flex flex-row">
      <div className="flex w-55.75">
        <Suspense fallback={<div className="text-umami-gray">Загрузка...</div>}>
          <LeftPart />
        </Suspense>
      </div>

      <div className="flex w-169.5">
        <div className="w-full flex flex-col gap-4 pb-10">
          <div className="rounded-2xl border border-umami-light-gray/50 bg-gradient-to-r from-[#fff7ea] to-[#fffdf8] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h1 className="font-nunito font-bold text-2xl text-umami-dark-gray">
                  Уведомления
                </h1>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-umami-orange px-2 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleReadAll()}
                  disabled={actionBusy === "readAll" || items.length === 0}
                  className="h-9 w-9 rounded-full border border-umami-light-gray/50 bg-white flex items-center justify-center transition-colors hover:bg-[#f9f4e9] disabled:opacity-60"
                  title="Прочитать все"
                  aria-label="Прочитать все"
                >
                  <Image
                    width={20}
                    height={20}
                    src="/checks.svg"
                    alt="read-all"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void handleClearAll()}
                  disabled={actionBusy === "clearAll" || items.length === 0}
                  className="h-9 w-9 rounded-full border border-umami-light-gray/50 bg-white flex items-center justify-center transition-colors hover:bg-[#fff1ef] disabled:opacity-60"
                  title="Очистить историю"
                  aria-label="Очистить историю"
                >
                  <Image
                    width={20}
                    height={20}
                    src="/trashsimple.svg"
                    alt="clear-all"
                  />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-umami-gray">
              <span className="rounded-full bg-white/80 px-2 py-1">
                Всего: {items.length}
              </span>
              <span className="rounded-full bg-white/80 px-2 py-1">
                Непрочитанных: {unreadCount}
              </span>
            </div>
          </div>

          {loading && (
            <div className="rounded-2xl border border-umami-light-gray/40 bg-white p-8 text-center text-umami-gray">
              Загрузка уведомлений...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 text-center text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="rounded-2xl border border-umami-light-gray/40 bg-white p-10 text-center text-umami-gray">
              Уведомлений пока нет
            </div>
          )}

          {!loading &&
            !error &&
            items.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                  item.is_read
                    ? "border-umami-light-gray/40 bg-white hover:bg-[#fffcf7]"
                    : "border-umami-orange/55 bg-[#fff3e2] hover:bg-[#fff0db]"
                } ${!item.isSystem && item.targetLink ? "cursor-pointer" : ""}`}
                onClick={() => void handleOpenNotification(item)}
              >
                {!item.isSystem && (item.actorName || item.actorUsername) ? (
                  <div className="flex items-start gap-3">
                    {item.actorId ? (
                      <Link
                        href={`/users/${item.actorId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      >
                        <Image
                          width={40}
                          height={40}
                          src={item.actorAvatarUrl || "/avatar.jpg"}
                          alt="actor-avatar"
                          className="h-10 w-10 rounded-full border border-umami-light-gray/40 object-cover"
                        />
                      </Link>
                    ) : (
                      <Image
                        width={40}
                        height={40}
                        src={item.actorAvatarUrl || "/avatar.jpg"}
                        alt="actor-avatar"
                        className="h-10 w-10 rounded-full border border-umami-light-gray/40 object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          {item.actorId ? (
                            <Link
                              href={`/users/${item.actorId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="truncate font-nunito text-sm font-extrabold text-umami-dark-gray hover:underline"
                            >
                              {item.actorName || "Пользователь"}
                            </Link>
                          ) : (
                            <p className="truncate font-nunito text-sm font-extrabold text-umami-dark-gray">
                              {item.actorName || "Пользователь"}
                            </p>
                          )}
                        </div>
                        {!item.is_read ? (
                          <span className="rounded-full bg-umami-orange px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                            Новое
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap font-inter text-sm text-umami-dark-gray">
                        {item.message || item.title}
                      </p>
                      <p className="mt-1 text-xs text-umami-light-gray">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5efe0]">
                      <Image width={18} height={18} src="/Colocolchik.svg" alt="system" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-nunito text-sm font-extrabold text-umami-dark-gray">
                          Системное уведомление
                        </p>
                        {!item.is_read ? (
                          <span className="rounded-full bg-umami-orange px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                            Новое
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap font-inter text-sm text-umami-dark-gray">
                        {item.message || item.title}
                      </p>
                      <p className="mt-1 text-xs text-umami-light-gray">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

          {!loading && !error && items.length > 0 && (
            <div
              ref={sentinelRef}
              className="py-3 text-center text-xs text-umami-light-gray"
            >
              {loadingMore
                ? "Загружаем еще..."
                : hasMore
                ? "Прокрутите вниз для загрузки"
                : "Конец списка"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
