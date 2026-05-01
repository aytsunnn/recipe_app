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
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: {
      email?: string;
      password?: string;
      username?: string;
      name?: string;
      confirmPassword?: string;
    } = {};

    // Валидация имени
    if (!formData.name) {
      errors.name = "Введите имя";
    } else if (formData.name.length < 2) {
      errors.name = "Имя должно содержать не менее 2 символов";
    }

    // Валидация username
    if (!formData.username) {
      errors.username = "Введите имя пользователя";
    } else {
      const usernameError = validateUsername(formData.username);
      if (usernameError) {
        errors.username = usernameError;
      }
    }

    // Валидация email
    if (!formData.email) {
      errors.email = "Введите email";
    } else if (!validateEmail(formData.email)) {
      errors.email = "Некорректный email адрес";
    }

    // Валидация пароля
    if (!formData.password) {
      errors.password = "Введите пароль";
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors[0];
      }
    }

    // Проверка совпадения паролей
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Повторите пароль";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Пароли не совпадают";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const registerData: RegisterData = {
        email: formData.email,
        password: formData.password,
        username: formData.username,
        name: formData.name,
      };

      const response = await authService.register(registerData);
      authService.saveToken(response.token);

      // Успешная регистрация
      onClose();
      window.location.reload(); // Перезагрузка для обновления состояния
    } catch (error) {
      if (error instanceof Error) {
        setFieldErrors({ general: error.message });
      } else {
        setFieldErrors({ general: "Произошла ошибка при регистрации" });
      }
    } finally {
      setIsLoading(false);
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
              РЕГИСТРАЦИЯ
            </p>

            {fieldErrors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-left">
                <p className="text-red-600 text-xs font-inter">
                  • {fieldErrors.general}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="border w-full border-umami-green rounded-full px-2.5 py-1.25 font-nunito font-regular text-sm text-umami-green placeholder:text-umami-green focus:outline-none"
                placeholder="Имя"
              />
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="border w-full border-umami-green rounded-full px-2.5 py-1.25 font-nunito font-regular text-sm text-umami-green placeholder:text-umami-green focus:outline-none"
                placeholder="Имя пользователя"
              />
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="border w-full border-umami-green rounded-full px-2.5 py-1.25 font-nunito font-regular text-sm text-umami-green placeholder:text-umami-green focus:outline-none"
                placeholder="Email"
              />
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="border w-full border-umami-green rounded-full px-2.5 py-1.25 font-nunito font-regular text-sm text-umami-green placeholder:text-umami-green focus:outline-none"
                placeholder="Пароль"
              />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className="border w-full border-umami-green rounded-full px-2.5 py-1.25 font-nunito font-regular text-sm text-umami-green placeholder:text-umami-green focus:outline-none"
                placeholder="Повторите пароль"
              />

              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="custom-button bg-umami-green font-nunito text-sm px-5 py-1.5 rounded-full inline-block w-auto disabled:opacity-50"
                >
                  {isLoading ? "Регистрация..." : "Зарегистрироваться"}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="flex py-25 px-8 gap-8 w-60.5 flex-col bg-umami-green h-full rounded-r-2xl">
          <div className="flex flex-col text-end">
            <p className="font-nunito font-black text-xl text-white">
              АВТОРИЗАЦИЯ
            </p>
            <p className="font-nunito font-regular text-sm text-white">
              Уже есть аккаунт?
            </p>
          </div>
          <button
            onClick={onSwitchToLogin}
            className="custom-button text-center bg-white text-umami-green font-nunito font-regular text-sm"
          >
            Авторизоваться
          </button>
        </div>
      </div>
    </div>
  );
}
