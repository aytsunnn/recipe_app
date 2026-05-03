"use client";

import { useEffect, useRef, useState } from "react";
import { authService, LoginData } from "../services/authService";
import { validateEmail } from "../utils/validation";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export default function AuthModal({ isOpen, onClose, onSwitchToRegister }: AuthModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; general?: string }>({});

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
    setFormData({ email: "", password: "" });
    setFieldErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-umami-dark-gray/80" onClick={handleBackdropClick}>
      <div ref={modalRef} className="bg-white flex flex-row rounded-2xl w-178.5 h-134 shadow-2xl">
        <div className="flex py-25 px-8 gap-8 w-60.5 flex-col bg-umami-orange h-full rounded-l-2xl">
          <div className="flex flex-col">
            <p className="font-nunito font-black text-xl text-white">РЕГИСТРАЦИЯ</p>
            <p className="font-nunito text-sm text-white">Ещё нет аккаунта?</p>
          </div>
          <button onClick={onSwitchToRegister} className="custom-button bg-white text-umami-orange font-nunito text-sm">
            Зарегистрироваться
          </button>
        </div>

        <div className="flex justify-center items-center text-center px-20 w-full">
          <div className="flex flex-col justify-center gap-2.5 w-77">
            <p className="font-nunito font-black text-xl text-umami-orange">АВТОРИЗАЦИЯ</p>
            {fieldErrors.general && <p className="text-red-600 text-xs">{fieldErrors.general}</p>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="border border-umami-orange rounded-full px-2.5 py-1.25 text-sm text-umami-orange"
                placeholder="Email"
              />
              {fieldErrors.email && <span className="text-red-600 text-xs text-left">{fieldErrors.email}</span>}

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="border border-umami-orange w-full rounded-full px-2.5 py-1.25 pr-16 text-sm text-umami-orange"
                  placeholder="Пароль"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-umami-orange text-xs">
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
              {fieldErrors.password && <span className="text-red-600 text-xs text-left">{fieldErrors.password}</span>}

              <button type="submit" disabled={isLoading} className="custom-button bg-umami-orange text-sm disabled:opacity-50">
                {isLoading ? "Вход..." : "Авторизоваться"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
