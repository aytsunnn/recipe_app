"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useState, useEffect, useRef } from "react";
import { likeService } from "../services/likeService";
import { commentService, Comment } from "../services/commentService";
import { followService } from "../services/followService";
import { favoriteService } from "../services/favoriteService";
import { authService } from "../services/authService";
import { moderationService } from "../services/moderationService";
import { normalizeImageUrl } from "../utils/imageUrl";
import { canAccessModeration } from "../utils/role";
import { useUiFeedback } from "./UiFeedbackProvider";

const FEED_RETURN_STATE_KEY = "feed_return_state_v1";

interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string;
  difficulty: string;
  image_url: string | null;
  is_private: boolean;
  kitchen_id: string | null;
  celebration_id: string | null;
  cooking_id: string | null;
  portion: number;
  calorific: number | null;
  cooking_time: number;
  createdAt: string;
  views_count?: number;
  User: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
  };
  Kitchen: {
    id: string;
    name: string;
  } | null;
  Likes: Array<{ id: string; user_id: string }>;
  Comments?: Array<{ id: string }>;
  _count?: {
    Likes: number;
    Comments: number;
  };
  total_reviews?: number | string | null;
  comments_count?: number | string | null;
}

interface FeedCardProps {
  recipe: Recipe;
  isFollowing?: boolean;
  currentUserId?: string;
  showComments?: boolean;
  showAuthorHeader?: boolean;
  detailsQuery?: string;
  footerRightSlot?: ReactNode;
  headerLeftSlot?: ReactNode;
  headerRightSlot?: ReactNode;
}

export default function FeedCard({
  recipe,
  isFollowing = false,
  currentUserId,
  showComments = false,
  showAuthorHeader = true,
  detailsQuery,
  footerRightSlot,
  headerLeftSlot,
  headerRightSlot,
}: FeedCardProps) {
  const { toast, confirm, requestReport } = useUiFeedback();
  const saveFeedReturnState = () => {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        path: `${window.location.pathname}${window.location.search}`,
        recipeId: String(recipe.id),
        scrollY: window.scrollY,
        savedAt: Date.now(),
      };
      window.sessionStorage.setItem(FEED_RETURN_STATE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  };
  const formatPublishedAgo = (createdAt?: string) => {
    if (!createdAt) return "";
    const created = new Date(createdAt).getTime();
    if (Number.isNaN(created)) return "";
    const diffMs = Date.now() - created;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const month = 30 * day;
    const year = 365 * day;

    if (diffMs < minute) return "С‚РѕР»СЊРєРѕ С‡С‚Рѕ";
    if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} РјРёРЅСѓС‚ РЅР°Р·Р°Рґ`;
    if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))} С‡ РЅР°Р·Р°Рґ`;
    if (diffMs < month) return `${Math.max(1, Math.floor(diffMs / day))} Рґ РЅР°Р·Р°Рґ`;
    if (diffMs < year) return `${Math.max(1, Math.floor(diffMs / month))} Рј РЅР°Р·Р°Рґ`;
    if (diffMs >= year) {
      return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(created));
    }

    return "";
  };

  const publishedAgo = formatPublishedAgo(recipe.createdAt);
  const exactPublishedAt = (() => {
    const date = new Date(recipe.createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  })();
  const [following, setFollowing] = useState(isFollowing);
  const [justFollowed, setJustFollowed] = useState(false); // РћС‚СЃР»РµР¶РёРІР°РµРј РїРѕРґРїРёСЃРєСѓ РІ С‚РµРєСѓС‰РµР№ СЃРµСЃСЃРёРё
  const [lastComment, setLastComment] = useState<Comment | null>(null);
  const [loadingComment, setLoadingComment] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [metaInfoOpen, setMetaInfoOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const metaInfoRef = useRef<HTMLDivElement | null>(null);

  // РџСЂРѕРІРµСЂСЏРµРј, СЏРІР»СЏРµС‚СЃСЏ Р»Рё С‚РµРєСѓС‰РёР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ Р°РІС‚РѕСЂРѕРј РїРѕСЃС‚Р°
  const isOwnPost = currentUserId && currentUserId === recipe.user_id;

  // РџСЂРѕРІРµСЂСЏРµРј, Р°РІС‚РѕСЂРёР·РѕРІР°РЅ Р»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ
  const isAuthenticated = !!currentUserId;

  // РџСЂРѕРІРµСЂСЏРµРј, Р»Р°Р№РєРЅСѓР» Р»Рё С‚РµРєСѓС‰РёР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ СЌС‚РѕС‚ СЂРµС†РµРїС‚
  const isLikedByUser = currentUserId
    ? recipe.Likes?.some((like) => like.user_id === currentUserId)
    : false;

  const [isLiked, setIsLiked] = useState(isLikedByUser);
  const [likesCount, setLikesCount] = useState(
    recipe._count?.Likes ?? recipe.Likes?.length ?? 0
  );
  const resolveCommentsCount = () => {
    const totalReviews =
      typeof recipe.total_reviews === "string"
        ? Number(recipe.total_reviews)
        : recipe.total_reviews;
    if (typeof totalReviews === "number" && Number.isFinite(totalReviews)) {
      return totalReviews;
    }

    const commentsCountRaw =
      typeof recipe.comments_count === "string"
        ? Number(recipe.comments_count)
        : recipe.comments_count;
    if (
      typeof commentsCountRaw === "number" &&
      Number.isFinite(commentsCountRaw)
    ) {
      return commentsCountRaw;
    }

    const fromCount = recipe._count?.Comments;
    if (typeof fromCount === "number") return fromCount;

    return recipe.Comments?.length ?? 0;
  };
  const [commentsCountState, setCommentsCountState] = useState(
    resolveCommentsCount()
  );
  const commentsCount = commentsCountState;

  // РЎРёРЅС…СЂРѕРЅРёР·РёСЂСѓРµРј СЃРѕСЃС‚РѕСЏРЅРёРµ following СЃ РїСЂРѕРїСЃРѕРј isFollowing
  useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing]);

  // РћР±РЅРѕРІР»СЏРµРј СЃРѕСЃС‚РѕСЏРЅРёРµ Р»Р°Р№РєР° РїСЂРё РёР·РјРµРЅРµРЅРёРё currentUserId РёР»Рё РґР°РЅРЅС‹С… СЂРµС†РµРїС‚Р°
  useEffect(() => {
    const liked = currentUserId
      ? recipe.Likes?.some((like) => like.user_id === currentUserId)
      : false;
    setIsLiked(liked);
  }, [currentUserId, recipe.Likes]);

  useEffect(() => {
    const next = resolveCommentsCount();
    setCommentsCountState(next);
  }, [
    recipe._count?.Comments,
    recipe.total_reviews,
    recipe.comments_count,
    recipe.Comments?.length,
  ]);

  useEffect(() => {
    let cancelled = false;
    commentService
      .getByRecipe(recipe.id)
      .then((comments) => {
        if (!cancelled) {
          setCommentsCountState(comments.length);
        }
      })
      .catch(() => {
        // fallback already handled by resolveCommentsCount
      });

    return () => {
      cancelled = true;
    };
  }, [recipe.id]);

  useEffect(() => {
    const raw = localStorage.getItem("recipe_comments_overrides");
    if (!raw) return;
    try {
      const map = JSON.parse(raw) as Record<string, number>;
      const override = map[recipe.id];
      if (Number.isFinite(override)) {
        setCommentsCountState((prev) => Math.max(prev, Number(override)));
      }
    } catch {
      // ignore broken localStorage
    }
  }, [recipe.id]);

  useEffect(() => {
    const handleRecipeCommentsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        recipeId: string;
        commentsCount: number;
      }>;
      if (!customEvent.detail) return;
      if (customEvent.detail.recipeId !== recipe.id) return;
      setCommentsCountState(Math.max(0, customEvent.detail.commentsCount));
    };

    window.addEventListener(
      "recipe-comments-updated",
      handleRecipeCommentsUpdated
    );
    return () => {
      window.removeEventListener(
        "recipe-comments-updated",
        handleRecipeCommentsUpdated
      );
    };
  }, [recipe.id]);

  useEffect(() => {
    let cancelled = false;
    const loadRole = async () => {
      if (!authService.isAuthenticated()) {
        if (!cancelled) setCanModerate(false);
        return;
      }
      const me = await authService.getCurrentUser();
      const role = me?.role || authService.getRoleFromToken();
      if (!cancelled) setCanModerate(canAccessModeration(role));
    };
    void loadRole();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!actionsOpen) return;
      const target = event.target as Node;
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(target)) {
        setActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [actionsOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!metaInfoOpen) return;
      const target = event.target as Node;
      if (metaInfoRef.current && !metaInfoRef.current.contains(target)) {
        setMetaInfoOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [metaInfoOpen]);

  useEffect(() => {
    let cancelled = false;
    const loadFavoriteState = async () => {
      if (!isAuthenticated) {
        setIsFavorite(false);
        return;
      }
      try {
        const favorite = await favoriteService.checkIsFavorite(recipe.id);
        if (!cancelled) setIsFavorite(favorite);
      } catch {
        if (!cancelled) setIsFavorite(false);
      }
    };
    void loadFavoriteState();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, recipe.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(FEED_RETURN_STATE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as {
        path?: string;
        recipeId?: string;
        scrollY?: number;
        savedAt?: number;
      };
      const currentPath = `${window.location.pathname}${window.location.search}`;
      const isSamePath = state.path === currentPath;
      const isSameRecipe = String(state.recipeId || "") === String(recipe.id);
      if (!isSamePath || !isSameRecipe) return;

      const scrollTarget = document.getElementById(`feed-card-${recipe.id}`);
      if (!scrollTarget) return;

      window.requestAnimationFrame(() => {
        if (typeof state.scrollY === "number" && Number.isFinite(state.scrollY)) {
          window.scrollTo({ top: Math.max(0, state.scrollY), behavior: "auto" });
        } else {
          scrollTarget.scrollIntoView({ behavior: "auto", block: "start" });
        }
        scrollTarget.classList.add("ring-2", "ring-umami-orange/40");
        window.setTimeout(() => {
          scrollTarget.classList.remove("ring-2", "ring-umami-orange/40");
        }, 1400);
      });

      window.sessionStorage.removeItem(FEED_RETURN_STATE_KEY);
    } catch {
      // ignore
    }
  }, [recipe.id]);

  // Р—Р°РіСЂСѓР¶Р°РµРј РїРѕСЃР»РµРґРЅРёР№ РєРѕРјРјРµРЅС‚Р°СЂРёР№, РµСЃР»Рё РЅСѓР¶РЅРѕ РїРѕРєР°Р·С‹РІР°С‚СЊ РєРѕРјРјРµРЅС‚Р°СЂРёРё
  useEffect(() => {
    if (showComments && commentsCount > 0) {
      setLoadingComment(true);
      commentService
        .getByRecipe(recipe.id)
        .then((comments) => {
          if (comments.length > 0) {
            // Р‘РµСЂРµРј РїРѕСЃР»РµРґРЅРёР№ РєРѕРјРјРµРЅС‚Р°СЂРёР№
            setLastComment(comments[comments.length - 1]);
          }
        })
        .catch((error) => {
          console.error("РћС€РёР±РєР° РїСЂРё Р·Р°РіСЂСѓР·РєРµ РєРѕРјРјРµРЅС‚Р°СЂРёРµРІ:", error);
        })
        .finally(() => {
          setLoadingComment(false);
        });
    }
  }, [showComments, recipe.id, commentsCount]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast("РќРµРѕР±С…РѕРґРёРјРѕ Р°РІС‚РѕСЂРёР·РѕРІР°С‚СЊСЃСЏ", "error");
      return;
    }

    const previousFollowing = following;
    const previousJustFollowed = justFollowed;

    try {
      if (justFollowed) {
        // РћС‚РїРёСЃС‹РІР°РµРјСЃСЏ (РєРЅРѕРїРєР° "РџРѕРґРїРёСЃРєРё")
        setFollowing(false);
        setJustFollowed(false);
        await followService.unfollow(recipe.user_id);
        console.log(`РЈСЃРїРµС€РЅРѕ РѕС‚РїРёСЃР°Р»РёСЃСЊ РѕС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ ${recipe.user_id}`);
      } else {
        // РџРѕРґРїРёСЃС‹РІР°РµРјСЃСЏ (РєРЅРѕРїРєР° "РџРѕРґРїРёСЃР°С‚СЊСЃСЏ")
        setFollowing(true);
        setJustFollowed(true);
        await followService.follow(recipe.user_id);
        console.log(`РЈСЃРїРµС€РЅРѕ РїРѕРґРїРёСЃР°Р»РёСЃСЊ РЅР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ ${recipe.user_id}`);
      }
    } catch (error) {
      console.error("РћС€РёР±РєР° РїСЂРё РѕР±СЂР°Р±РѕС‚РєРµ РїРѕРґРїРёСЃРєРё:", error);
      // РћС‚РєР°С‚С‹РІР°РµРј РёР·РјРµРЅРµРЅРёСЏ РїСЂРё РѕС€РёР±РєРµ
      setFollowing(previousFollowing);
      setJustFollowed(previousJustFollowed);
      toast("РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±СЂР°Р±РѕС‚Р°С‚СЊ РїРѕРґРїРёСЃРєСѓ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰Рµ СЂР°Р·.", "error");
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast("РќРµРѕР±С…РѕРґРёРјРѕ Р°РІС‚РѕСЂРёР·РѕРІР°С‚СЊСЃСЏ", "error");
      return;
    }

    // РћРїС‚РёРјРёСЃС‚РёС‡РЅРѕРµ РѕР±РЅРѕРІР»РµРЅРёРµ UI
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    try {
      if (isLiked) {
        // РЎСЂР°Р·Сѓ РѕР±РЅРѕРІР»СЏРµРј UI
        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
        // РЈР±РёСЂР°РµРј Р»Р°Р№Рє РЅР° СЃРµСЂРІРµСЂРµ
        await likeService.delete(recipe.id);
      } else {
        // РЎСЂР°Р·Сѓ РѕР±РЅРѕРІР»СЏРµРј UI
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
        // РЎС‚Р°РІРёРј Р»Р°Р№Рє РЅР° СЃРµСЂРІРµСЂРµ
        await likeService.create(recipe.id);
      }
    } catch (error) {
      console.error("РћС€РёР±РєР° РїСЂРё РѕР±СЂР°Р±РѕС‚РєРµ Р»Р°Р№РєР°:", error);
      // РћС‚РєР°С‚С‹РІР°РµРј РёР·РјРµРЅРµРЅРёСЏ РїСЂРё РѕС€РёР±РєРµ
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      toast("РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±СЂР°Р±РѕС‚Р°С‚СЊ Р»Р°Р№Рє. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰Рµ СЂР°Р·.", "error");
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast("РќРµРѕР±С…РѕРґРёРјРѕ Р°РІС‚РѕСЂРёР·РѕРІР°С‚СЊСЃСЏ", "error");
      return;
    }

    const prev = isFavorite;
    try {
      setIsFavorite(!prev);
      if (prev) {
        await favoriteService.removeFromFavorites(recipe.id);
      } else {
        await favoriteService.addToFavorites(recipe.id);
      }
    } catch (error) {
      setIsFavorite(prev);
      console.error("РћС€РёР±РєР° РїСЂРё СЂР°Р±РѕС‚Рµ СЃ РёР·Р±СЂР°РЅРЅС‹Рј:", error);
      toast("РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ РёР·Р±СЂР°РЅРЅРѕРµ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰Рµ СЂР°Р·.", "error");
    }
  };

  const buildRecipeLink = (tab?: "comments") => {
    const params = new URLSearchParams();
    if (detailsQuery) {
      const fromIncoming = new URLSearchParams(detailsQuery);
      fromIncoming.forEach((value, key) => params.set(key, value));
    }
    if (tab) params.set("tab", tab);
    const query = params.toString();
    return `/recipes/${recipe.id}${query ? `?${query}` : ""}`;
  };

  const handleDeleteRecipe = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleteBusy) return;
    const confirmed = await confirm("Удалить рецепт?");
    if (!confirmed) return;
    try {
      setDeleteBusy(true);
      await moderationService.deleteRecipe(String(recipe.id));
      setActionsOpen(false);
      setIsDeleted(true);
    } catch (error) {
      console.error("РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ СЂРµС†РµРїС‚Р°:", error);
      toast("РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ СЂРµС†РµРїС‚", "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleReportRecipe = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast("РќРµРѕР±С…РѕРґРёРјРѕ Р°РІС‚РѕСЂРёР·РѕРІР°С‚СЊСЃСЏ", "error");
      return;
    }
    const reportPayload = await requestReport();
    if (!reportPayload) return;
    try {
      await moderationService.createReport({
        type: "recipe",
        reason: reportPayload.reason.trim(),
        description: reportPayload.description.trim(),
        recipe_id: Number(recipe.id),
        reported_user_id: Number(recipe.user_id),
      });
      setActionsOpen(false);
      toast("Р–Р°Р»РѕР±Р° РѕС‚РїСЂР°РІР»РµРЅР°", "success");
    } catch (error) {
      console.error("РћС€РёР±РєР° РѕС‚РїСЂР°РІРєРё Р¶Р°Р»РѕР±С‹:", error);
      toast("РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ Р¶Р°Р»РѕР±Сѓ", "error");
    }
  };

  if (isDeleted) return null;

  return (
    <div
      id={`feed-card-${recipe.id}`}
      className="rounded-lg w-full flex flex-col bg-white border border-umami-light-gray/50 p-4 gap-2.5 transition-shadow"
    >
      {showAuthorHeader && (
        <div className="flex items-start gap-2.5">
          <Link
            href={`/users/${recipe.user_id}`}
            onClick={saveFeedReturnState}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              <Image
                width={40}
                height={40}
                src={normalizeImageUrl(recipe.User.avatar_url, "/avatar.jpg")}
                className="w-full h-full object-cover"
                alt="avatar"
              />
            </div>
            <div className="min-w-0 flex flex-col">
              <p className="font-inter text-sm font-medium text-umami-dark-gray">
                {recipe.User.name}
              </p>
              <p className="truncate font-inter text-xs text-umami-light-gray">
                @{recipe.User.username}
              </p>
            </div>
          </Link>
          <div className="flex items-center">
            {isAuthenticated && !isOwnPost && (
              <>
                {/* РџРѕРєР°Р·С‹РІР°РµРј "РџРѕРґРїРёСЃР°С‚СЊСЃСЏ" РµСЃР»Рё РЅРµ РїРѕРґРїРёСЃР°РЅ Рё РЅРµ РїРѕРґРїРёСЃР°Р»СЃСЏ С‚РѕР»СЊРєРѕ С‡С‚Рѕ */}
                {!following && !justFollowed && (
                  <button
                    onClick={handleFollow}
                    className="custom-button bg-umami-green font-inter font-medium text-xs h-7"
                  >
                    РџРѕРґРїРёСЃР°С‚СЊСЃСЏ
                  </button>
                )}
                {/* РџРѕРєР°Р·С‹РІР°РµРј "РџРѕРґРїРёСЃРєРё" РµСЃР»Рё С‚РѕР»СЊРєРѕ С‡С‚Рѕ РїРѕРґРїРёСЃР°Р»СЃСЏ РІ Р»РµРЅС‚Рµ */}
                {justFollowed && (
                  <button
                    onClick={handleFollow}
                    className="custom-button bg-umami-gray font-inter font-medium text-xs h-7"
                  >
                    РџРѕРґРїРёСЃРєРё
                  </button>
                )}
                {/* Р•СЃР»Рё Р±С‹Р» РїРѕРґРїРёСЃР°РЅ РёР·РЅР°С‡Р°Р»СЊРЅРѕ (following && !justFollowed) - РЅРёС‡РµРіРѕ РЅРµ РїРѕРєР°Р·С‹РІР°РµРј */}
              </>
            )}
            {(canModerate || isAuthenticated) && (
              <div ref={actionsMenuRef} className="relative ml-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActionsOpen((prev) => !prev);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#f4f1e8]"
                  aria-label="Р”РµР№СЃС‚РІРёСЏ РјРѕРґРµСЂР°С†РёРё"
                >
                  <Image
                    width={20}
                    height={20}
                    src="/DotsThreeOutlineVertical.svg"
                    alt="actions"
                  />
                </button>
                {actionsOpen && (
                  <div className="absolute right-0 top-8 z-20 min-w-[150px] rounded-xl border border-umami-light-gray/60 bg-white p-1 shadow-md">
                    <button
                      type="button"
                      onClick={handleReportRecipe}
                      className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-umami-dark-gray hover:bg-[#f7f4ea]"
                    >
                      РџРѕР¶Р°Р»РѕРІР°С‚СЊСЃСЏ
                    </button>
                    {canModerate ? (
                    <button
                      type="button"
                      disabled={deleteBusy}
                      onClick={handleDeleteRecipe}
                      className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
                    >
                      РЈРґР°Р»РёС‚СЊ СЂРµС†РµРїС‚
                    </button>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {!showAuthorHeader && (headerLeftSlot || headerRightSlot) ? (
        <div className="flex items-center justify-between">
          <div>{headerLeftSlot}</div>
          <div>{headerRightSlot}</div>
        </div>
      ) : null}

      <Link href={buildRecipeLink()} onClick={saveFeedReturnState} className="block">
        <div className="relative w-full overflow-hidden rounded-lg bg-[#d9d9d9]">
          <Image
            width={600}
            height={400}
            src={normalizeImageUrl(recipe.image_url, "/placeholder.jpg")}
            className="h-auto w-full rounded-lg object-contain"
            alt="recipe"
            quality={95}
          />
          <div className="absolute top-2.5 right-2.5">
            <button
              onClick={handleFavorite}
              className="bg-white w-9 h-9 rounded-full flex items-center justify-center"
            >
              <Image
                width={20}
                height={20}
                src={isFavorite ? "/FavoritesCurrent.svg" : "/Favorites.svg"}
                alt="favorites"
              />
            </button>
          </div>
          <div className="absolute bottom-2.5 right-2.5">
            <div className="bg-white p-2 rounded-full flex items-center justify-center gap-4">
              <div className="flex gap-1 items-center">
                <Image width={20} height={20} src="/Time.svg" alt="time" />
                <p className="font-inter font-regular text-sm text-umami-dark-gray">
                  {recipe.cooking_time} РјРёРЅ
                </p>
              </div>
              <div className="flex gap-1 items-center">
                <Image
                  width={20}
                  height={20}
                  src="/Difficulty.svg"
                  alt="difficulty"
                />
                <p className="font-inter font-regular text-sm text-umami-dark-gray">
                  {recipe.difficulty}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <p className="w-full font-inter font-medium text-lg text-umami-dark-gray">
            {recipe.title}
          </p>
          <p className="font-inter font-regular text-sm text-umami-gray">
            {recipe.description}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-row gap-2">
          <div className="flex gap-1 items-center">
            <button onClick={handleLike} className="cursor-pointer">
              <Image
                width={24}
                height={24}
                src={isLiked ? "/RedHeart.svg" : "/Heart.svg"}
                className="w-6 h-6"
                alt="like"
              />
            </button>
            <p className="font-inter text-sm text-umami-gray">{likesCount}</p>
          </div>
          <div className="flex gap-1 items-center">
            <Link href={buildRecipeLink("comments")} onClick={saveFeedReturnState}>
              <Image
                width={24}
                height={24}
                src="/ChatCircle.svg"
                className="w-6 h-6"
                alt="comments"
              />
            </Link>
            <p className="font-inter text-sm text-umami-gray">
              {commentsCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {publishedAgo ? (
            <div ref={metaInfoRef} className="relative">
              <button
                type="button"
                onClick={() => setMetaInfoOpen((prev) => !prev)}
                className="font-inter text-xs text-umami-light-gray hover:text-umami-dark-gray"
              >
                {publishedAgo}
              </button>
              {metaInfoOpen ? (
                <div className="absolute bottom-6 right-0 z-20 min-w-[180px] rounded-xl border border-umami-light-gray/60 bg-white p-2 shadow-md">
                  <p className="font-inter text-xs text-umami-dark-gray">
                    {exactPublishedAt}
                  </p>
                  <p className="mt-1 font-inter text-xs text-umami-gray">
                    РџСЂРѕСЃРјРѕС‚СЂРѕРІ: {recipe.views_count ?? 0}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          {footerRightSlot}
        </div>
      </div>

      {/* Р‘Р»РѕРє РїРѕСЃР»РµРґРЅРµРіРѕ РєРѕРјРјРµРЅС‚Р°СЂРёСЏ */}
      {showComments && commentsCount > 0 && (
        <div className="border-t border-umami-light-gray/50 pt-2.5">
          {loadingComment ? (
            <p className="font-inter text-xs text-umami-gray">
              Р—Р°РіСЂСѓР·РєР° РєРѕРјРјРµРЅС‚Р°СЂРёСЏ...
            </p>
          ) : lastComment ? (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                <Image
                  width={32}
                  height={32}
                  src={normalizeImageUrl(
                    lastComment.Author.avatar_url,
                    "/avatar.jpg"
                  )}
                  className="w-full h-full object-cover"
                  alt="avatar"
                />
              </div>
              <div className="flex flex-col flex-1">
                <p className="font-inter text-xs font-medium text-umami-dark-gray">
                  @{lastComment.Author.username}
                </p>
                <p className="font-inter text-sm text-umami-gray">
                  {lastComment.content}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}


