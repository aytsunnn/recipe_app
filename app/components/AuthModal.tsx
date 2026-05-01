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
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    setErrors([]);

    const validationErrors: string[] = [];

    // Валидация email
    if (!validateEmail(formData.email)) {
      validationErrors.push("Некорректный email адрес");
    }

    // Валидация пароля
    if (formData.password.length < 1) {
      validationErrors.push("Введите пароль");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
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
        setErrors([error.message]);
      } else {
        setErrors(["Неверный email или пароль"]);
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
            onClick={onSwitchToRegister}
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

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-left">
                {errors.map((error, index) => (
                  <p key={index} className="text-red-600 text-xs font-inter">
                    • {error}
                  </p>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="border w-full border-umami-orange rounded-full px-2.5 py-1.25 font-nunito font-regular text-sm text-[#ff6600] focus:outline-none"
                placeholder="Email"
                required
              />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="border w-full border-umami-orange rounded-full px-2.5 py-1.25 font-nunito font-regular text-sm text-[#ff6600] focus:outline-none"
                placeholder="Пароль"
                required
              />
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
