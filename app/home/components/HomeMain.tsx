"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LeftPart from "../../components/MainScreen/NavigationLeftPart";
import RightPart from "../../components/MainScreen/NewsRightPart";
import MainPart from "../../components/MainScreen/FeedOfPosts";
import FiltersPanel, { FilterValues } from "../../components/MainScreen/FiltersPanel";

function MainFilters() {
  const searchParams = useSearchParams();
  const showFilters = searchParams?.get("filters") === "true";

  if (!showFilters) return null;

  const handleApplyFilters = (newFilters: FilterValues) => {
    void newFilters;
  };

  return <FiltersPanel onApplyFilters={handleApplyFilters} />;
}

export default function HomeMain() {
  return (
    <div className="w-full flex flex-row gap-5">
      <div className="flex w-55.75">
        <Suspense fallback={<div className="text-umami-gray">Загрузка...</div>}>
          <LeftPart />
        </Suspense>
      </div>

      <div className="flex w-[59.0625rem] flex-col gap-2">
        <Suspense fallback={null}>
          <MainFilters />
        </Suspense>

        <div className="flex flex-row gap-5">
          <div className="flex w-169.5">
            <Suspense fallback={<div className="text-umami-gray">Загрузка...</div>}>
              <MainPart />
            </Suspense>
          </div>
          <div className="flex w-63.75">
            <RightPart />
          </div>
        </div>
      </div>
    </div>
  );
}
