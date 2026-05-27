"use client";

import { useEffect, useState } from "react";
import { User, authService } from "../services/authService";
import { Appeal, appealService } from "../services/appealService";
import { useUiFeedback } from "./UiFeedbackProvider";

export default function BlockedUserGuard({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useUiFeedback();

  const checkUserStatus = async () => {
    if (!authService.isAuthenticated()) {
      setCurrentUser(null);
      setAppeals([]);
      setIsChecking(false);
      return;
    }

    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      if (user?.is_blocked) {
        // Получаем историю апелляций пользователя
        const userAppeals = await appealService.getMyAppeals();
        setAppeals(userAppeals);
      }
    } catch (error) {
      console.error("Failed to check user status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      checkUserStatus();
    });

    window.addEventListener("auth-change", checkUserStatus);
    return () => {
      window.removeEventListener("auth-change", checkUserStatus);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error(e);
    }
    authService.removeToken();
    authService.dispatchAuthChange();
    window.location.href = "/";
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast("Пожалуйста, введите текст апелляции", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await appealService.submitAppeal(message.trim());
      toast(res.message || "Апелляция успешно отправлена", "success");
      setMessage("");
      // Обновляем список апелляций
      const userAppeals = await appealService.getMyAppeals();
      setAppeals(userAppeals);
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Не удалось отправить апелляцию", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return null;
  }

  // Если аккаунт заблокирован, рендерим красивый экран апелляции
  if (currentUser?.is_blocked) {
    const latestAppeal = appeals[0]; // Сортировка по дате DESC на бэкенде

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#fdfaf2] px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-[600px] rounded-3xl border border-umami-orange/20 bg-white/80 p-6 md:p-8 shadow-xl backdrop-blur-md flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-10 h-10"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h1 className="font-nunito text-2xl md:text-3xl font-extrabold text-umami-dark-gray mt-2">
              Ваш аккаунт заблокирован
            </h1>
            <p className="font-inter text-sm md:text-base text-umami-gray max-w-md">
              Доступ к вашему аккаунту временно ограничен за нарушение правил нашей кулинарной платформы. Вы можете подать апелляцию ниже.
            </p>
          </div>

          <div className="border-t border-umami-light-gray/60 my-1" />

          {latestAppeal && latestAppeal.status === "pending" ? (
            <div className="rounded-2xl bg-umami-orange/5 border border-umami-orange/15 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-nunito text-sm font-bold text-umami-orange">
                  Статус апелляции
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-umami-orange/15 px-2.5 py-1 text-xs font-bold text-umami-orange">
                  На рассмотрении
                </span>
              </div>
              <p className="font-inter text-xs text-umami-gray">
                Вы подали апелляцию {new Date(latestAppeal.createdAt || latestAppeal.created_at || "").toLocaleDateString("ru-RU")}. Наши модераторы рассматривают её. Пожалуйста, ожидайте уведомления.
              </p>
              <div className="rounded-xl bg-white/95 p-3.5 border border-umami-light-gray/50">
                <p className="font-nunito text-xs font-bold text-umami-dark-gray mb-1">
                  Ваше сообщение:
                </p>
                <p className="font-inter text-sm text-umami-dark-gray italic">
                  &ldquo;{latestAppeal.message}&rdquo;
                </p>
              </div>
            </div>
          ) : latestAppeal && latestAppeal.status === "reviewed" ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-red-50 border border-red-100 p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-nunito text-sm font-bold text-red-600">
                    Апелляция отклонена
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600">
                    Рассмотрено
                  </span>
                </div>
                {latestAppeal.admin_notes && (
                  <div className="rounded-xl bg-white/95 p-3.5 border border-red-200/50">
                    <p className="font-nunito text-xs font-bold text-red-700 mb-1">
                      Комментарий модератора:
                    </p>
                    <p className="font-inter text-sm text-umami-dark-gray">
                      {latestAppeal.admin_notes}
                    </p>
                  </div>
                )}
                <p className="font-inter text-xs text-umami-gray mt-1">
                  Вы можете отправить повторную апелляцию, если хотите предоставить дополнительные сведения.
                </p>
              </div>

              <form onSubmit={handleSubmitAppeal} className="flex flex-col gap-3">
                <label className="block">
                  <span className="block font-nunito text-sm font-bold text-umami-dark-gray mb-1.5">
                    Новое обращение
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-2xl border border-umami-light-gray/70 px-4 py-3 text-sm focus:border-umami-orange focus:outline-none bg-white transition-colors"
                    placeholder="Напишите аргументированное сообщение для разблокировки..."
                  />
                  <div className="flex justify-end text-xs text-umami-gray mt-1">
                    {message.length} / 1000 символов
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-full bg-umami-orange font-nunito font-bold text-white shadow-md hover:bg-umami-orange/95 disabled:bg-umami-orange/50 transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? "Отправка..." : "Отправить новую апелляцию"}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmitAppeal} className="flex flex-col gap-4">
              <label className="block">
                <span className="block font-nunito text-sm font-bold text-umami-dark-gray mb-1.5">
                  Текст апелляции
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-2xl border border-umami-light-gray/70 px-4 py-3 text-sm focus:border-umami-orange focus:outline-none bg-white transition-colors"
                  placeholder="Опишите подробно вашу ситуацию, укажите аргументы в пользу разблокировки..."
                />
                <div className="flex justify-end text-xs text-umami-gray mt-1">
                  {message.length} / 1000 символов
                </div>
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-full bg-umami-orange font-nunito font-bold text-white shadow-md hover:bg-umami-orange/95 disabled:bg-umami-orange/50 transition-colors flex items-center justify-center"
              >
                {isSubmitting ? "Отправка..." : "Отправить апелляцию"}
              </button>
            </form>
          )}

          <div className="border-t border-umami-light-gray/60 my-1" />

          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-11 rounded-full border border-umami-light-gray bg-white font-nunito font-bold text-umami-dark-gray hover:bg-umami-light-yellow/30 transition-colors"
          >
            Выйти из аккаунта
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
