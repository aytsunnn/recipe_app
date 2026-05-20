"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LeftPart from "../components/MainScreen/NavigationLeftPart";
import { authService } from "../services/authService";
import {
  AppNotification,
  notificationService,
} from "../services/notificationService";
import { useUiFeedback } from "../components/UiFeedbackProvider";
import NotificationsHeader from "./components/NotificationsHeader";
import NotificationItemCard from "./components/NotificationItemCard";

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
  const { toast, confirm } = useUiFeedback();
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
      toast("Не удалось отметить все уведомления как прочитанные", "error");
    } finally {
      setActionBusy(null);
    }
  };

  const handleClearAll = async () => {
    if (actionBusy) return;
    const confirmed = await confirm("Очистить историю уведомлений?");
    if (!confirmed) return;
    try {
      setActionBusy("clearAll");
      await notificationService.clearAll();
      setItems([]);
      setHasMore(false);
    } catch (e) {
      console.error("Ошибка очистки уведомлений:", e);
      toast("Не удалось очистить историю уведомлений", "error");
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-5">
      <div className="hidden lg:flex lg:w-55.75">
        <Suspense fallback={<div className="text-umami-gray">Загрузка...</div>}>
          <LeftPart />
        </Suspense>
      </div>

      <div className="flex w-full lg:w-169.5">
        <div className="w-full flex flex-col gap-4 pb-10">
          <NotificationsHeader
            unreadCount={unreadCount}
            totalCount={items.length}
            actionBusy={actionBusy}
            hasItems={items.length > 0}
            onReadAll={() => void handleReadAll()}
            onClearAll={() => void handleClearAll()}
          />

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
              <NotificationItemCard
                key={item.id}
                item={item}
                formattedDate={formatDate(item.createdAt)}
                onOpen={() => void handleOpenNotification(item)}
              />
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





