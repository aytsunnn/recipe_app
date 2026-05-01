"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import AuthModal from "./AuthModal";
import RegisterModal from "./RegisterModal";
import { authService } from "../services/authService";

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar_url: string | null;
}

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (authService.isAuthenticated()) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const handleSwitchToRegister = () => {
    setIsAuthModalOpen(false);
    setIsRegisterModalOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsRegisterModalOpen(false);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    authService.removeToken();
    setUser(null);
    window.location.reload();
  };

  return (
    <>
      <header className="flex justify-between items-center w-full">
        <Link href="/" className="cursor-pointer">
          <Image width={215} height={41} src="/logo.svg" alt="logo" />
        </Link>
        <div className="relative">
          <input
            className="w-125 h-10.25 pl-10 px-1.25 py-1.25 placeholder:text-umami-gray placeholder:font-nunito font-nunito text-sm text-umami-dark-gray placeholder:font-regular border border-umami-light-gray/50 rounded-3xl focus:outline-none focus:border-umami-green"
            placeholder="Поиск"
          />
          <div className="absolute left-2.25 top-2.25">
            <Image
              width={23}
              height={23}
              src="/MagnifyingGlass.svg"
              alt="search"
            />
          </div>
          <div className="absolute right-1.25 top-2">
            <Link
              href="/"
              className="custom-button h-7.5 font-nunito font-medium bg-umami-green"
            >
              Найти рецепт
            </Link>
          </div>
        </div>
        {/* для неавторизованных пользователей */}
        {!user && !isLoading && (
          <div className="flex gap-2.5 items-center">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-umami-orange custom-button h-10.25 flex items-center justify-center font-medium font-nunito"
            >
              Войти
            </button>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="bg-umami-green custom-button h-10.25 flex items-center justify-center font-medium font-nunito"
            >
              Создать аккаунт
            </button>
          </div>
        )}

        {/* для авторизованных пользователей */}
        {user && (
          <div className="flex gap-2.5 items-center">
            <Link
              href="/"
              className="w-9 h-9 rounded-full border flex justify-center items-center border-umami-light-gray/50"
            >
              <Image
                width={23}
                height={23}
                src="/Colocolchik.svg"
                alt="notifications"
                className="w-5.25 h-5.25"
              />
            </Link>
            <button 
              onClick={handleLogout}
              className="bg-umami-orange custom-button h-10.25 flex items-center justify-center font-medium font-nunito gap-5 pr-0"
            >
              <p>{user.username}</p>
              <Image
                width={36}
                height={36}
                src={user.avatar_url || "/avatar.jpg"}
                alt="avatar"
                className="w-10.25 h-10.25 right-0 top-0 border border-white rounded-full"
              />
            </button>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSwitchToRegister={handleSwitchToRegister}
      />
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </>
  );
}
