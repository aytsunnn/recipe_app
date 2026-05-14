"use client";

import { useEffect, useMemo, useState } from "react";
import LeftPart from "../components/MainScreen/NavigationLeftPart";
import RightPart from "../components/MainScreen/NewsRightPart";
import { authService } from "../services/authService";
import {
  moderationService,
  ModerationReport,
  ModerationUser,
} from "../services/moderationService";
import { canAccessModeration } from "../utils/role";

const toIdList = (value: string): number[] =>
  value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

export default function ModerationPage() {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [users, setUsers] = useState<ModerationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [recipeId, setRecipeId] = useState("");
  const [commentId, setCommentId] = useState("");
  const [userId, setUserId] = useState("");
  const [bulkUserIds, setBulkUserIds] = useState("");
  const [bulkRecipeIds, setBulkRecipeIds] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [nextReports, nextUsers] = await Promise.all([
        moderationService.getReports(),
        moderationService.getUsers(),
      ]);
      setReports(nextReports);
      setUsers(nextUsers);
    } catch (error) {
      console.error("Ошибка загрузки модерации:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const me = await authService.getCurrentUser();
      const allowed = canAccessModeration(me?.role);
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
          Доступ к модерации только для ролей Moderator и Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full gap-5">
      <div className="hidden w-55.75 lg:flex">
        <LeftPart />
      </div>

      <div className="w-full pb-10 lg:w-169.5">
        <div className="flex flex-col gap-4">
          <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
            <h1 className="font-nunito text-2xl font-bold text-umami-dark-gray">
              Модерация
            </h1>
            <p className="mt-1 text-sm text-umami-gray">
              Жалобы: {reports.length} • Пользователи: {users.length} •
              Заблокировано: {blockedUsersCount}
            </p>
          </div>

          <div className="rounded-[20px] border border-umami-light-gray/50 bg-white p-5">
            <h2 className="font-nunito text-lg font-bold text-umami-dark-gray">
              Жалобы на посты и комментарии
            </h2>
            {loading ? (
              <p className="mt-3 text-sm text-umami-gray">Загрузка...</p>
            ) : reports.length === 0 ? (
              <p className="mt-3 text-sm text-umami-gray">Жалоб пока нет</p>
            ) : (
              <div className="mt-3 space-y-2">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-xl border border-umami-light-gray/50 p-3"
                  >
                    <p className="text-sm font-bold text-umami-dark-gray">
                      #{report.id} • {report.type || "unknown"} •{" "}
                      {report.status || "pending"}
                    </p>
                    <p className="mt-1 text-sm text-umami-gray">
                      {report.reason || "Без причины"}
                    </p>
                    {report.description ? (
                      <p className="mt-1 text-sm text-umami-gray">
                        {report.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-umami-light-gray">
                      recipe_id: {String(report.recipe_id ?? "—")} •
                      reported_user_id: {String(report.reported_user_id ?? "—")}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {(["reviewed", "resolved", "dismissed"] as const).map(
                        (status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={actionLoading === `report-${report.id}`}
                            onClick={() =>
                              void runAction(`report-${report.id}`, () =>
                                moderationService.updateReportStatus(
                                  report.id,
                                  status
                                )
                              )
                            }
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-umami-dark-gray"
                          >
                            {status}
                          </button>
                        )
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
          </div>
        </div>
      </div>

      <div className="hidden w-63.75 lg:flex">
        <RightPart />
      </div>
    </div>
  );
}
