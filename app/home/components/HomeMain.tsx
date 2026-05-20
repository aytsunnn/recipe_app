"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LeftPart from "../../components/MainScreen/NavigationLeftPart";
import RightPart from "../../components/MainScreen/NewsRightPart";
import MainPart from "../../components/MainScreen/FeedOfPosts";
import FiltersPanel, { FilterValues } from "../../components/MainScreen/FiltersPanel";
import { Category, metaService } from "../../services/metaService";
import { normalizeImageUrl } from "../../utils/imageUrl";

function MainFilters() {
  const searchParams = useSearchParams();
  const showFilters = searchParams?.get("filters") === "true";

  if (!showFilters) return null;

  const handleApplyFilters = (newFilters: FilterValues) => {
    void newFilters;
  };

  return <FiltersPanel onApplyFilters={handleApplyFilters} />;
}

function MobileCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const showFilters = searchParams?.get("filters") === "true";

  useEffect(() => {
    let cancelled = false;
    metaService
      .getCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = new Set((searchParams.get("category_id") || "").split(",").filter(Boolean));

  const toggleCategory = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    const params = new URLSearchParams(searchParams.toString());
    if (next.size > 0) {
      params.set("category_id", Array.from(next).join(","));
      params.set("filters", "true");
    } else {
      params.delete("category_id");
      params.delete("filters");
    }
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  if (!categories.length || showFilters) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((category) => {
        const active = selected.has(category.id);
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => toggleCategory(category.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-2 py-1.5 ${
              active
                ? "border-umami-orange bg-umami-orange/10"
                : "border-umami-light-gray/50 bg-white"
            }`}
          >
            <Image
              src={normalizeImageUrl(category.image_url, "/Pizza_3D.svg")}
              alt={category.name}
              width={22}
              height={22}
              className="h-[22px] w-[22px] rounded-md object-cover"
            />
            <span className="whitespace-nowrap font-nunito text-xs font-bold text-umami-dark-gray">
              {category.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function HomeMain() {
  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-5">
      <div className="hidden lg:flex lg:w-55.75">
        <Suspense fallback={<div className="text-umami-gray">Загрузка...</div>}>
          <LeftPart />
        </Suspense>
      </div>

      <div className="flex w-full flex-col gap-2 lg:w-[59.0625rem]">
        <Suspense fallback={null}>
          <MainFilters />
        </Suspense>
        <Suspense fallback={null}>
          <MobileCategories />
        </Suspense>

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
          <div className="flex w-full lg:w-169.5">
            <Suspense fallback={<div className="text-umami-gray">Загрузка...</div>}>
              <MainPart />
            </Suspense>
          </div>
          <div className="hidden lg:flex lg:w-63.75">
            <RightPart />
          </div>
        </div>
      </div>
    </div>
  );
}
