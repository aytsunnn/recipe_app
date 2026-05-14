"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRecipe } from "../../hooks/useRecipe";
import { authService } from "../../services/authService";
import { commentService, Comment } from "../../services/commentService";
import { likeService } from "../../services/likeService";
import { favoriteService } from "../../services/favoriteService";
import { recipeService } from "../../services/recipeService";
import { moderationService } from "../../services/moderationService";
import { normalizeImageUrl } from "../../utils/imageUrl";
import LeftPart from "../../components/MainScreen/NavigationLeftPart";
import RightPart from "../../components/MainScreen/NewsRightPart";
import NotFoundState from "../../components/NotFoundState";
import { isNotFoundErrorMessage } from "../../utils/errorUtils";
import { canAccessModeration } from "../../utils/role";

const RECIPE_LIKE_OVERRIDES_KEY = "recipe_like_overrides";
const RECIPE_COMMENTS_OVERRIDES_KEY = "recipe_comments_overrides";
const UNIT_OVERRIDE_MARKER = "__unit_override:";

function normalizeCategoryName(category: unknown): string | null {
  if (typeof category === "string") return category;
  if (category && typeof category === "object") {
    const entry = category as { name?: unknown };
    if (typeof entry.name === "string") return entry.name;
  }
  return null;
}

function parseUnitOverrideFromNote(note: string | null | undefined): string | null {
  const raw = (note || "").trim();
  if (!raw) return null;
  const marker = raw
    .split(/\s+/)
    .find((part) => part.startsWith(UNIT_OVERRIDE_MARKER));
  if (!marker) return null;
  const unit = marker.slice(UNIT_OVERRIDE_MARKER.length).trim();
  return unit || null;
}

export default function RecipeDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipeId = params?.id || "";
  const { recipe, loading, error } = useRecipe(recipeId);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSending, setCommentSending] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "info" | "recipe" | "ingredients" | "comments"
  >("info");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCooked, setIsCooked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [likesCountState, setLikesCountState] = useState(0);
  const [commentsCountState, setCommentsCountState] = useState(0);
  const [commentForm, setCommentForm] = useState({
    content: "",
    rating: null as number | null,
    taste_sweet: null as number | null,
    taste_sour: null as number | null,
    taste_salty: null as number | null,
    taste_spicy: null as number | null,
    taste_umami: null as number | null,
  });
  const [personalNote, setPersonalNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [commentLikeBusy, setCommentLikeBusy] = useState<Record<string, boolean>>({});
  const [canModerate, setCanModerate] = useState(false);
  const [recipeActionsOpen, setRecipeActionsOpen] = useState(false);
  const [commentActionsOpenId, setCommentActionsOpenId] = useState<string | null>(null);
  const [deleteRecipeBusy, setDeleteRecipeBusy] = useState(false);
  const [deleteCommentBusy, setDeleteCommentBusy] = useState<Record<string, boolean>>({});
  const [desiredPortions, setDesiredPortions] = useState(1);

  const categories = useMemo(() => {
    if (!recipe?.Categories) return [];
    return recipe.Categories.map(normalizeCategoryName).filter(
      (name): name is string => Boolean(name)
    );
  }, [recipe?.Categories]);

  const descriptionItems = useMemo(
    () => [
      { label: "Кухня", value: recipe?.Kitchen?.name || "—" },
      { label: "Праздник", value: recipe?.Celebration?.name || "—" },
      { label: "Тип приготовления", value: recipe?.TypeCooking?.name || "—" },
      { label: "Калории", value: recipe?.calorific ?? "—" },
      { label: "Порции", value: recipe?.portion ?? "—" },
      {
        label: "Время приготовления",
        value: recipe?.cooking_time ? `${recipe.cooking_time} мин` : "—",
      },
      { label: "Белки", value: recipe?.proteins ?? "—" },
      { label: "Жиры", value: recipe?.fats ?? "—" },
      { label: "Углеводы", value: recipe?.carbohydrates ?? "—" },
    ],
    [recipe]
  );

  const groupedComments = useMemo(() => {
    const roots: Comment[] = [];
    const children = new Map<string, Comment[]>();

    comments.forEach((comment) => {
      const replies = (
        (comment as Comment & { Replies?: Comment[] }).Replies || []
      ).map((reply) => ({
        ...reply,
        parent_comment_id: reply.parent_comment_id ?? comment.id,
      }));
      if (replies.length > 0) {
        children.set(String(comment.id), replies);
      }

      if (comment.parent_comment_id) {
        const parentId = String(comment.parent_comment_id);
        const list = children.get(parentId) || [];
        list.push(comment);
        children.set(parentId, list);
      } else {
        roots.push(comment);
      }
    });

    roots.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    children.forEach((list, key) => {
      children.set(
        key,
        list.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      );
    });

    return { roots, children };
  }, [comments]);
  const averageRating = useMemo(() => {
    const rated = comments
      .map((comment) =>
        typeof comment.rating === "number" ? comment.rating : null
      )
      .filter((value): value is number => value !== null && value > 0);
    if (rated.length === 0) return null;
    const avg = rated.reduce((sum, value) => sum + value, 0) / rated.length;
    return avg.toFixed(1).replace(".", ",");
  }, [comments]);

  const likesCount = likesCountState;
  const commentsCount = commentsCountState;

  const getSafeImageUrl = (url: string | null, fallback: string) => {
    return normalizeImageUrl(url, fallback);
  };

  const scaleIngredientQuantity = (
    quantity: string | number | null | undefined
  ): string | number => {
    if (quantity === null || quantity === undefined) return "—";
    const basePortions = recipe?.portion && recipe.portion > 0 ? recipe.portion : 1;
    const ratio = desiredPortions > 0 ? desiredPortions / basePortions : 1;

    if (typeof quantity === "number") {
      const next = quantity * ratio;
      return Math.max(1, Math.ceil(next));
    }

    const normalized = String(quantity).replace(",", ".").trim();
    const numeric = Number(normalized);
    if (Number.isFinite(numeric)) {
      const next = numeric * ratio;
      return Math.max(1, Math.ceil(next));
    }

    return quantity;
  };

  const isNutritionGenerated = useMemo(() => {
    if (!recipe) return false;
    const recipeAny = recipe as unknown as Record<string, unknown>;
    const normalizeFlag = (value: unknown): boolean => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value === 1;
      if (typeof value === "string") {
        const lowered = value.trim().toLowerCase();
        return lowered === "true" || lowered === "1" || lowered === "yes";
      }
      return false;
    };
    return Boolean(
      normalizeFlag(recipeAny.is_ai_nutrition_generated) ||
        normalizeFlag(recipeAny.is_ai_pfc) ||
        normalizeFlag(recipeAny.ai_nutrition_generated) ||
        normalizeFlag(recipeAny.nutrition_generated) ||
        normalizeFlag(recipeAny.is_nutrition_generated) ||
        normalizeFlag(recipeAny.is_generated_nutrition) ||
        normalizeFlag(recipeAny.is_generated)
    );
  }, [recipe]);

  const loadComments = async () => {
    if (!recipeId) return;
    try {
      setCommentsLoading(true);
      const data = await commentService.getByRecipe(recipeId);
      setComments(data);
      setCommentsCountState(data.length);
    } catch (loadError) {
      console.error("Ошибка загрузки комментариев:", loadError);
      alert("Не удалось загрузить комментарии");
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      if (!authService.isAuthenticated()) {
        setCurrentUserId(null);
        setCanModerate(false);
        return;
      }
      const user = await authService.getCurrentUser();
      setCurrentUserId(user?.id || null);
      const role = user?.role || authService.getRoleFromToken();
      setCanModerate(canAccessModeration(role));
    };
    loadUser();
  }, []);

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "comments") {
      setActiveTab("comments");
      if (comments.length === 0) {
        void loadComments();
      }
    }
  }, [searchParams, comments.length]);

  useEffect(() => {
    if (!recipe) return;
    setLikesCountState(recipe._count?.Likes ?? recipe.Likes?.length ?? 0);
    setCommentsCountState(recipe._count?.Comments ?? comments.length ?? 0);
    setPersonalNote(recipe.personal_note ?? "");
    setDesiredPortions(recipe.portion > 0 ? recipe.portion : 1);
  }, [recipe]);

  useEffect(() => {
    if (!recipeId) return;
    void loadComments();
  }, [recipeId]);

  useEffect(() => {
    if (!recipe) return;
    const liked = currentUserId
      ? recipe.Likes?.some((like) => like.user_id === currentUserId)
      : false;
    setIsLiked(Boolean(liked));
  }, [recipe, currentUserId]);

  useEffect(() => {
    let cancelled = false;
    const loadFavoriteState = async () => {
      if (!currentUserId || !recipeId) {
        setIsFavorite(false);
        return;
      }
      try {
        const favorite = await favoriteService.checkIsFavorite(recipeId);
        if (!cancelled) setIsFavorite(favorite);
      } catch {
        if (!cancelled) setIsFavorite(false);
      }
    };
    void loadFavoriteState();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, recipeId]);

  const handleLikeRecipe = async () => {
    if (!currentUserId || !recipeId || likeBusy) {
      if (!currentUserId) alert("Необходимо авторизоваться");
      return;
    }
    const prev = isLiked;
    try {
      setLikeBusy(true);
      setIsLiked(!prev);
      setLikesCountState((count) =>
        prev ? Math.max(0, count - 1) : count + 1
      );
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(RECIPE_LIKE_OVERRIDES_KEY);
        const map = raw ? (JSON.parse(raw) as Record<string, { userId: string; isLiked: boolean }>) : {};
        map[recipeId] = { userId: currentUserId, isLiked: !prev };
        localStorage.setItem(RECIPE_LIKE_OVERRIDES_KEY, JSON.stringify(map));
      }
      window.dispatchEvent(
        new CustomEvent("recipe-like-updated", {
          detail: {
            recipeId,
            userId: currentUserId,
            isLiked: !prev,
          },
        })
      );
      if (prev) await likeService.delete(recipeId);
      else await likeService.create(recipeId);
    } catch (error) {
      setIsLiked(prev);
      setLikesCountState((count) =>
        prev ? count + 1 : Math.max(0, count - 1)
      );
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(RECIPE_LIKE_OVERRIDES_KEY);
        const map = raw ? (JSON.parse(raw) as Record<string, { userId: string; isLiked: boolean }>) : {};
        map[recipeId] = { userId: currentUserId, isLiked: prev };
        localStorage.setItem(RECIPE_LIKE_OVERRIDES_KEY, JSON.stringify(map));
      }
      window.dispatchEvent(
        new CustomEvent("recipe-like-updated", {
          detail: {
            recipeId,
            userId: currentUserId,
            isLiked: prev,
          },
        })
      );
      console.error("Ошибка при лайке рецепта:", error);
      alert("Не удалось поставить лайк");
    } finally {
      setLikeBusy(false);
    }
  };

  const handleFavoriteRecipe = async () => {
    if (!currentUserId || !recipeId || favoriteBusy) {
      if (!currentUserId) alert("Необходимо авторизоваться");
      return;
    }
    const prev = isFavorite;
    try {
      setFavoriteBusy(true);
      setIsFavorite(!prev);
      if (prev) await favoriteService.removeFromFavorites(recipeId);
      else await favoriteService.addToFavorites(recipeId);
    } catch (error) {
      setIsFavorite(prev);
      console.error("Ошибка при избранном:", error);
      alert("Не удалось обновить избранное");
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!recipeId || deleteRecipeBusy) return;
    if (!window.confirm("Удалить рецепт?")) return;
    try {
      setDeleteRecipeBusy(true);
      await moderationService.deleteRecipe(recipeId);
      setRecipeActionsOpen(false);
      router.back();
    } catch (error) {
      console.error("Ошибка удаления рецепта:", error);
      alert("Не удалось удалить рецепт");
    } finally {
      setDeleteRecipeBusy(false);
    }
  };

  const handleReportRecipe = async () => {
    if (!currentUserId || !recipeId) {
      alert("Необходимо авторизоваться");
      return;
    }
    const reason = window.prompt("Причина жалобы");
    if (!reason || !reason.trim()) return;
    const description = window.prompt("Комментарий к жалобе (необязательно)") || "";
    try {
      await moderationService.createReport({
        type: "recipe",
        reason: reason.trim(),
        description: description.trim(),
        recipe_id: Number(recipeId),
        reported_user_id: recipe?.User?.id ? Number(recipe.User.id) : undefined,
      });
      setRecipeActionsOpen(false);
      alert("Жалоба отправлена");
    } catch (error) {
      console.error("Ошибка отправки жалобы:", error);
      alert("Не удалось отправить жалобу");
    }
  };

  const handleCookedToggle = () => {
    setIsCooked((prev) => !prev);
  };

  const handleSavePersonalNote = async () => {
    if (!currentUserId || !recipeId || noteSaving) {
      if (!currentUserId) alert("Необходимо авторизоваться");
      return;
    }
    try {
      setNoteSaving(true);
      await recipeService.updatePersonalNote(recipeId, personalNote.trim());
    } catch (error) {
      console.error("Ошибка сохранения заметки:", error);
      alert("Не удалось сохранить заметку");
    } finally {
      setNoteSaving(false);
    }
  };

  const getCommentLikesCount = (comment: Comment): number => {
    const commentAny = comment as unknown as Record<string, unknown>;
    const toNumber = (value: unknown): number | null => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
      return null;
    };

    const direct =
      toNumber(comment.likes_count) ??
      toNumber(commentAny.likes_count) ??
      toNumber(commentAny.likesCount) ??
      toNumber(commentAny.likeCount) ??
      toNumber(commentAny.total_likes) ??
      toNumber(commentAny.totalLikes) ??
      toNumber(commentAny.count_likes) ??
      toNumber(commentAny.countLikes);
    if (direct !== null) return Math.max(0, direct);

    const nested =
      commentAny._count && typeof commentAny._count === "object"
        ? (commentAny._count as Record<string, unknown>)
        : null;
    const nestedCount =
      toNumber(comment._count?.Likes) ??
      toNumber(nested?.Likes) ??
      toNumber(nested?.likes) ??
      toNumber(nested?.likes_count) ??
      toNumber(nested?.likesCount) ??
      toNumber(nested?.total_likes) ??
      toNumber(nested?.totalLikes);
    if (nestedCount !== null) return Math.max(0, nestedCount);

    return 0;
  };

  const isCommentLikedByCurrentUser = (comment: Comment): boolean => {
    if (typeof comment.is_liked === "boolean") return comment.is_liked;
    const commentAny = comment as unknown as Record<string, unknown>;
    if (typeof commentAny.isLiked === "boolean") return commentAny.isLiked;
    if (typeof commentAny.liked_by_me === "boolean") return commentAny.liked_by_me;
    if (!currentUserId) return false;

    if (Array.isArray(comment.Likes)) {
      return comment.Likes.some((like) => String(like.user_id) === String(currentUserId));
    }

    if (Array.isArray(commentAny.likes)) {
      return (commentAny.likes as Array<Record<string, unknown>>).some((like) => {
        const likeUserId = like.user_id ?? like.userId ?? like.author_id;
        return String(likeUserId) === String(currentUserId);
      });
    }

    return false;
  };

  const patchCommentLikeState = (
    targetCommentId: string,
    nextIsLiked: boolean,
    nextLikesCount: number
  ) => {
    const applyPatch = (item: Comment): Comment => {
      const current = item as Comment & { Replies?: Comment[] };
      if (String(current.id) === String(targetCommentId)) {
        return {
          ...current,
          is_liked: nextIsLiked,
          likes_count: Math.max(0, nextLikesCount),
          _count: {
            ...(current._count || {}),
            Likes: Math.max(0, nextLikesCount),
          },
        };
      }
      if (Array.isArray(current.Replies)) {
        return {
          ...current,
          Replies: current.Replies.map((reply) => applyPatch(reply)),
        } as Comment;
      }
      return current;
    };

    setComments((prev) => prev.map((comment) => applyPatch(comment)));
  };

  const handleToggleCommentLike = async (comment: Comment) => {
    if (!currentUserId) {
      alert("Необходимо авторизоваться");
      return;
    }
    const commentId = String(comment.id);
    if (commentLikeBusy[commentId]) return;
    const prevLiked = isCommentLikedByCurrentUser(comment);
    const prevCount = getCommentLikesCount(comment);
    const nextLiked = !prevLiked;
    const nextCount = prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

    try {
      setCommentLikeBusy((prev) => ({ ...prev, [commentId]: true }));
      patchCommentLikeState(commentId, nextLiked, nextCount);
      await commentService.toggleLike(commentId);
      await loadComments();
    } catch (error) {
      patchCommentLikeState(commentId, prevLiked, prevCount);
      console.error("Ошибка лайка комментария:", error);
      alert("Не удалось поставить лайк на комментарий");
    } finally {
      setCommentLikeBusy((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!recipeId || deleteCommentBusy[commentId]) return;
    if (!window.confirm("Удалить комментарий?")) return;
    try {
      setDeleteCommentBusy((prev) => ({ ...prev, [commentId]: true }));
      await moderationService.deleteComment(commentId);
      setCommentActionsOpenId(null);
      await loadComments();
    } catch (error) {
      console.error("Ошибка удаления комментария:", error);
      alert("Не удалось удалить комментарий");
    } finally {
      setDeleteCommentBusy((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleReportComment = async (comment: Comment) => {
    if (!currentUserId || !recipeId) {
      alert("Необходимо авторизоваться");
      return;
    }
    const reason = window.prompt("Причина жалобы");
    if (!reason || !reason.trim()) return;
    const description = window.prompt("Комментарий к жалобе (необязательно)") || "";
    try {
      await moderationService.createReport({
        type: "comment",
        reason: reason.trim(),
        description: description.trim(),
        recipe_id: Number(recipeId),
        reported_user_id: comment.Author?.id ? Number(comment.Author.id) : undefined,
        comment_id: Number(comment.id),
      });
      setCommentActionsOpenId(null);
      alert("Жалоба отправлена");
    } catch (error) {
      console.error("Ошибка отправки жалобы на комментарий:", error);
      alert("Не удалось отправить жалобу");
    }
  };

  const handleSubmitComment = async () => {
    if (!currentUserId) {
      alert("Необходимо авторизоваться");
      return;
    }
    if (!commentForm.content.trim()) {
      alert("Введите текст комментария");
      return;
    }
    if (!recipeId) return;

    try {
      setCommentSending(true);
      const isReply = Boolean(replyToCommentId);
      const payload: {
        content: string;
        parent_comment_id?: number;
        rating: number | null;
        taste_sweet: number | null;
        taste_sour: number | null;
        taste_salty: number | null;
        taste_spicy: number | null;
        taste_umami: number | null;
      } = {
        content: commentForm.content.trim(),
        rating: commentForm.rating ?? null,
        taste_sweet: null,
        taste_sour: null,
        taste_salty: null,
        taste_spicy: null,
        taste_umami: null,
        ...(replyToCommentId
          ? { parent_comment_id: Number(replyToCommentId) }
          : {}),
      };

      if (!isReply) {
        payload.taste_sweet = commentForm.taste_sweet ?? null;
        payload.taste_sour = commentForm.taste_sour ?? null;
        payload.taste_salty = commentForm.taste_salty ?? null;
        payload.taste_spicy = commentForm.taste_spicy ?? null;
        payload.taste_umami = commentForm.taste_umami ?? null;
      }

      await commentService.create(recipeId, payload);
      const nextCommentsCount = commentsCountState + 1;
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(RECIPE_COMMENTS_OVERRIDES_KEY);
        const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
        map[recipeId] = Math.max(map[recipeId] ?? 0, nextCommentsCount);
        localStorage.setItem(RECIPE_COMMENTS_OVERRIDES_KEY, JSON.stringify(map));
      }
      window.dispatchEvent(
        new CustomEvent("recipe-comments-updated", {
          detail: {
            recipeId,
            commentsCount: nextCommentsCount,
          },
        })
      );
      setCommentForm({
        content: "",
        rating: null,
        taste_sweet: null,
        taste_sour: null,
        taste_salty: null,
        taste_spicy: null,
        taste_umami: null,
      });
      setCommentsCountState(nextCommentsCount);
      setReplyToCommentId(null);
      await loadComments();
    } catch (submitError) {
      console.error("Ошибка отправки комментария:", submitError);
      alert(
        submitError instanceof Error
          ? `Не удалось отправить комментарий: ${submitError.message}`
          : "Не удалось отправить комментарий"
      );
    } finally {
      setCommentSending(false);
    }
  };

  const fromQuery = searchParams?.get("from");
  const backHref =
    fromQuery === "random"
      ? "/recipes/random"
      : fromQuery === "profile"
      ? "/profile"
      : "/";
  const handleGoBack = () => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer.startsWith(window.location.origin)
    ) {
      router.back();
      return;
    }
    router.push(backHref);
  };

  if (loading) {
    return (
      <div className="flex w-full gap-5">
        <div className="hidden w-55.75 lg:flex">
          <LeftPart />
        </div>
        <div className="flex w-full items-center justify-center lg:w-169.5">
          <p className="font-nunito text-sm text-umami-gray">
            Загрузка рецепта...
          </p>
        </div>
        <div className="hidden w-63.75 lg:flex">
          <RightPart />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    if (!recipe || isNotFoundErrorMessage(error)) {
      return (
        <div className="flex w-full gap-5">
          <div className="hidden w-55.75 lg:flex">
            <LeftPart />
          </div>
          <div className="w-full pb-10 lg:w-169.5">
            <NotFoundState
              title="Ошибка 404"
              description="Рецепт не найден или был удален."
              actionHref="/"
              actionLabel="Вернуться в ленту"
            />
          </div>
          <div className="hidden w-63.75 lg:flex">
            <RightPart />
          </div>
        </div>
      );
    }

    return (
      <div className="flex w-full gap-5">
        <div className="hidden w-55.75 lg:flex">
          <LeftPart />
        </div>
        <div className="w-full pb-10 lg:w-169.5">
          <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-8">
            <p className="font-nunito text-lg font-bold text-umami-dark-gray">
              Не удалось загрузить рецепт
            </p>
            <p className="mt-2 font-inter text-sm text-umami-gray">
              {error || "Ошибка загрузки"}
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-full bg-umami-orange px-4 py-2 font-nunito text-sm text-white"
            >
              Вернуться в ленту
            </Link>
          </div>
        </div>
        <div className="hidden w-63.75 lg:flex">
          <RightPart />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full gap-5">
      <div className="hidden w-55.75 lg:flex">
        <LeftPart />
      </div>
      <div className="w-169.5">
        <div className="mx-auto w-full max-w-[980px] rounded-[20px] bg-[#fffadd] p-5">
          <div className="mb-5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-2.5 rounded-full bg-umami-orange px-2.5 py-1.25 font-nunito text-base text-white"
            >
              <Image width={22} height={22} src="/ArrowLeft.svg" alt="back" />
              Назад
            </button>
            <h1 className="min-w-0 flex-1 truncate font-nunito text-2xl font-bold leading-none text-umami-orange">
              {recipe.title}
            </h1>
            {(canModerate || Boolean(currentUserId)) && (
              <div className="relative ml-2">
                <button
                  type="button"
                  onClick={() => setRecipeActionsOpen((prev) => !prev)}
                  className="h-9 w-9 rounded-full border border-umami-light-gray/60 bg-white flex items-center justify-center"
                >
                  <Image width={20} height={20} src="/DotsThreeOutlineVertical.svg" alt="actions" />
                </button>
                {recipeActionsOpen && (
                  <div className="absolute right-0 top-10 z-20 min-w-[160px] rounded-xl border border-umami-light-gray/60 bg-white p-1 shadow-md">
                    <button
                      type="button"
                      onClick={() => void handleReportRecipe()}
                      className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-umami-dark-gray hover:bg-[#f7f4ea]"
                    >
                      Пожаловаться
                    </button>
                    {canModerate ? (
                    <button
                      type="button"
                      disabled={deleteRecipeBusy}
                      onClick={() => void handleDeleteRecipe()}
                      className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
                    >
                      Удалить рецепт
                    </button>
                    ) : null}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleFavoriteRecipe}
              disabled={favoriteBusy}
              className="ml-auto h-9 w-9 rounded-full bg-white border border-umami-light-gray/60 flex items-center justify-center disabled:opacity-60"
            >
              <Image
                width={20}
                height={20}
                src={isFavorite ? "/FavoritesCurrent.svg" : "/Favorites.svg"}
                alt="favorite"
              />
            </button>
          </div>

          <Link
            href={`/users/${recipe.User.id}`}
            className="mb-4 flex items-center gap-3 rounded-2xl border border-umami-light-gray/50 bg-white p-3"
          >
            <Image
              width={44}
              height={44}
              src={getSafeImageUrl(recipe.User.avatar_url, "/avatar.jpg")}
              alt="author avatar"
              className="h-11 w-11 rounded-full object-cover"
            />
            <div className="flex flex-col">
              <p className="font-inter text-sm font-semibold text-umami-dark-gray">
                {recipe.User.name}
              </p>
              <p className="font-inter text-sm text-umami-gray">
                @{recipe.User.username}
              </p>
            </div>
          </Link>

          <div className="overflow-hidden rounded-[20px] bg-[#d9d9d9] w-full">
            <Image
              width={638}
              height={380}
              src={getSafeImageUrl(recipe.image_url, "/placeholder.jpg")}
              alt={recipe.title}
              className="h-auto w-full rounded-[20px] object-contain"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(categories.length > 0 ? categories : ["Категория"]).map(
              (category, index) => (
                <span
                  key={`${category}-${index}`}
                  className="rounded-full bg-umami-orange px-2.5 py-1.25 font-nunito text-xs text-white"
                >
                  {category}
                </span>
              )
            )}
          </div>
          <p className="font-nunito text-xl mt-2 font-bold leading-none text-umami-orange">
            {recipe.title}
          </p>
          <p className="text-wrap-safe mt-2 max-w-[637px] font-nunito text-sm text-umami-gray">
            {recipe.description}
          </p>
          <div className="flex justify-between items-center mt-4">
            <div className=" flex items-center gap-5 text-umami-gray">
              <button
                type="button"
                onClick={handleLikeRecipe}
                disabled={likeBusy}
                className="flex items-center gap-1"
              >
                <Image
                  width={20}
                  height={20}
                  src={isLiked ? "/RedHeart.svg" : "/HeartGray.svg"}
                  alt="likes"
                />
                <span className="font-nunito text-base">{likesCount}</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  setActiveTab("comments");
                  if (comments.length === 0) await loadComments();
                }}
                className="flex items-center gap-1"
              >
                <Image
                  width={20}
                  height={20}
                  src="/ChatCircleGray.svg"
                  alt="comments"
                />
                <span className="font-nunito text-base">{commentsCount}</span>
              </button>
              <div className="flex items-center gap-1">
                <Image
                  width={20}
                  height={20}
                  src="/StarGray.svg"
                  alt="rating"
                />
                <span className="font-nunito text-base">
                  {averageRating ?? "0,0"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Image
                  width={20}
                  height={20}
                  src="/PuzzlePieceGray.svg"
                  alt="difficulty"
                />
                <span className="font-nunito text-base">
                  {recipe.difficulty}
                </span>
                {/* вывести сложность рецепта словом */}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCookedToggle}
              className={`rounded-full px-2 py-1.25 font-nunito text-xs  ${
                isCooked
                  ? "bg-white border border-umami-gray/50 text-umami-orange"
                  : "bg-umami-orange text-white"
              }`}
            >
              {isCooked ? "Приготовлено" : "Отметить приготовленным"}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-umami-light-gray/50 bg-white p-4">
            <p className="font-nunito text-base font-bold text-umami-dark-gray">
              Личная заметка
            </p>
            <textarea
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="Заметка видна только вам"
              className="mt-2 h-20 w-full rounded-2xl border border-umami-light-gray px-3 py-2 font-inter text-sm"
            />
            <button
              type="button"
              onClick={handleSavePersonalNote}
              disabled={noteSaving}
              className="mt-2 rounded-full bg-umami-orange px-4 py-2 font-nunito text-sm text-white disabled:opacity-60"
            >
              {noteSaving ? "Сохраняем..." : "Сохранить заметку"}
            </button>
          </div>

          <div className="mt-5 grid h-10 grid-cols-4 overflow-hidden rounded-[20px] bg-white border border-umami-light-gray/50">
            <button
              onClick={() => setActiveTab("info")}
              className={`font-nunito text-base ${
                activeTab === "info"
                  ? "bg-umami-orange text-white rounded-[20px]"
                  : "text-umami-gray"
              }`}
            >
              Описание
            </button>
            <button
              onClick={() => setActiveTab("ingredients")}
              className={`font-nunito text-base ${
                activeTab === "ingredients"
                  ? "bg-umami-orange text-white rounded-[20px]"
                  : "text-umami-gray"
              }`}
            >
              Ингредиенты
            </button>
            <button
              onClick={() => setActiveTab("recipe")}
              className={`font-nunito text-base ${
                activeTab === "recipe"
                  ? "bg-umami-orange text-white rounded-[20px]"
                  : "text-umami-gray"
              }`}
            >
              Рецепт
            </button>

            <button
              id="comments"
              onClick={async () => {
                setActiveTab("comments");
                if (comments.length === 0) {
                  await loadComments();
                }
              }}
              className={`font-nunito text-base ${
                activeTab === "comments"
                  ? "bg-umami-orange text-white rounded-[20px]"
                  : "text-umami-gray"
              }`}
            >
              Отзывы
            </button>
          </div>

          <div className="mt-4 rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
            {activeTab === "info" && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-10">
                  <div className="flex h-[60px] flex-col items-center justify-center rounded-[20px] border border-umami-light-gray/50 bg-white">
                    <p className="font-nunito text-base font-bold text-umami-orange">
                      {recipe.cooking_time} мин
                    </p>
                    <p className="font-nunito text-sm text-umami-light-gray">
                      готовка
                    </p>
                  </div>
                  <div className="flex h-[60px] flex-col items-center justify-center rounded-[20px] border border-umami-light-gray/50 bg-white">
                    <p className="font-nunito text-base font-bold text-umami-orange">
                      {recipe.portion} порции
                    </p>
                    <p className="font-nunito text-sm text-umami-light-gray">
                      выход
                    </p>
                  </div>
                  <div className="flex h-[60px] flex-col items-center justify-center rounded-[20px] border border-umami-light-gray/50 bg-white">
                    <p className="font-nunito text-base font-bold text-umami-orange">
                      {recipe.calorific ?? 0}
                    </p>
                    <p className="font-nunito text-sm text-umami-light-gray">
                      ккал
                    </p>
                  </div>
                </div>

                <div className="flex flex-col">
                  <p className="font-nunito text-sm text-umami-light-gray">
                    Белки
                  </p>
                  <p className="font-nunito text-base text-umami-gray">
                    {recipe.proteins ?? "—"}
                    {isNutritionGenerated ? (
                      <span className="ml-2 font-inter text-xs text-umami-light-gray">
                        (данные сгенерированы)
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="font-nunito text-sm text-umami-light-gray">
                    Жиры
                  </p>
                  <p className="font-nunito text-base text-umami-gray">
                    {recipe.fats ?? "—"}
                    {isNutritionGenerated ? (
                      <span className="ml-2 font-inter text-xs text-umami-light-gray">
                        (данные сгенерированы)
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="font-nunito text-sm text-umami-light-gray">
                    Углеводы
                  </p>
                  <p className="font-nunito text-base text-umami-gray">
                    {recipe.carbohydrates ?? "—"}
                    {isNutritionGenerated ? (
                      <span className="ml-2 font-inter text-xs text-umami-light-gray">
                        (данные сгенерированы)
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="font-nunito text-sm text-umami-light-gray">
                    Кухня
                  </p>
                  <p className="font-nunito text-base text-umami-gray">
                    {recipe.Kitchen?.name || "—"}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="font-nunito text-sm text-umami-light-gray">
                    Праздник
                  </p>
                  <p className="font-nunito text-base text-umami-gray">
                    {recipe.Celebration?.name || "—"}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="font-nunito text-sm text-umami-light-gray">
                    Тип приготовления
                  </p>
                  <p className="font-nunito text-base text-umami-gray">
                    {recipe.TypeCooking?.name || "—"}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "ingredients" && (
              <div className="space-y-2">
                <div className="mb-2 flex items-center gap-2">
                  <label
                    htmlFor="desired-portions"
                    className="font-inter text-sm text-umami-gray"
                  >
                    Порций:
                  </label>
                  <input
                    id="desired-portions"
                    type="number"
                    min={1}
                    value={desiredPortions}
                    onChange={(e) => setDesiredPortions(Math.max(1, Number(e.target.value) || 1))}
                    className="w-24 rounded-full border border-umami-light-gray px-3 py-1 text-sm text-umami-dark-gray"
                  />
                  <span className="font-inter text-xs text-umami-light-gray">
                    Базовый рецепт: {recipe.portion}
                  </span>
                </div>
                {(recipe.Ingredients || []).length === 0 && (
                  <p className="font-inter text-sm text-umami-gray">
                    Ингредиенты не указаны
                  </p>
                )}
                {(recipe.Ingredients || []).map((ingredient) => {
                  const quantity = scaleIngredientQuantity(
                    ingredient.RecipeIngredient?.quantity ?? "—"
                  );
                  const unit =
                    parseUnitOverrideFromNote(
                      ingredient.RecipeIngredient?.note ?? ""
                    ) ||
                    ingredient.RecipeIngredient?.unit_of_measurement ||
                    ingredient.RecipeIngredient?.unit_short_name ||
                    ingredient.RecipeIngredient?.unit_name ||
                    ingredient.RecipeIngredient?.unit ||
                    ingredient.RecipeIngredient?.measure ||
                    ingredient.Unit?.short_name ||
                    ingredient.Unit?.name ||
                    ingredient.unit_of_measurement ||
                    "";
                  return (
                    <div
                      key={ingredient.id}
                      className="flex items-center justify-between rounded-xl border border-umami-light-gray/40 px-3 py-2"
                    >
                      <p className="font-inter text-sm text-umami-dark-gray">
                        {ingredient.name}
                      </p>
                      <p className="font-inter text-sm text-umami-gray">
                        {quantity} {unit}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "recipe" && (
              <div className="space-y-3">
                {(recipe.Steps || []).length === 0 && (
                  <p className="font-inter text-sm text-umami-gray">
                    Шаги рецепта не указаны
                  </p>
                )}
                {(recipe.Steps || [])
                  .slice()
                  .sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0))
                  .map((step, index) => (
                    <div
                      key={step.id}
                      className="rounded-xl border border-umami-light-gray/40 p-3"
                    >
                      <p className="font-nunito text-sm font-bold text-umami-orange">
                        Шаг {step.step_number ?? index + 1}
                      </p>
                      {step.image_url && (
                        <div className="mt-2 overflow-hidden rounded-xl border border-umami-light-gray/40 w-full">
                          <Image
                            width={800}
                            height={450}
                            src={getSafeImageUrl(
                              step.image_url,
                              "/placeholder.jpg"
                            )}
                            alt={`step-${step.step_number ?? index + 1}`}
                            className="h-auto w-full rounded-xl object-contain"
                          />
                        </div>
                      )}
                      <p className="mt-2 font-inter text-sm text-umami-dark-gray">
                        {step.description || "Описание шага отсутствует"}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-umami-light-gray/50 p-4">
                  <p className="font-nunito text-lg font-bold text-umami-dark-gray">
                    {replyToCommentId
                      ? "Ответ на комментарий"
                      : "Оставить отзыв"}
                  </p>
                  {replyToCommentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyToCommentId(null);
                      }}
                      className="mt-1 rounded-full bg-gray-100 px-3 py-1 font-nunito text-xs text-umami-gray"
                    >
                      Отменить ответ
                    </button>
                  )}

                  {!replyToCommentId && (
                    <div className="mt-3">
                      <span className="mb-1 block font-inter text-xs text-umami-gray">
                        Рейтинг
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setCommentForm((prev) => ({
                                ...prev,
                                rating: prev.rating === value ? null : value,
                              }))
                            }
                            className={`text-2xl leading-none ${
                              value <= (commentForm.rating ?? 0)
                                ? "text-umami-orange"
                                : "text-umami-light-gray"
                            }`}
                            aria-label={`Оценка ${value}`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="ml-2 font-inter text-xs text-umami-gray">
                          {commentForm.rating ?? "—"}/5
                        </span>
                      </div>
                    </div>
                  )}

                  {!replyToCommentId && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {(
                        [
                          ["taste_sweet", "Сладость"],
                          ["taste_sour", "Кислота"],
                          ["taste_salty", "Солёность"],
                          ["taste_spicy", "Острота"],
                          ["taste_umami", "Умами"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="block">
                          <span className="mb-1 block font-inter text-xs text-umami-gray">
                            {label}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={5}
                            value={commentForm[key] ?? 0}
                            onChange={(e) => {
                              const nextValue = Number(e.target.value);
                              setCommentForm((prev) => ({
                                ...prev,
                                [key]: nextValue === 0 ? null : nextValue,
                              }));
                            }}
                            className="w-full accent-umami-orange"
                          />
                          <span className="font-inter text-xs text-umami-gray">
                            {commentForm[key] ?? "—"}/5
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  <textarea
                    value={commentForm.content}
                    onChange={(e) =>
                      setCommentForm((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="Напишите отзыв..."
                    className="mt-3 h-24 w-full rounded-2xl border border-umami-light-gray px-3 py-2 font-inter text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitComment}
                    disabled={commentSending}
                    className="mt-3 rounded-full bg-umami-orange px-4 py-2 font-nunito text-sm text-white disabled:opacity-60"
                  >
                    {commentSending ? "Отправляем..." : "Отправить"}
                  </button>
                </div>

                {commentsLoading && (
                  <p className="font-inter text-sm text-umami-gray">
                    Загрузка...
                  </p>
                )}
                {!commentsLoading && comments.length === 0 && (
                  <p className="font-inter text-sm text-umami-gray">
                    Комментариев пока нет
                  </p>
                )}

                {!commentsLoading &&
                  groupedComments.roots.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-xl border border-umami-light-gray/40 p-3"
                    >
                      <div className="flex gap-3">
                        <Link
                          href={`/users/${comment.Author.id}`}
                          className="h-9 w-9 shrink-0 rounded-full"
                        >
                          <Image
                            width={36}
                            height={36}
                            src={getSafeImageUrl(
                              comment.Author.avatar_url,
                              "/avatar.jpg"
                            )}
                            alt="avatar"
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <Link
                              href={`/users/${comment.Author.id}`}
                              className="min-w-0 truncate font-inter text-sm font-semibold text-umami-dark-gray hover:underline"
                            >
                              {comment.Author.username}
                            </Link>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleToggleCommentLike(comment)}
                                disabled={Boolean(commentLikeBusy[comment.id])}
                                className="inline-flex shrink-0 items-center gap-1 disabled:opacity-60"
                              >
                                <Image
                                  width={20}
                                  height={20}
                                  src={
                                    isCommentLikedByCurrentUser(comment)
                                      ? "/RedHeart.svg"
                                      : "/HeartGray.svg"
                                  }
                                  alt="comment-like"
                                />
                                <span className="font-nunito text-sm text-umami-gray">
                                  {getCommentLikesCount(comment)}
                                </span>
                              </button>
                              {(canModerate || Boolean(currentUserId)) && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCommentActionsOpenId((prev) =>
                                        prev === String(comment.id) ? null : String(comment.id)
                                      )
                                    }
                                    className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-[#f4f1e8]"
                                  >
                                    <Image width={18} height={18} src="/DotsThreeOutlineVertical.svg" alt="actions" />
                                  </button>
                                  {commentActionsOpenId === String(comment.id) && (
                                    <div className="absolute right-0 top-8 z-20 min-w-[170px] rounded-xl border border-umami-light-gray/60 bg-white p-1 shadow-md">
                                      <button
                                        type="button"
                                        onClick={() => void handleReportComment(comment)}
                                        className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-umami-dark-gray hover:bg-[#f7f4ea]"
                                      >
                                        Пожаловаться
                                      </button>
                                      {canModerate ? (
                                      <button
                                        type="button"
                                        disabled={Boolean(deleteCommentBusy[String(comment.id)])}
                                        onClick={() => void handleDeleteComment(String(comment.id))}
                                        className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
                                      >
                                        Удалить комментарий
                                      </button>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="font-inter text-sm text-umami-gray">
                            {comment.content}
                          </p>
                          {[
                            comment.rating
                              ? `Рейтинг: ${comment.rating}/5`
                              : null,
                            comment.taste_sweet
                              ? `Сладость ${comment.taste_sweet}`
                              : null,
                            comment.taste_sour
                              ? `Кислота ${comment.taste_sour}`
                              : null,
                            comment.taste_salty
                              ? `Солёность ${comment.taste_salty}`
                              : null,
                            comment.taste_spicy
                              ? `Острота ${comment.taste_spicy}`
                              : null,
                            comment.taste_umami
                              ? `Умами ${comment.taste_umami}`
                              : null,
                          ].filter(Boolean).length > 0 && (
                            <p className="text-wrap-safe mt-1 font-inter text-xs text-umami-light-gray">
                              {[
                                comment.rating
                                  ? `Рейтинг: ${comment.rating}/5`
                                  : null,
                                comment.taste_sweet
                                  ? `Сладость ${comment.taste_sweet}`
                                  : null,
                                comment.taste_sour
                                  ? `Кислота ${comment.taste_sour}`
                                  : null,
                                comment.taste_salty
                                  ? `Солёность ${comment.taste_salty}`
                                  : null,
                                comment.taste_spicy
                                  ? `Острота ${comment.taste_spicy}`
                                  : null,
                                comment.taste_umami
                                  ? `Умами ${comment.taste_umami}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" | ")}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => setReplyToCommentId(comment.id)}
                            className="mt-2 rounded-full bg-gray-100 px-3 py-1 font-nunito text-xs text-umami-dark-gray"
                          >
                            Ответить
                          </button>
                        </div>
                      </div>

                      {(groupedComments.children.get(comment.id) || []).length >
                        0 && (
                        <div className="mt-3 space-y-2 border-l-2 border-umami-light-gray/40 pl-4">
                          <p className="font-inter text-xs font-semibold text-umami-gray">
                            Ответы:
                          </p>
                          {(groupedComments.children.get(comment.id) || []).map(
                            (reply) => (
                              <div key={reply.id} className="flex gap-3">
                                <Link
                                  href={`/users/${reply.Author.id}`}
                                  className="h-7.5 w-7.5 shrink-0 rounded-full"
                                >
                                  <Image
                                    width={30}
                                    height={30}
                                    src={getSafeImageUrl(
                                      reply.Author.avatar_url,
                                      "/avatar.jpg"
                                    )}
                                    alt="avatar"
                                    className="h-7.5 w-7.5 rounded-full object-cover"
                                  />
                                </Link>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <Link
                                      href={`/users/${reply.Author.id}`}
                                      className="min-w-0 truncate font-inter text-xs font-semibold text-umami-dark-gray hover:underline"
                                    >
                                      {reply.Author.username}
                                    </Link>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => void handleToggleCommentLike(reply)}
                                        disabled={Boolean(commentLikeBusy[reply.id])}
                                        className="inline-flex shrink-0 items-center gap-1 disabled:opacity-60"
                                      >
                                        <Image
                                          width={18}
                                          height={18}
                                          src={
                                            isCommentLikedByCurrentUser(reply)
                                              ? "/RedHeart.svg"
                                              : "/HeartGray.svg"
                                          }
                                          alt="reply-like"
                                        />
                                        <span className="font-nunito text-xs text-umami-gray">
                                          {getCommentLikesCount(reply)}
                                        </span>
                                      </button>
                                      {(canModerate || Boolean(currentUserId)) && (
                                        <div className="relative">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCommentActionsOpenId((prev) =>
                                                prev === String(reply.id) ? null : String(reply.id)
                                              )
                                            }
                                            className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-[#f4f1e8]"
                                          >
                                            <Image width={16} height={16} src="/DotsThreeOutlineVertical.svg" alt="actions" />
                                          </button>
                                          {commentActionsOpenId === String(reply.id) && (
                                            <div className="absolute right-0 top-7 z-20 min-w-[170px] rounded-xl border border-umami-light-gray/60 bg-white p-1 shadow-md">
                                              <button
                                                type="button"
                                                onClick={() => void handleReportComment(reply)}
                                                className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-umami-dark-gray hover:bg-[#f7f4ea]"
                                              >
                                                Пожаловаться
                                              </button>
                                              {canModerate ? (
                                              <button
                                                type="button"
                                                disabled={Boolean(deleteCommentBusy[String(reply.id)])}
                                                onClick={() => void handleDeleteComment(String(reply.id))}
                                                className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
                                              >
                                                Удалить комментарий
                                              </button>
                                              ) : null}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <p className="font-inter text-sm text-umami-gray">
                                    {reply.content}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="hidden w-63.75 lg:flex">
        <RightPart />
      </div>
    </div>
  );
}


