"use client";

import { Suspense } from "react";
import LeftPart from "../components/MainScreen/NavigationLeftPart";
import RightPart from "../components/MainScreen/NewsRightPart";
import WeekMenuContent from "./components/WeekMenuContent";

export default function WeekMenuPage() {
  return (
    <div className="flex w-full gap-5">
      <div className="hidden lg:flex lg:w-55.75">
        <Suspense fallback={<div className="text-umami-gray">Загрузка...</div>}>
          <LeftPart />
        </Suspense>
      </div>

      <div className="w-full pb-10 lg:w-169.5">
        <WeekMenuContent editable={false} />
      </div>

      <div className="hidden lg:flex lg:w-63.75">
        <RightPart />
      </div>
    </div>
  );
}



