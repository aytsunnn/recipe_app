import { apiClient } from "./api";
import { normalizeImageUrl } from "../utils/imageUrl";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  createdAt?: string;
  link?: string | null;
  targetLink?: string | null;
  actorName?: string;
  actorUsername?: string;
  actorId?: string;
  actorAvatarUrl?: string | null;
  isAdminAction?: boolean;
  isSystem?: boolean;
}

export interface NotificationsPageResult {
  items: AppNotification[];
  page: number;
  limit: number;
  hasMore: boolean;
}

class NotificationService {
  private buildFallbackMessage(raw: Record<string, unknown>, type: string): string {
    const recipe = raw.Recipe as Record<string, unknown> | undefined;
    const recipeTitle =
      typeof recipe?.title === "string" && recipe.title.trim().length > 0
        ? ` «${recipe.title.trim()}»`
        : "";

    if (type.includes("like")) {
      return `поставил(а) лайк вашему рецепту${recipeTitle}`;
    }
    if (type.includes("comment")) {
      return `оставил(а) комментарий к вашему рецепту${recipeTitle}`;
    }
    if (type.includes("reply")) {
      return "ответил(а) на ваш комментарий";
    }
    if (type.includes("follow") || type.includes("subscribe")) {
      return "подписался(ась) на вас";
    }
    if (
      type.includes("recipe") ||
      type.includes("post") ||
      type.includes("publish") ||
      type.includes("created")
    ) {
      return `опубликовал(а) новый рецепт${recipeTitle}`;
    }
    return "новое действие";
  }

  private extractArray(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    const raw = payload as Record<string, unknown>;
    const candidates = [raw.notifications, raw.items, raw.data, raw.rows];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    return [];
  }

  private normalize(item: unknown): AppNotification {
    const raw = (item || {}) as Record<string, unknown>;
    const fallbackId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const id = String(raw.id ?? raw.notification_id ?? fallbackId);
    const title = String(raw.title ?? raw.type ?? raw.event ?? "Уведомление");
    const type =
      typeof raw.type === "string"
        ? raw.type.toLowerCase()
        : typeof raw.event === "string"
        ? raw.event.toLowerCase()
        : "";
    const rawMessage =
      raw.message ?? raw.text ?? raw.content ?? raw.description ?? "";
    const message =
      typeof rawMessage === "string" && rawMessage.trim().length > 0
        ? rawMessage
        : this.buildFallbackMessage(raw, type);

    const isReadRaw = raw.is_read ?? raw.isRead ?? raw.read;
    const is_read =
      typeof isReadRaw === "boolean"
        ? isReadRaw
        : typeof isReadRaw === "number"
        ? isReadRaw === 1
        : String(isReadRaw || "").toLowerCase() === "true";

    const createdAt =
      typeof raw.createdAt === "string"
        ? raw.createdAt
        : typeof raw.created_at === "string"
        ? raw.created_at
        : undefined;

    const link =
      typeof raw.link === "string"
        ? raw.link
        : typeof raw.url === "string"
        ? raw.url
        : null;

    const actorSource = (
      raw.Actor ||
      raw.Author ||
      raw.User ||
      raw.user ||
      raw.actor ||
      raw.from_user ||
      raw.sender
    ) as Record<string, unknown> | undefined;

    const actorId =
      actorSource?.id !== null && actorSource?.id !== undefined
        ? String(actorSource.id)
        : raw.user_id !== null && raw.user_id !== undefined
        ? String(raw.user_id)
        : raw.actor_id !== null && raw.actor_id !== undefined
        ? String(raw.actor_id)
        : undefined;

    const actorName =
      typeof actorSource?.name === "string"
        ? actorSource.name
        : typeof raw.user_name === "string"
        ? raw.user_name
        : undefined;

    const actorUsername =
      typeof actorSource?.username === "string"
        ? actorSource.username
        : typeof raw.username === "string"
        ? raw.username
        : undefined;

    const rawAvatar =
      typeof actorSource?.avatar_url === "string"
        ? actorSource.avatar_url
        : typeof raw.avatar_url === "string"
        ? raw.avatar_url
        : null;

    const actorAvatarUrl = normalizeImageUrl(rawAvatar, "/avatar.jpg");

    const textForDetect = `${title} ${message}`.toLowerCase();
    const isAdminAction =
      type.includes("admin") ||
      type.includes("report") ||
      type.includes("moderation") ||
      textForDetect.includes("жалоб") ||
      textForDetect.includes("модерац") ||
      textForDetect.includes("статус");

    const recipeId =
      raw.recipe_id !== null && raw.recipe_id !== undefined
        ? String(raw.recipe_id)
        : undefined;
    const commentId =
      raw.comment_id !== null && raw.comment_id !== undefined
        ? String(raw.comment_id)
        : undefined;

    const targetLink =
      link ||
      (commentId && recipeId
        ? `/recipes/${recipeId}?tab=comments&commentId=${commentId}#comment-${commentId}`
        : recipeId
        ? `/recipes/${recipeId}`
        : null);

    const isSystem = isAdminAction || !actorId;

    return {
      id,
      title,
      message,
      is_read,
      createdAt,
      link,
      targetLink,
      actorName,
      actorUsername,
      actorId,
      actorAvatarUrl,
      isAdminAction,
      isSystem,
    };
  }

  private extractPaged(payload: unknown): {
    list: unknown[];
    hasMore?: boolean;
    total?: number;
    page?: number;
    limit?: number;
  } {
    if (Array.isArray(payload)) return { list: payload };
    if (!payload || typeof payload !== "object") return { list: [] };

    const raw = payload as Record<string, unknown>;
    const list = this.extractArray(payload);
    const page =
      typeof raw.page === "number"
        ? raw.page
        : typeof raw.currentPage === "number"
        ? raw.currentPage
        : undefined;
    const limit =
      typeof raw.limit === "number"
        ? raw.limit
        : typeof raw.perPage === "number"
        ? raw.perPage
        : undefined;
    const total =
      typeof raw.total === "number"
        ? raw.total
        : typeof raw.count === "number"
        ? raw.count
        : undefined;
    const hasMore =
      typeof raw.hasMore === "boolean"
        ? raw.hasMore
        : typeof raw.has_next === "boolean"
        ? raw.has_next
        : typeof raw.hasNext === "boolean"
        ? raw.hasNext
        : undefined;

    return { list, hasMore, total, page, limit };
  }

  async getMyNotifications(page = 1, limit = 20): Promise<NotificationsPageResult> {
    const endpoints = [
      `/notifications?page=${page}&limit=${limit}`,
      `/notifications/me?page=${page}&limit=${limit}`,
      `/users/me/notifications?page=${page}&limit=${limit}`,
    ];
    let lastError: unknown = null;

    for (const endpoint of endpoints) {
      try {
        const data = await apiClient.get<unknown>(endpoint);
        const parsed = this.extractPaged(data);
        const items = parsed.list
          .filter((row) => {
            const raw = row as Record<string, unknown>;
            const userId =
              raw.user_id !== null && raw.user_id !== undefined
                ? String(raw.user_id)
                : "";
            const actorId =
              raw.actor_id !== null && raw.actor_id !== undefined
                ? String(raw.actor_id)
                : "";
            return !(userId && actorId && userId === actorId);
          })
          .map((row) => this.normalize(row));
        const explicitHasMore = parsed.hasMore;
        const computedHasMore =
          explicitHasMore ??
          (typeof parsed.total === "number"
            ? page * limit < parsed.total
            : items.length >= limit);

        return {
          items,
          page: parsed.page ?? page,
          limit: parsed.limit ?? limit,
          hasMore: computedHasMore,
        };
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) throw lastError;
    return { items: [], page, limit, hasMore: false };
  }

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  }

  async markAllAsRead(): Promise<void> {
    await apiClient.patch("/notifications/read-all");
  }

  async clearAll(): Promise<void> {
    await apiClient.delete("/notifications");
  }
}

export const notificationService = new NotificationService();
