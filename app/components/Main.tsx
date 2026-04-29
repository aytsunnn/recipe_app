"use client";

import LeftPart from "./MainScreen/NavigationLeftPart";
import RightPart from "./MainScreen/NewsRightPart";
import MainPart from "./MainScreen/FeedOfPosts";

export default function Main() {
  return (
    <div className="w-full gap-5 flex flex-row">
      <div className="flex w-55.75">
        <LeftPart />
      </div>
      <div className="flex w-169.5">
        <MainPart />
      </div>
      <div className="flex w-63.75">
        <RightPart />
      </div>
    </div>
  );
}
