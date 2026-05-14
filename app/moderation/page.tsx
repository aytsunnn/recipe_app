"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LeftPart from "../components/MainScreen/NavigationLeftPart";
import { authService } from "../services/authService";
import {
  moderationService,
  ModerationReport,
  ModerationUser,
} from "../services/moderationService";
import { canAccessModeration, isAdminRole } from "../utils/role";

const toIdList = (value: string): number[] =>
  value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

export default function ModerationPage() {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [users, setUsers] = useState<ModerationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [recipeId, setRecipeId] = useState("");
  const [commentId, setCommentId] = useState("");
  const [userId, setUserId] = useState("");
  const [bulkUserIds, setBulkUserIds] = useState("");
  const [bulkRecipeIds, setBulkRecipeIds] = useState("");
  const [reportsFilter, setReportsFilter] = useState<
    "in_work" | "resolved_group"
  >("in_work");

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsResult, usersResult] = await Promise.allSettled([
        moderationService.getReports(),
        moderationService.getUsers(),
      ]);

      if (reportsResult.status === "fulfilled") {
        setReports(reportsResult.value);
      } else {
        console.error("Ошибка загрузки жалоб:", reportsResult.reason);
        setReports([]);
      }

      if (usersResult.status === "fulfilled") {
        setUsers(usersResult.value);
      } else {
        console.error(
          "Ошибка загрузки пользователей модерации:",
          usersResult.reason
        );
        setUsers([]);
      }
    } catch (error) {
      console.error("Ошибка загрузки модерации:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const me = await authService.getCurrentUser();
      const role = me?.role || authService.getRoleFromToken();
      const allowed = canAccessModeration(role);
      setIsAdmin(isAdminRole(role));
      setIsAllowed(allowed);
      if (!allowed) return;
      await loadData();
    };
    void bootstrap();
  }, []);

  const blockedUsersCount = useMemo(
    () => users.filter((user) => user.is_blocked).length,
    [users]
  );
  const filteredReports = useMemo(() => {
    if (reportsFilter === "in_work") {
      return reports.filter((report) => {
        const status = (report.status || "").toLowerCase();
        return status === "pending" || status === "reviewed";
      });
    }
    return reports.filter((report) => {
      const status = (report.status || "").toLowerCase();
      return status === "resolved" || status === "dismissed";
    });
  }, [reports, reportsFilter]);

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const isSameMoment = (left?: string, right?: string): boolean => {
    if (!left || !right) return false;
    const leftTime = new Date(left).getTime();
    const rightTime = new Date(right).getTime();
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return false;
    return leftTime === rightTime;
  };

  const getReporterLabel = (report: ModerationReport) => {
    if (report.Reporter?.name) return report.Reporter.name;
    if (report.Reporter?.username) return `@${report.Reporter.username}`;
    if (report.reporter_user_id) return `ID ${report.reporter_user_id}`;
    return "Неизвестно";
  };

  const getTargetLabel = (report: ModerationReport) => {
    const commentId = getReportCommentId(report);
    const hasCommentTarget = Boolean(commentId);
    if (hasCommentTarget) {
      return `Комментарий ID ${commentId}`;
    }

    if (report.type === "recipe") {
      if (report.Recipe?.title) {
        return `Рецепт: ${report.Recipe.title} (ID ${
          report.recipe_id ?? report.Recipe.id ?? "—"
        })`;
      }
      return `Рецепт ID ${report.recipe_id ?? "—"}`;
    }
    if (report.type === "profile" || report.type === "user") {
      if (report.ReportedUser?.username || report.ReportedUser?.name) {
        return `Пользователь: ${report.ReportedUser?.name || "—"} (@${
          report.ReportedUser?.username || "—"
        })`;
      }
      return `Пользователь ID ${report.reported_user_id ?? "—"}`;
    }
    return `Тип: ${report.type || "unknown"}`;
  };

  const getTypeRu = (type?: string) => {
    const normalized = (type || "").toLowerCase();
    if (normalized === "recipe") return "Рецепт";
    if (normalized === "profile") return "Профиль";
    if (normalized === "user") return "Пользователь";
    if (normalized === "comment") return "Комментарий";
    return type || "Неизвестно";
  };

  const getStatusRu = (status?: string) => {
    const normalized = (status || "").toLowerCase();
    if (normalized === "pending") return "Новая";
    if (normalized === "reviewed") return "В работе";
    if (normalized === "resolved") return "Принято";
    if (normalized === "dismissed") return "Отказано";
    return status || "Неизвестно";
  };

  const getTargetHref = (report: ModerationReport): string | null => {
    const commentId = getReportCommentId(report);
    if (commentId && report.recipe_id) {
      return `/recipes/${report.recipe_id}?tab=comments&commentId=${commentId}#comment-${commentId}`;
    }
    if (report.type === "recipe" && report.recipe_id) {
      return `/recipes/${report.recipe_id}`;
    }
    if (
      (report.type === "profile" || report.type === "user") &&
      report.reported_user_id
    ) {
      return `/users/${report.reported_user_id}`;
    }
    return null;
  };

  const getUnavailableTargetMessage = (
    report: ModerationReport
  ): string | null => {
    const commentId = getReportCommentId(report);
    const hasCommentTarget = Boolean(commentId);
    const type = (report.type || "").toLowerCase();

    if (hasCommentTarget) {
      return null;
    }

    if (type === "recipe") {
      if (!report.recipe_id && !report.Recipe?.id) {
        return "Пост (рецепт) не существует или удален";
      }
      return null;
    }

    if (type === "profile" || type === "user") {
      if (report.ReportedUser?.is_blocked) return "Пользователь заблокирован";
      if (!report.reported_user_id && !report.ReportedUser?.id) {
        return "Пользователь удален или недоступен";
      }
      return null;
    }

    return null;
  };

  const getReportCommentId = (report: ModerationReport): string | null => {
    if (report.comment_id !== null && report.comment_id !== undefined) {
      return String(report.comment_id);
    }
    const description = report.description || "";
    const match = description.match(/comment_id\s*=\s*(\d+)/i);
    return match?.[1] || null;
  };

  const runAction = async (key: string, action: () => Promise<void>) => {
    try {
      setActionLoading(key);
      await action();
      await loadData();
    } catch (error) {
      console.error("Ошибка действия модерации:", error);
      alert(
        error instanceof Error
          ? `Не удалось выполнить действие: ${error.message}`
          : "Не удалось выполнить действие"
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (isAllowed === false) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="rounded-2xl bg-white px-5 py-4 text-sm text-umami-gray">
          Доступ к панели только для ролей Moderator и Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full gap-5">
      <div className="hidden w-55.75 lg:flex">
        <LeftPart />
      </div>

      <div className="w-full pb-10 lg:w-[calc(100%-223px-20px)]">
        <div className="flex flex-col gap-4">
          <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-nunito text-lg font-bold text-umami-dark-gray">
                  Жалобы
                </h2>
                <p className="mt-1 text-sm text-umami-gray">
                  Всего: {reports.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReportsFilter("in_work")}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    reportsFilter === "in_work"
                      ? "bg-umami-orange text-white"
                      : "bg-gray-100 text-umami-dark-gray"
                  }`}
                >
                  В работе
                </button>
                <button
                  type="button"
                  onClick={() => setReportsFilter("resolved_group")}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    reportsFilter === "resolved_group"
                      ? "bg-umami-orange text-white"
                      : "bg-gray-100 text-umami-dark-gray"
                  }`}
                >
                  Решенные
                </button>
              </div>
            </div>
            {loading ? (
              <p className="mt-3 text-sm text-umami-gray">Загрузка...</p>
            ) : filteredReports.length === 0 ? (
              <p className="mt-3 text-sm text-umami-gray">Жалоб пока нет</p>
            ) : (
              <div className="mt-3 space-y-2">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-xl border border-umami-light-gray/50 bg-[#fffdfa] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-umami-dark-gray">
                        Жалоба #{report.id}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#f3efe2] px-2 py-0.5 text-xs font-bold text-umami-dark-gray">
                          {getTypeRu(report.type)}
                        </span>
                        <span className="rounded-full bg-[#eaf2e6] px-2 py-0.5 text-xs font-bold text-umami-dark-gray">
                          {getStatusRu(report.status)}
                        </span>
                      </div>
                    </div>

                    {report.Reporter?.id || report.reporter_user_id ? (
                      <Link
                        href={`/users/${
                          report.Reporter?.id || report.reporter_user_id
                        }`}
                        className="mt-3 flex items-center gap-3 rounded-lg border border-umami-light-gray/40 bg-white p-2 hover:bg-[#faf7ef]"
                      >
                        <Image
                          width={40}
                          height={40}
                          src={"/avatar.jpg"}
                          alt="reporter-avatar"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-umami-dark-gray">
                            @{report.Reporter?.username || "unknown"}
                          </p>
                          <p className="truncate text-sm text-umami-gray">
                            {report.Reporter?.name || getReporterLabel(report)}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <div className="mt-3 flex items-center gap-3 rounded-lg border border-umami-light-gray/40 bg-white p-2">
                        <Image
                          width={40}
                          height={40}
                          src={"/avatar.jpg"}
                          alt="reporter-avatar"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-umami-dark-gray">
                            @{report.Reporter?.username || "unknown"}
                          </p>
                          <p className="truncate text-sm text-umami-gray">
                            {report.Reporter?.name || getReporterLabel(report)}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex gap-2">
                      {(
                        [
                          { key: "reviewed", label: "В работе" },
                          { key: "resolved", label: "Принято" },
                          { key: "dismissed", label: "Отказано" },
                        ] as const
                      ).map((status) => {
                        const isActive =
                          (report.status || "").toLowerCase() === status.key;
                        return (
                          <button
                            key={status.key}
                            type="button"
                            disabled={actionLoading === `report-${report.id}`}
                            onClick={() =>
                              void runAction(`report-${report.id}`, () =>
                                moderationService.updateReportStatus(
                                  report.id,
                                  status.key
                                )
                              )
                            }
                            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                              isActive
                                ? "bg-umami-orange text-white ring-2 ring-umami-orange/35"
                                : "bg-gray-100 text-umami-dark-gray hover:bg-gray-200"
                            }`}
                          >
                            {status.label}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-3 text-xs text-umami-light-gray">
                      Причина
                    </p>
                    <p className="text-sm font-semibold text-umami-dark-gray">
                      {report.reason || "Без причины"}
                    </p>

                    {report.description ? (
                      <>
                        <p className="mt-2 text-xs text-umami-light-gray">
                          Описание
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-umami-dark-gray">
                          {report.description}
                        </p>
                      </>
                    ) : null}

                    <p className="mt-2 text-xs text-umami-light-gray">
                      Объект жалобы
                    </p>
                    {getUnavailableTargetMessage(report) ? (
                      <p className="text-sm font-semibold text-red-500">
                        {getUnavailableTargetMessage(report)}
                      </p>
                    ) : getTargetHref(report) ? (
                      <Link
                        href={getTargetHref(report)!}
                        className="text-sm font-semibold text-umami-orange hover:underline"
                      >
                        {getTargetLabel(report)}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-umami-dark-gray">
                        {getTargetLabel(report)}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-3 text-sm text-umami-gray">
                      <p>Создано: {formatDate(report.createdAt)}</p>
                      {!isSameMoment(report.createdAt, report.updatedAt) ? (
                        <p className="text-right">
                          Обновлено: {formatDate(report.updatedAt)}
                        </p>
                      ) : (
                        <span />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
              <h3 className="font-nunito text-base font-bold text-umami-dark-gray">
                Удаление постов / рецептов
              </h3>
              <div className="mt-3 flex gap-2">
                <input
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                  placeholder="ID рецепта"
                  className="w-full rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!recipeId || actionLoading === "delete-recipe"}
                  onClick={() =>
                    void runAction("delete-recipe", () =>
                      moderationService.deleteRecipe(recipeId.trim())
                    )
                  }
                  className="rounded-full bg-red-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  Удалить
                </button>
              </div>

              {isAdmin ? (
                <div className="mt-3 flex gap-2">
                  <input
                    value={bulkRecipeIds}
                    onChange={(e) => setBulkRecipeIds(e.target.value)}
                    placeholder="ID рецептов через запятую"
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={
                      toIdList(bulkRecipeIds).length === 0 ||
                      actionLoading === "bulk-delete-recipes"
                    }
                    onClick={() =>
                      void runAction("bulk-delete-recipes", () =>
                        moderationService.bulkDeleteRecipes(
                          toIdList(bulkRecipeIds)
                        )
                      )
                    }
                    className="rounded-full bg-red-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    Массово
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
              <h3 className="font-nunito text-base font-bold text-umami-dark-gray">
                Удаление комментариев
              </h3>
              <div className="mt-3 flex gap-2">
                <input
                  value={commentId}
                  onChange={(e) => setCommentId(e.target.value)}
                  placeholder="ID комментария"
                  className="w-full rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!commentId || actionLoading === "delete-comment"}
                  onClick={() =>
                    void runAction("delete-comment", () =>
                      moderationService.deleteComment(commentId.trim())
                    )
                  }
                  className="rounded-full bg-red-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
              <h3 className="font-nunito text-base font-bold text-umami-dark-gray">
                Блокировка пользователей
              </h3>
              <div className="mt-3 flex gap-2">
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="ID пользователя"
                  className="w-full rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!userId || actionLoading === "block-user"}
                  onClick={() =>
                    void runAction("block-user", () =>
                      moderationService.blockUser(userId.trim())
                    )
                  }
                  className="rounded-full bg-umami-orange px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  Заблокировать
                </button>
              </div>
            </div>

            {isAdmin ? (
              <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
                <h3 className="font-nunito text-base font-bold text-umami-dark-gray">
                  Массовая блокировка пользователей
                </h3>
                <div className="mt-3 flex gap-2">
                  <input
                    value={bulkUserIds}
                    onChange={(e) => setBulkUserIds(e.target.value)}
                    placeholder="ID пользователей через запятую"
                    className="w-full rounded-full border border-umami-light-gray px-4 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={
                      toIdList(bulkUserIds).length === 0 ||
                      actionLoading === "bulk-block-users"
                    }
                    onClick={() =>
                      void runAction("bulk-block-users", () =>
                        moderationService.bulkBlockUsers(toIdList(bulkUserIds))
                      )
                    }
                    className="rounded-full bg-umami-orange px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    Массово
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
