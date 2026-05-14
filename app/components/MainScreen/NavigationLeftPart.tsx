"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { metaService, Category } from "../../services/metaService";
import { authService, User } from "../../services/authService";
import { normalizeImageUrl } from "../../utils/imageUrl";
import { canAccessModeration, isAdminRole } from "../../utils/role";

const navItems = [
  { href: "/", label: "Главная", icon: "/House.svg" },
  { href: "/profile", label: "Личный кабинет", icon: "/User.svg" },
  { href: "/favorites", label: "Избранное", icon: "/Favorites.svg" },
  {
    href: "/profile#week-menu",
    label: "Меню недели",
    icon: "/ClipboardText.svg",
  },
  { href: "/recipes/random", label: "Случайный рецепт", icon: "/DiceFive.svg" },
];

export default function LeftPart() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await metaService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Ошибка загрузки категорий:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    const categoryIds = searchParams.get("category_id");
    if (categoryIds) {
      const ids = categoryIds.split(",").filter(Boolean);
      setSelectedCategories(new Set(ids));
    } else {
      setSelectedCategories(new Set());
    }
  }, [searchParams]);

  useEffect(() => {
    const syncAuthState = async () => {
      const isAuth = authService.isAuthenticated();
      setIsAuthenticated(isAuth);
      if (!isAuth) {
        setCurrentUser(null);
        return;
      }
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    };

    void syncAuthState();
    window.addEventListener("auth-change", syncAuthState);
    return () => {
      window.removeEventListener("auth-change", syncAuthState);
    };
  }, []);

  const effectiveRole = currentUser?.role || authService.getRoleFromToken();
  const canModerate = canAccessModeration(effectiveRole);
  const moderationLabel = isAdminRole(effectiveRole)
    ? "Админ-панель"
    : "Модерация";
  const roleNavItem = canModerate
    ? { href: "/moderation", label: moderationLabel, icon: "/Shield.svg" }
    : null;
  const resolvedNavItems = roleNavItem ? [...navItems, roleNavItem] : navItems;

  const handleCategoryClick = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);

    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }

    setSelectedCategories(newSelected);

    const params = new URLSearchParams(searchParams.toString());
    if (newSelected.size > 0) {
      params.set("category_id", Array.from(newSelected).join(","));
      params.set("filters", "true");
    } else {
      params.delete("category_id");
      params.delete("filters");
    }

    router.push(`/?${params.toString()}`);
  };

  const getCategoryImageUrl = (imageUrl?: string | null) => {
    return normalizeImageUrl(imageUrl, "/Pizza_3D.svg");
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col">
        <div className="flex flex-col gap-1.25">
          <p className="font-nunito font-bold text-xl text-umami-orange">
            Категории
          </p>
          <p className="text-umami-gray text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-col gap-1.25">
        {isAuthenticated && (
          <div className="mb-5 flex flex-col gap-1">
            {resolvedNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex h-[30px] items-center gap-2.5 rounded-[7px] px-[5px] font-nunito text-xs font-bold text-umami-dark-gray transition-colors ${
                  pathname === item.href
                    ? "bg-[#f1ebdb]"
                    : "hover:bg-[#f1ebdb]/70"
                }`}
              >
                <Image width={20} height={20} src={item.icon} alt="" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}

        <p className="font-nunito font-bold text-xl text-umami-orange">
          Категории
        </p>
        <div className="grid grid-cols-3 w-full gap-2.5">
          {categories.map((category) => {
            const isSelected = selectedCategories.has(category.id);
            return (
              <div
                key={category.id}
                className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleCategoryClick(category.id)}
              >
                <div
                  className={`w-17.75 h-17.75 flex justify-center items-center border rounded-2xl transition-colors ${
                    isSelected
                      ? "border-umami-orange bg-umami-orange/10"
                      : "border-umami-light-gray/50 bg-white"
                  }`}
                >
                  <Image
                    src={getCategoryImageUrl(category.image_url)}
                    width={55}
                    height={55}
                    alt={category.name}
                    className="h-[55px] w-[55px] rounded-xl object-cover"
                  />
                </div>
                <p
                  className={`font-nunito font-bold text-sm max-w-17.75 transition-colors ${
                    isSelected ? "text-umami-orange" : "text-umami-dark-gray"
                  }`}
                >
                  {category.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
