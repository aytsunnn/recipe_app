"use client";

import Image from "next/image";

interface RecipeActionsMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function RecipeActionsMenu({
  isOpen,
  onToggle,
  onEdit,
  onDelete,
}: RecipeActionsMenuProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle();
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-umami-light-gray/70"
        aria-label="Действия"
      >
        <Image
          width={18}
          height={18}
          src="/DotsThreeOutlineVertical.svg"
          alt="actions"
        />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-9 z-20 min-w-[160px] rounded-xl border border-umami-light-gray/60 bg-white p-1 shadow-md">
          <button
            type="button"
            onClick={onEdit}
            className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-umami-dark-gray hover:bg-[#f7f4ea]"
          >
            Редактировать
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-full rounded-lg px-3 py-2 text-left font-inter text-sm text-red-500 hover:bg-red-50"
          >
            Удалить
          </button>
        </div>
      ) : null}
    </div>
  );
}
