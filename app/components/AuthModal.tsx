"use client";

import { useEffect, useRef, useState } from "react";
import { authService, LoginData } from "../services/authService";
import { validateEmail, validatePassword } from "../utils/validation";
import OtpCodeInput from "./OtpCodeInput";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

type ModalMode =
  | "login"
  | "recovery-request"
  | "recovery-verify"
  | "recovery-reset";

export default function AuthModal({ isOpen, onClose, onSwitchToRegister }: AuthModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ModalMode>("login");

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [recoveryData, setRecoveryData] = useState({
    email: "",
    code: "",
    verifiedCode: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    code?: string;
    newPassword?: string;
    confirmNewPassword?: string;
    general?: string;
  }>({});

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const resetForm = () => {
    setMode("login");
    setFormData({ email: "", password: "" });
    setRecoveryData({
      email: "",
      code: "",
      verifiedCode: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setFieldErrors({});
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const normalizedEmail = formData.email.trim().toLowerCase();
    if (!normalizedEmail) return setFieldErrors({ email: "Введите email" });
    if (!validateEmail(normalizedEmail)) return setFieldErrors({ email: "Некорректный email" });
    if (!formData.password) return setFieldErrors({ password: "Введите пароль" });

    setIsLoading(true);
    try {
      const loginData: LoginData = { email: normalizedEmail, password: formData.password };
      const response = await authService.login(loginData);
      authService.saveToken(response.access_token);
      authService.dispatchAuthChange();
      handleClose();
    } catch (error) {
      setFieldErrors({ general: error instanceof Error ? error.message : "Ошибка авторизации" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const normalizedEmail = recoveryData.email.trim().toLowerCase();
    if (!normalizedEmail) return setFieldErrors({ email: "Введите email" });
    if (!validateEmail(normalizedEmail)) return setFieldErrors({ email: "Некорректный email" });

    setIsLoading(true);
    try {
      await authService.requestPasswordRecoveryCode(normalizedEmail);
      setRecoveryData((prev) => ({ ...prev, email: normalizedEmail, code: "" }));
      setMode("recovery-verify");
      setFieldErrors({ general: "Код отправлен на почту" });
    } catch (error) {
      setFieldErrors({ general: error instanceof Error ? error.message : "Не удалось отправить код" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const normalizedEmail = recoveryData.email.trim().toLowerCase();
    const code = recoveryData.code.trim();

    if (!normalizedEmail) return setFieldErrors({ email: "Введите email" });
    if (!validateEmail(normalizedEmail)) return setFieldErrors({ email: "Некорректный email" });
    if (code.length < 4) return setFieldErrors({ code: "Введите корректный код" });

    setIsLoading(true);
    try {
      await authService.verifyEmail({ email: normalizedEmail, code });
      setRecoveryData((prev) => ({ ...prev, verifiedCode: code }));
      setMode("recovery-reset");
      setFieldErrors({ general: "Код подтвержден" });
    } catch (error) {
      setFieldErrors({ general: error instanceof Error ? error.message : "Неверный код" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const normalizedEmail = recoveryData.email.trim().toLowerCase();
    const verifiedCode = recoveryData.verifiedCode.trim();

    if (!normalizedEmail) return setFieldErrors({ email: "Введите email" });
    if (!verifiedCode) {
      setMode("recovery-verify");
      return setFieldErrors({ code: "Сначала подтвердите код" });
    }

    const passwordValidation = validatePassword(recoveryData.newPassword);
    if (!passwordValidation.isValid) {
      return setFieldErrors({ newPassword: passwordValidation.errors[0] || "Некорректный пароль" });
    }
    if (recoveryData.newPassword !== recoveryData.confirmNewPassword) {
      return setFieldErrors({ confirmNewPassword: "Пароли не совпадают" });
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        email: normalizedEmail,
        code: verifiedCode,
        new_password: recoveryData.newPassword,
      });
      setMode("login");
      setFormData({ email: normalizedEmail, password: "" });
      setRecoveryData({
        email: normalizedEmail,
        code: "",
        verifiedCode: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setFieldErrors({ general: "Пароль обновлен. Войдите с новым паролем" });
    } catch (error) {
      setFieldErrors({ general: error instanceof Error ? error.message : "Не удалось обновить пароль" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendRecoveryCode = async () => {
    const normalizedEmail = recoveryData.email.trim().toLowerCase();
    if (!normalizedEmail || !validateEmail(normalizedEmail)) {
      setFieldErrors({ email: "Введите корректный email" });
      return;
    }

    setIsLoading(true);
    try {
      await authService.requestPasswordRecoveryCode(normalizedEmail);
      setFieldErrors({ general: "Код отправлен повторно" });
    } catch (error) {
      setFieldErrors({ general: error instanceof Error ? error.message : "Не удалось отправить код" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-umami-dark-gray/80 px-3 py-4 sm:px-4" onClick={handleBackdropClick}>
      <div ref={modalRef} className="flex w-full max-w-[714px] overflow-hidden rounded-2xl bg-white shadow-2xl lg:h-134 lg:w-178.5 lg:max-w-none">
        <div className="hidden w-[242px] flex-col gap-6 bg-umami-orange px-6 py-8 text-white md:flex lg:w-60.5 lg:gap-8 lg:px-8 lg:py-25">
          <div>
            <p className="font-nunito text-xl font-black">РЕГИСТРАЦИЯ</p>
            <p className="font-nunito text-sm">Ещё нет аккаунта?</p>
          </div>
          <button onClick={onSwitchToRegister} className="custom-button bg-white text-sm font-nunito text-umami-orange">
            Зарегистрироваться
          </button>
        </div>

        <div className="flex w-full items-center justify-center px-4 py-6 sm:px-6 md:px-10 lg:px-20">
          <div className="w-full max-w-[360px] lg:w-77 lg:max-w-none">
            <p className="text-center font-nunito text-xl font-black text-umami-orange">
              {mode === "login" && "АВТОРИЗАЦИЯ"}
              {mode === "recovery-request" && "ВОССТАНОВЛЕНИЕ ПАРОЛЯ"}
              {mode === "recovery-verify" && "ПРОВЕРКА КОДА"}
              {mode === "recovery-reset" && "НОВЫЙ ПАРОЛЬ"}
            </p>
            {fieldErrors.general && <p className="mt-2 text-xs text-red-600">{fieldErrors.general}</p>}

            {mode === "login" ? (
              <form onSubmit={handleLoginSubmit} className="mt-3 flex flex-col gap-2.5">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="rounded-full border border-umami-orange px-3 py-2 text-sm text-umami-orange"
                  placeholder="Email"
                />
                {fieldErrors.email && <span className="text-left text-xs text-red-600">{fieldErrors.email}</span>}

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-full border border-umami-orange px-3 py-2 pr-20 text-sm text-umami-orange"
                    placeholder="Пароль"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-umami-orange">
                    {showPassword ? "Скрыть" : "Показать"}
                  </button>
                </div>
                {fieldErrors.password && <span className="text-left text-xs text-red-600">{fieldErrors.password}</span>}

                <button
                  type="button"
                  onClick={() => {
                    setFieldErrors({});
                    setRecoveryData((prev) => ({ ...prev, email: formData.email.trim().toLowerCase() }));
                    setMode("recovery-request");
                  }}
                  className="w-fit text-left font-nunito text-sm text-umami-orange underline"
                >
                  Забыли пароль?
                </button>

                <button type="submit" disabled={isLoading} className="custom-button bg-umami-orange text-sm disabled:opacity-50">
                  {isLoading ? "Вход..." : "Авторизоваться"}
                </button>
              </form>
            ) : null}

            {mode === "recovery-request" ? (
              <form onSubmit={handleRecoveryRequest} className="mt-3 flex flex-col gap-2.5">
                <input
                  type="email"
                  value={recoveryData.email}
                  onChange={(e) => setRecoveryData((prev) => ({ ...prev, email: e.target.value }))}
                  className="rounded-full border border-umami-orange px-3 py-2 text-sm text-umami-orange"
                  placeholder="Email"
                />
                {fieldErrors.email && <span className="text-left text-xs text-red-600">{fieldErrors.email}</span>}

                <button type="submit" disabled={isLoading} className="w-fit font-nunito text-sm text-umami-orange underline disabled:opacity-50">
                  {isLoading ? "Отправляем..." : "Восстановить пароль"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFieldErrors({});
                    setMode("login");
                  }}
                  className="w-fit text-xs text-umami-gray underline"
                >
                  Вернуться ко входу
                </button>
              </form>
            ) : null}

            {mode === "recovery-verify" ? (
              <form onSubmit={handleRecoveryVerifyCode} className="mt-3 flex flex-col gap-2.5">
                <input
                  type="email"
                  value={recoveryData.email}
                  onChange={(e) => setRecoveryData((prev) => ({ ...prev, email: e.target.value }))}
                  className="rounded-full border border-umami-orange px-3 py-2 text-sm text-umami-orange"
                  placeholder="Email"
                />
                <OtpCodeInput
                  value={recoveryData.code}
                  onChange={(code) => setRecoveryData((prev) => ({ ...prev, code }))}
                  disabled={isLoading}
                />
                {fieldErrors.code && <span className="text-left text-xs text-red-600">{fieldErrors.code}</span>}

                <button type="submit" disabled={isLoading} className="w-fit font-nunito text-sm text-umami-orange underline disabled:opacity-50">
                  {isLoading ? "Проверяем..." : "Восстановить пароль"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleResendRecoveryCode()}
                  disabled={isLoading}
                  className="w-fit text-left text-xs text-umami-orange underline disabled:opacity-50"
                >
                  Отправить повторно
                </button>
              </form>
            ) : null}

            {mode === "recovery-reset" ? (
              <form onSubmit={handleRecoveryReset} className="mt-3 flex flex-col gap-2.5">
                <input
                  type="password"
                  value={recoveryData.newPassword}
                  onChange={(e) => setRecoveryData((prev) => ({ ...prev, newPassword: e.target.value }))}
                  className="rounded-full border border-umami-orange px-3 py-2 text-sm text-umami-orange"
                  placeholder="Новый пароль"
                  autoComplete="new-password"
                />
                {fieldErrors.newPassword && <span className="text-left text-xs text-red-600">{fieldErrors.newPassword}</span>}

                <input
                  type="password"
                  value={recoveryData.confirmNewPassword}
                  onChange={(e) => setRecoveryData((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                  className="rounded-full border border-umami-orange px-3 py-2 text-sm text-umami-orange"
                  placeholder="Повторите новый пароль"
                  autoComplete="new-password"
                />
                {fieldErrors.confirmNewPassword && <span className="text-left text-xs text-red-600">{fieldErrors.confirmNewPassword}</span>}

                <button type="submit" disabled={isLoading} className="w-fit font-nunito text-sm text-umami-orange underline disabled:opacity-50">
                  {isLoading ? "Сохраняем..." : "Восстановить пароль"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFieldErrors({});
                    setMode("login");
                  }}
                  className="w-fit text-xs text-umami-gray underline"
                >
                  Вернуться ко входу
                </button>
              </form>
            ) : null}

            <button
              type="button"
              onClick={onSwitchToRegister}
              className="mt-3 w-full rounded-full border border-umami-orange/30 px-4 py-2 text-sm font-nunito font-bold text-umami-orange md:hidden"
            >
              Нет аккаунта? Регистрация
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
