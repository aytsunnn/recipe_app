"use client";

import { useEffect, useRef, useState } from "react";
import { authService, RegisterData } from "../services/authService";
import { validatePassword, validateEmail, validateUsername } from "../utils/validation";
import OtpCodeInput from "./OtpCodeInput";

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
  const [formRenderKey, setFormRenderKey] = useState(0);

  const setFormName = (name: string) => {
    setFormData((prev) => ({
      email: prev.email,
      password: prev.password,
      confirmPassword: prev.confirmPassword,
      username: prev.username,
      name,
    }));
  };
  const setFormUsername = (username: string) => {
    setFormData((prev) => ({
      email: prev.email,
      password: prev.password,
      confirmPassword: prev.confirmPassword,
      username,
      name: prev.name,
    }));
  };
  const setFormEmail = (email: string) => {
    setFormData((prev) => ({
      email,
      password: prev.password,
      confirmPassword: prev.confirmPassword,
      username: prev.username,
      name: prev.name,
    }));
  };
  const setFormPassword = (password: string) => {
    setFormData((prev) => ({
      email: prev.email,
      password,
      confirmPassword: prev.confirmPassword,
      username: prev.username,
      name: prev.name,
    }));
  };
  const setFormConfirmPassword = (confirmPassword: string) => {
    setFormData((prev) => ({
      email: prev.email,
      password: prev.password,
      confirmPassword,
      username: prev.username,
      name: prev.name,
    }));
  };

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
    setFormRenderKey((prev) => prev + 1);
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
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleClose();
    }
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
    else if (!validateEmail(normalizedEmail)) errors.email = "Некорректный email";

    if (!formData.password) errors.password = "Введите пароль";
    else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) errors.password = passwordValidation.errors[0];
    }

    if (!formData.confirmPassword) errors.confirmPassword = "Повторите пароль";
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Пароли не совпадают";

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
      await authService.resendVerificationCode(normalizedEmail);
      setFieldErrors({ general: "Код отправлен повторно" });
    } catch (error) {
      setFieldErrors({
        general: error instanceof Error ? error.message : "Не удалось отправить код",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-umami-dark-gray/80 px-3 py-4 sm:px-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="flex w-full max-w-[714px] overflow-hidden rounded-2xl bg-white shadow-2xl lg:h-134 lg:w-178.5 lg:max-w-none"
      >
        <div className="flex w-full items-center justify-center px-4 py-6 sm:px-6 md:px-10 lg:px-20 text-center">
          <div className="w-full max-w-[360px] lg:w-77 lg:max-w-none flex flex-col justify-center gap-2.5">
            <p className="font-nunito text-xl font-black text-umami-green">
              {isVerifyStep ? "ПОДТВЕРЖДЕНИЕ EMAIL" : "РЕГИСТРАЦИЯ"}
            </p>

            {fieldErrors.general && (
              <p className="text-xs text-red-600">{fieldErrors.general}</p>
            )}

            <form key={`register-${formRenderKey}`} onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <input
                type="text"
                defaultValue={formData.name}
                onChange={(e) => setFormName(e.target.value)}
                className="rounded-full border border-umami-green px-3 py-2 text-sm text-umami-green"
                placeholder="Имя"
                disabled={isVerifyStep}
              />
              {!isVerifyStep && fieldErrors.name && (
                <span className="text-left text-xs text-red-600">{fieldErrors.name}</span>
              )}

              <input
                type="text"
                defaultValue={formData.username}
                onChange={(e) => setFormUsername(e.target.value)}
                className="rounded-full border border-umami-green px-3 py-2 text-sm text-umami-green"
                placeholder="Логин"
                disabled={isVerifyStep}
              />
              {!isVerifyStep && fieldErrors.username && (
                <span className="text-left text-xs text-red-600">{fieldErrors.username}</span>
              )}

              <input
                type="email"
                defaultValue={formData.email}
                onChange={(e) => setFormEmail(e.target.value)}
                className="rounded-full border border-umami-green px-3 py-2 text-sm text-umami-green"
                placeholder="Email"
                disabled={isVerifyStep}
              />
              {fieldErrors.email && (
                <span className="text-left text-xs text-red-600">{fieldErrors.email}</span>
              )}

              {!isVerifyStep ? (
                <>
                  <input
                    type="password"
                    defaultValue={formData.password}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="rounded-full border border-umami-green px-3 py-2 text-sm text-umami-green"
                    placeholder="Пароль"
                    autoComplete="new-password"
                  />
                  {fieldErrors.password && (
                    <span className="text-left text-xs text-red-600">{fieldErrors.password}</span>
                  )}

                  <input
                    type="password"
                    defaultValue={formData.confirmPassword}
                    onChange={(e) => setFormConfirmPassword(e.target.value)}
                    className="rounded-full border border-umami-green px-3 py-2 text-sm text-umami-green"
                    placeholder="Повторите пароль"
                    autoComplete="new-password"
                  />
                  {fieldErrors.confirmPassword && (
                    <span className="text-left text-xs text-red-600">{fieldErrors.confirmPassword}</span>
                  )}
                </>
              ) : (
                <>
                  <OtpCodeInput value={verifyCode} onChange={setVerifyCode} disabled={isLoading} />
                  {fieldErrors.code && (
                    <span className="text-left text-xs text-red-600">{fieldErrors.code}</span>
                  )}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="w-fit text-xs text-umami-green underline disabled:opacity-50"
                  >
                    Отправить повторно
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

              <button
                type="button"
                onClick={onSwitchToLogin}
                className="mt-3 w-full rounded-full border border-umami-green/30 px-4 py-2 text-sm font-nunito font-bold text-umami-green md:hidden"
              >
                Уже есть аккаунт? Войти
              </button>
            </form>
          </div>
        </div>

        <div className="hidden w-[242px] flex-col gap-6 bg-umami-green px-6 py-8 text-white md:flex lg:w-60.5 lg:gap-8 lg:px-8 lg:py-25">
          <div className="flex flex-col text-end">
            <p className="font-nunito text-xl font-black text-white">АВТОРИЗАЦИЯ</p>
            <p className="font-nunito text-sm text-white">Уже есть аккаунт?</p>
          </div>
          <button
            onClick={onSwitchToLogin}
            className="custom-button bg-white text-center font-nunito text-sm text-umami-green"
          >
            Авторизоваться
          </button>
        </div>
      </div>
    </div>
  );
}
