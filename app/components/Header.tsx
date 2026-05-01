"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import AuthModal from "./AuthModal";
import RegisterModal from "./RegisterModal";

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const handleSwitchToRegister = () => {
    setIsAuthModalOpen(false);
    setIsRegisterModalOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsRegisterModalOpen(false);
    setIsAuthModalOpen(true);
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
        <div className="flex gap-2.5 items-center">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-umami-green custom-button h-10.25 flex items-center justify-center font-medium font-nunito"
          >
            Войти
          </button>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-umami-orange custom-button h-10.25 flex items-center justify-center font-medium font-nunito"
          >
            Создать аккаунт
          </button>
        </div>
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
