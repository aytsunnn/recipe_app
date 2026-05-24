"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, Suspense, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AuthModal from "./AuthModal";
import RegisterModal from "./RegisterModal";
import LeftPart from "./MainScreen/NavigationLeftPart";
import { authService } from "../services/authService";
import { normalizeImageUrl } from "../utils/imageUrl";
import { notificationService } from "../services/notificationService";
import { useUiFeedback } from "./UiFeedbackProvider";

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
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isBurgerOpen, setIsBurgerOpen] = useState(false);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useUiFeedback();
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

    window.addEventListener("auth-change", loadUser);
    return () => {
      window.removeEventListener("auth-change", loadUser);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      knownNotificationIdsRef.current = new Set();
      return;
    }

    let cancelled = false;
    let isFirstPoll = true;

    const pollNotifications = async () => {
      try {
        const result = await notificationService.getMyNotifications(1, 20);
        if (cancelled) return;

        const unread = result.items.filter((item) => !item.is_read).length;
        setUnreadNotifications(unread);

        const ids = new Set(result.items.map((item) => item.id));
        if (isFirstPoll) {
          knownNotificationIdsRef.current = ids;
          isFirstPoll = false;
          return;
        }

        const newItems = result.items.filter(
          (item) => !knownNotificationIdsRef.current.has(item.id)
        );
        if (newItems.length > 0) {
          const fresh = newItems[0];
          toast(
            fresh.message && fresh.message.trim().length > 0
              ? fresh.message
              : "Новое уведомление",
            "info"
          );
          newItems.forEach((item) =>
            knownNotificationIdsRef.current.add(item.id)
          );
        }
      } catch (error) {
        console.error("Ошибка загрузки уведомлений в шапке:", error);
      }
    };

    void pollNotifications();
    const intervalId = window.setInterval(() => {
      void pollNotifications();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user, toast]);

  const handleSwitchToRegister = () => {
    setIsAuthModalOpen(false);
    setIsRegisterModalOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsRegisterModalOpen(false);
    setIsAuthModalOpen(true);
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

  const closeBurger = () => setIsBurgerOpen(false);

  const handleOpenMicrochef = () => {
    closeBurger();
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("microchef_open_from_burger", "1");
      window.dispatchEvent(new Event("microchef-open-request"));
    }
    if (pathname === "/") {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("microchef", "1");
      router.push(`/?${params.toString()}`, { scroll: false });
      return;
    }
    router.push("/?microchef=1", { scroll: false });
  };

  const getSafeAvatarUrl = (url: string | null) => {
    return normalizeImageUrl(url, "/avatar.jpg");
  };

  return (
    <>
      <header className="flex w-full flex-wrap items-center justify-between gap-2 md:gap-3 lg:flex-nowrap lg:gap-0">
        <a onClick={handleLogoClick} className="cursor-pointer">
          <Image
            width={215}
            height={41}
            src="/logo.svg"
            alt="logo"
            className="h-8 w-auto md:h-9 lg:h-auto"
          />
        </a>

        <div className="order-3 flex w-full items-center gap-1.5 sm:order-2 sm:w-auto sm:flex-1 md:gap-2 lg:order-none lg:w-auto lg:flex-none lg:gap-2.5">
          <div className="relative min-w-0 flex-1 lg:flex-none">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-8.5 w-full rounded-3xl border border-umami-light-gray/50 px-1.25 py-1 pl-9 pr-9 font-nunito text-xs text-umami-dark-gray placeholder:font-nunito placeholder:text-base placeholder:font-regular placeholder:text-umami-gray focus:border-umami-green focus:outline-none md:h-9 md:text-sm lg:h-9.25 lg:w-125 lg:text-base"
              placeholder="Поиск"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
              <Image
                width={20}
                height={20}
                src="/MagnifyingGlass.svg"
                alt="search"
                className="md:h-6 md:w-6"
              />
            </div>
            <button
              type="button"
              onClick={handleToggleFilters}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <Image
                width={20}
                height={20}
                src="/SlidersHorizontal.svg"
                alt="settings"
                className="md:h-6 md:w-6"
              />
            </button>
          </div>
          <button
            onClick={handleSearch}
            className="custom-button h-8.5 whitespace-nowrap bg-umami-green px-4 font-nunito text-[11px] font-semibold text-white hover:bg-[#6b7f60] transition-all duration-300 active:scale-95 shadow-sm md:h-9 md:px-5 md:text-xs lg:h-9.25 lg:px-6 lg:text-sm"
          >
            Найти рецепт
          </button>
        </div>

        {!user && !isLoading && (
          <div className="order-2 ml-auto flex items-center gap-2 md:gap-2.5 lg:order-none lg:ml-0">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="custom-button h-10.25 flex items-center justify-center bg-umami-orange px-3 font-nunito font-medium md:px-4"
            >
              Войти
            </button>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="custom-button h-10.25 hidden items-center justify-center bg-umami-green px-3 font-nunito font-medium sm:flex md:px-4"
            >
              Создать аккаунт
            </button>
          </div>
        )}

        {user && (
          <div className="order-2 ml-auto flex items-center gap-2 md:gap-2.5 lg:order-none lg:ml-0">
            <Link
              href="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-umami-light-gray/50"
            >
              <Image
                width={22}
                height={22}
                src="/Colocolchik.svg"
                alt="notifications"
                className="h-6 w-6"
              />
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-umami-orange px-1 text-[10px] font-bold leading-none text-white">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              ) : null}
            </Link>
            <Link
              href="/profile"
              className="hidden h-10.25 w-auto items-center justify-center gap-3.5 rounded-full bg-umami-orange pl-5 pr-1.5 text-white hover:bg-[#dd8c45] transition-all duration-300 shadow-sm border border-transparent hover:scale-[1.02] lg:flex"
            >
              <p className="font-nunito text-sm font-bold tracking-wide">
                {user.username}
              </p>
              <Image
                width={32}
                height={32}
                src={getSafeAvatarUrl(user.avatar_url)}
                alt="avatar"
                className="h-8 w-8 rounded-full border border-white object-cover shadow-inner"
              />
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsBurgerOpen(true)}
          className="order-2 flex h-10 w-10 items-center justify-center rounded-full border border-umami-light-gray/50 bg-white lg:hidden"
          aria-label="Открыть меню"
        >
          <div className="flex flex-col gap-1">
            <span className="h-[2px] w-5 rounded-full bg-umami-dark-gray" />
            <span className="h-[2px] w-5 rounded-full bg-umami-dark-gray" />
            <span className="h-[2px] w-5 rounded-full bg-umami-dark-gray" />
          </div>
        </button>
      </header>

      {isBurgerOpen ? (
        <div
          className="fixed inset-0 z-[70] bg-black/45 lg:hidden"
          onClick={closeBurger}
        >
          <div
            className="ml-auto h-full w-fit min-w-[244px] max-w-[88vw] overflow-y-auto border-l border-umami-light-gray/40 bg-gradient-to-b from-[#fff8e8] to-[#fffdf7] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-nunito text-lg font-bold text-umami-dark-gray">
                Меню
              </p>
              <button
                type="button"
                onClick={closeBurger}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-umami-light-gray/50 bg-white"
              >
                <Image width={14} height={14} src="/X.svg" alt="close-menu" />
              </button>
            </div>
            <LeftPart compact showCategories={false} onNavigate={closeBurger} />
          </div>
        </div>
      ) : null}

      {user ? (
        <button
          type="button"
          onClick={handleOpenMicrochef}
          className="fixed bottom-4 right-4 z-[65] flex h-12 w-12 items-center justify-center rounded-full bg-umami-orange shadow-lg transition hover:bg-[#dd8c45] lg:hidden"
          aria-label="Открыть чат с микро-шефом"
        >
          <Image width={22} height={22} src="/ChatCircle.svg" alt="" />
        </button>
      ) : null}

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
