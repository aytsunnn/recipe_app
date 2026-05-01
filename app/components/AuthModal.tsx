"use client";

import { useEffect, useRef, useState } from "react";
import { authService, LoginData } from "../services/authService";
import { validateEmail } from "../utils/validation";
import Image from "next/image";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSwitchToRegister,
}: AuthModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      setIsAnimating(true);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      setIsAnimating(false);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
    });
    setFieldErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSwitchToRegister = () => {
    resetForm();
    onSwitchToRegister();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: { email?: string; password?: string } = {};

    // Валидация email
    if (!formData.email) {
      errors.email = "Введите email";
    } else if (!validateEmail(formData.email)) {
      errors.email = "Некорректный email адрес";
    }

    // Валидация пароля
    if (!formData.password) {
      errors.password = "Введите пароль";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const loginData: LoginData = {
        email: formData.email,
        password: formData.password,
      };

      const response = await authService.login(loginData);
      authService.saveToken(response.token);

      // Успешная авторизация
      onClose();
      window.location.reload(); // Перезагрузка для обновления состояния
    } catch (error) {
      if (error instanceof Error) {
        setFieldErrors({ general: error.message });
      } else {
        setFieldErrors({ general: "Неверный email или пароль" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-umami-dark-gray/80 transition-opacity duration-300 ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`bg-white flex flex-row rounded-2xl w-178.5 h-134 shadow-2xl transform transition-all duration-300 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex py-25 px-8 gap-8 w-60.5 flex-col bg-umami-orange h-full rounded-l-2xl">
          <div className="flex flex-col">
            <p className="font-nunito font-black text-xl text-white">
              РЕГИСТРАЦИЯ
            </p>
            <p className="font-nunito font-regular text-sm text-white">
              Ещё нет аккаунта?
            </p>
          </div>
          <button
            onClick={handleSwitchToRegister}
            className="custom-button bg-white text-umami-orange font-nunito font-regular text-sm"
          >
            Зарегистрироваться
          </button>
        </div>
        <div className="flex justify-center items-center text-center px-20">
          <div className="flex flex-col justify-center gap-2.5 w-77">
            <p className="font-nunito font-black text-xl text-umami-orange">
              АВТОРИЗАЦИЯ
            </p>

            {fieldErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-left">
                <p className="text-red-600 text-xs font-inter">
                  • {fieldErrors.general}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <div className="flex flex-col">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`border w-full ${
                    fieldErrors.email ? "border-red-500" : "border-umami-orange"
                  } rounded-full px-2.5 py-1.25 font-nunito font-regular text-sm text-umami-orange placeholder:text-umami-orange focus:outline-none`}
                  placeholder="Email"
                />
                {fieldErrors.email && (
                  <div className="flex items-center gap-1 mt-1 ml-2.5">
                    <Image
                      width={14}
                      height={14}
                      src="/WarningCircle.svg"
                      alt="warning"
                    />
                    <span className="text-red-600 text-xs font-inter">
                      {fieldErrors.email}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={`border w-full ${
                      fieldErrors.password
                        ? "border-red-500"
                        : "border-umami-orange"
                    } rounded-full px-2.5 py-1.25 pr-10 font-nunito font-regular text-sm text-umami-orange placeholder:text-umami-orange focus:outline-none`}
                    placeholder="Пароль"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-umami-orange hover:text-umami-dark-gray"
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {fieldErrors.password && (
                  <div className="flex items-center gap-1 mt-1 ml-2.5">
                    <Image
                      width={14}
                      height={14}
                      src="/WarningCircle.svg"
                      alt="warning"
                    />
                    <span className="text-red-600 text-xs font-inter">
                      {fieldErrors.password}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="custom-button bg-umami-orange font-nunito text-sm px-5 py-1.5 rounded-full inline-block w-auto disabled:opacity-50"
                >
                  {isLoading ? "Вход..." : "Авторизоваться"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
