"use client";

import { useEffect, useState } from "react";
import { authService, User } from "../services/authService";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "../components/Header";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      if (!authService.isAuthenticated()) {
        router.push("/");
        return;
      }

      const userData = await authService.getCurrentUser();
      if (!userData) {
        router.push("/");
        return;
      }

      setUser(userData);
      setIsLoading(false);
    };

    loadUser();
  }, [router]);

  const handleLogout = () => {
    authService.removeToken();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-umami-beige">
        <div className="container mx-auto px-4 py-6">
          <Header />
          <div className="flex justify-center items-center py-20">
            <p className="text-umami-gray">Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-umami-beige">
      <div className="container mx-auto px-4 py-6">
        <Header />
        
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-umami-light-gray/50 p-8">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {user.avatar_url ? (
                  <Image
                    width={96}
                    height={96}
                    src={user.avatar_url}
                    className="w-full h-full object-cover"
                    alt="avatar"
                  />
                ) : (
                  <Image
                    width={96}
                    height={96}
                    src="/avatar.jpg"
                    className="object-cover"
                    alt="avatar"
                  />
                )}
              </div>
              <div className="flex-1">
                <h1 className="font-nunito font-black text-2xl text-umami-dark-gray">
                  {user.name}
                </h1>
                <p className="font-inter text-lg text-umami-gray">
                  @{user.username}
                </p>
                <p className="font-inter text-sm text-umami-gray mt-1">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="border-t border-umami-light-gray/50 pt-6">
              <h2 className="font-nunito font-bold text-xl text-umami-dark-gray mb-4">
                Настройки аккаунта
              </h2>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-nunito font-medium px-6 py-2 rounded-full transition-colors"
              >
                Выйти из аккаунта
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
