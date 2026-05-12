"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthModal from "./AuthModal";
import RegisterModal from "./RegisterModal";
import { authService } from "../services/authService";
import { normalizeImageUrl } from "../utils/imageUrl";

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar_url: string | null;
}

export default function Header() {
  return (
    <Suspense
      fallback={<div className="h-20 w-full animate-pulse bg-gray-100" />}
    >
      <HeaderContent />
    </Suspense>
  );
}

function HeaderContent() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(
    searchParams?.get("search") || ""
  );

  useEffect(() => {
    setSearchQuery(searchParams?.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const loadUser = async () => {
      if (authService.isAuthenticated()) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    loadUser();

    // Слушаем изменения авторизации
    window.addEventListener("auth-change", loadUser);
    return () => {
      window.removeEventListener("auth-change", loadUser);
    };
  }, []);

  const handleSwitchToRegister = () => {
    setIsAuthModalOpen(false);
    setIsRegisterModalOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsRegisterModalOpen(false);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Ошибка при выходе из аккаунта:", error);
    } finally {
      authService.removeToken();
      authService.dispatchAuthChange();
      router.push("/");
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleToggleFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (params.get("filters") === "true") {
      params.delete("filters");
    } else {
      params.set("filters", "true");
    }
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setSearchQuery("");
    router.push("/", { scroll: false });
  };

  const getSafeAvatarUrl = (url: string | null) => {
    return normalizeImageUrl(url, "/avatar.jpg");
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
            <button
              onClick={() => void handleLogout()}
              className="w-9 h-9 rounded-full border flex justify-center items-center border-umami-light-gray/50"
              title="Выйти"
              aria-label="Выйти"
            >
              <Image
                width={20}
                height={20}
                src="/SignOut.svg"
                alt="logout"
                className="w-5 h-5"
              />
            </button>
            <Link
              href="/profile"
              className="bg-umami-orange custom-button h-10.25 flex items-center justify-center font-medium font-nunito gap-5 pr-0"
            >
              <p>{user.username}</p>
              <Image
                width={36}
                height={36}
                src={getSafeAvatarUrl(user.avatar_url)}
                alt="avatar"
                className="w-10.25 h-10.25 right-0 top-0 border border-white rounded-full object-cover"
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
