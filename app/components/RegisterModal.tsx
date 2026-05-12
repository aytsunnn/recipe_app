"use client";

import { useEffect, useRef, useState } from "react";
import { authService, RegisterData } from "../services/authService";
import {
  validatePassword,
  validateEmail,
  validateUsername,
} from "../utils/validation";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({
  isOpen,
  onClose,
  onSwitchToLogin,
}: RegisterModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    name: "",
  });
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifyStep, setIsVerifyStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      name: "",
    });
    setVerifyCode("");
    setIsVerifyStep(false);
    setFieldErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node))
      handleClose();
  };

  const handleRegisterSubmit = async () => {
    const normalizedEmail = formData.email.trim().toLowerCase();
    const errors: Record<string, string> = {};

    if (!formData.name) errors.name = "Введите имя";
    if (!formData.username) errors.username = "Введите имя пользователя";
    else {
      const usernameError = validateUsername(formData.username);
      if (usernameError) errors.username = usernameError;
    }

    if (!normalizedEmail) errors.email = "Введите email";
    else if (!validateEmail(normalizedEmail))
      errors.email = "Некорректный email";

    if (!formData.password) errors.password = "Введите пароль";
    else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid)
        errors.password = passwordValidation.errors[0];
    }

    if (!formData.confirmPassword) errors.confirmPassword = "Повторите пароль";
    else if (formData.password !== formData.confirmPassword)
      errors.confirmPassword = "Пароли не совпадают";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const registerData: RegisterData = {
        email: normalizedEmail,
        password: formData.password,
        username: formData.username,
        name: formData.name,
      };

      await authService.register(registerData);
      setIsVerifyStep(true);
      setFieldErrors({ general: "Код отправлен на email" });
    } catch (error) {
      setFieldErrors({
        general: error instanceof Error ? error.message : "Ошибка регистрации",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async () => {
    const normalizedEmail = formData.email.trim().toLowerCase();
    if (!verifyCode.trim()) {
      setFieldErrors({ code: "Введите код подтверждения" });
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyEmail({
        email: normalizedEmail,
        code: verifyCode.trim(),
      });
      const loginResponse = await authService.login({
        email: normalizedEmail,
        password: formData.password,
      });
      authService.saveToken(loginResponse.access_token);
      authService.dispatchAuthChange();
      handleClose();
    } catch (error) {
      setFieldErrors({
        general: error instanceof Error ? error.message : "Неверный код",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const normalizedEmail = formData.email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFieldErrors({ email: "Введите email" });
      return;
    }

    setIsLoading(true);
    try {
      await authService.requestEmailCode(normalizedEmail);
      setFieldErrors({ general: "Код отправлен повторно" });
    } catch (error) {
      setFieldErrors({
        general:
          error instanceof Error ? error.message : "Не удалось отправить код",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    if (isVerifyStep) {
      await handleVerifySubmit();
    } else {
      await handleRegisterSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-umami-dark-gray/80"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white flex flex-row rounded-2xl w-178.5 h-134 shadow-2xl"
      >
        <div className="flex justify-center w-127 items-center text-center px-20">
          <div className="flex flex-col justify-center gap-2.5 w-77">
            <p className="font-nunito font-black text-xl text-umami-green">
              {isVerifyStep ? "ПОДТВЕРЖДЕНИЕ EMAIL" : "РЕГИСТРАЦИЯ"}
            </p>

            {fieldErrors.general && (
              <p className="text-red-600 text-xs">{fieldErrors.general}</p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="border border-umami-green rounded-full px-2.5 py-1.25 text-sm"
                placeholder="Имя"
                disabled={isVerifyStep}
              />
              {!isVerifyStep && fieldErrors.name && (
                <span className="text-red-600 text-xs text-left">
                  {fieldErrors.name}
                </span>
              )}

              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="border border-umami-green rounded-full px-2.5 py-1.25 text-sm"
                placeholder="Имя пользователя"
                disabled={isVerifyStep}
              />
              {!isVerifyStep && fieldErrors.username && (
                <span className="text-red-600 text-xs text-left">
                  {fieldErrors.username}
                </span>
              )}

              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="border border-umami-green rounded-full px-2.5 py-1.25 text-sm"
                placeholder="Email"
                disabled={isVerifyStep}
              />
              {fieldErrors.email && (
                <span className="text-red-600 text-xs text-left">
                  {fieldErrors.email}
                </span>
              )}

              {!isVerifyStep && (
                <>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="border border-umami-green rounded-full px-2.5 py-1.25 text-sm"
                    placeholder="Пароль"
                    autoComplete="new-password"
                  />
                  {fieldErrors.password && (
                    <span className="text-red-600 text-xs text-left">
                      {fieldErrors.password}
                    </span>
                  )}

                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="border border-umami-green rounded-full px-2.5 py-1.25 text-sm"
                    placeholder="Повторите пароль"
                    autoComplete="new-password"
                  />
                  {fieldErrors.confirmPassword && (
                    <span className="text-red-600 text-xs text-left">
                      {fieldErrors.confirmPassword}
                    </span>
                  )}
                </>
              )}

              {isVerifyStep && (
                <>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    className="border border-umami-green rounded-full px-2.5 py-1.25 text-sm"
                    placeholder="Код подтверждения"
                  />
                  {fieldErrors.code && (
                    <span className="text-red-600 text-xs text-left">
                      {fieldErrors.code}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-xs text-umami-green underline disabled:opacity-50"
                  >
                    Отправить код повторно
                  </button>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="custom-button bg-umami-green text-sm disabled:opacity-50"
              >
                {isLoading
                  ? "Загрузка..."
                  : isVerifyStep
                    ? "Подтвердить email"
                    : "Зарегистрироваться"}
              </button>
            </form>
          </div>
        </div>

        <div className="flex py-25 px-8 gap-8 w-60.5 flex-col bg-umami-green h-full rounded-r-2xl">
          <div className="flex flex-col text-end">
            <p className="font-nunito font-black text-xl text-white">
              АВТОРИЗАЦИЯ
            </p>
            <p className="font-nunito text-sm text-white">Уже есть аккаунт?</p>
          </div>
          <button
            onClick={onSwitchToLogin}
            className="custom-button text-center bg-white text-umami-green font-nunito text-sm"
          >
            Авторизоваться
          </button>
        </div>
      </div>
    </div>
  );
}
