"use client";

interface MicrochefLauncherCardProps {
  isVisible: boolean;
  onOpen: () => void;
}

export default function MicrochefLauncherCard({
  isVisible,
  onOpen,
}: MicrochefLauncherCardProps) {
  if (!isVisible) return null;

  return (
    <div className="rounded-[15px] border border-[#eaeaea] bg-white p-3">
      <p className="font-nunito text-base font-bold text-umami-dark-gray">
        Микро-шеф
      </p>
      <p className="mt-1 font-inter text-sm text-umami-gray">
        Подскажет рецепт по вашим продуктам.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 w-full rounded-full bg-umami-orange px-3 py-2 font-nunito text-sm font-bold text-white hover:bg-[#dd8c45]"
      >
        Открыть чат
      </button>
    </div>
  );
}
