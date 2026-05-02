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
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      // Перенаправляем на главную страницу с параметром поиска и открываем фильтры
      window.location.href = `/?search=${encodeURIComponent(
        searchQuery.trim()
      )}&filters=true`;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleToggleFilters = () => {
    // Создаем URL с параметрами
    const params = new URLSearchParams();
    
    // Сохраняем текущий поисковый запрос, если он есть
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }
    
    // Всегда включаем фильтры при клике на кнопку settings
    params.set('filters', 'true');
    
    // Переходим на главную страницу с фильтрами
    window.location.href = `/?${params.toString()}`;
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setSearchQuery("");
    window.location.href = "/";
  };

  return (
    <>
      <header className="flex justify-between items-center w-full">
        <a onClick={handleLogoClick} className="cursor-pointer">
          <Image width={215} height={41} src="/logo.svg" alt="logo" />
        </a>
        <div className="flex gap-2.5 items-center">
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-125 h-9.25 pl-10 pr-10 px-1.25 py-1.25 placeholder:text-umami-gray placeholder:font-nunito font-nunito text-base text-umami-dark-gray placeholder:font-regular border border-umami-light-gray/50 rounded-3xl focus:outline-none focus:border-umami-green"
              placeholder="Поиск"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
              <Image
                width={24}
                height={24}
                src="/MagnifyingGlass.svg"
                alt="search"
              />
            </div>
            <button
              type="button"
              onClick={handleToggleFilters}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <Image
                width={24}
                height={24}
                src="/SlidersHorizontal.svg"
                alt="settings"
              />
            </button>
          </div>
          <button
            onClick={handleSearch}
            className="custom-button h-9.25 font-nunito font-medium bg-umami-green text-sm"
          >
            Найти рецепт
          </button>
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
            <Link
              href="/profile"
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
            </Link>
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
