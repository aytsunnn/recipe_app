"use client";

export default function MicrochefHelpSidebar() {
  return (
    <aside className="h-full rounded-[20px] border border-[#ECE5D8] bg-[#FFFCF7] p-4">
      <p className="font-nunito text-base font-bold text-[#4D3E2E]">Как спросить</p>
      <p className="mt-1 text-xs text-[#8B7A67]">
        Короткий формат запроса дает лучший результат.
      </p>

      <div className="mt-3 space-y-2">
        <div className="rounded-xl border border-[#EFE5D6] bg-white px-3 py-2">
          <p className="font-nunito text-[11px] font-bold uppercase tracking-wide text-[#9A846B]">
            Шаг 1
          </p>
          <p className="mt-1 text-sm text-[#5E5142]">Продукты через запятую</p>
        </div>

        <div className="rounded-xl border border-[#EFE5D6] bg-white px-3 py-2">
          <p className="font-nunito text-[11px] font-bold uppercase tracking-wide text-[#9A846B]">
            Шаг 2
          </p>
          <p className="mt-1 text-sm text-[#5E5142]">
            Добавьте условия, если нужно
          </p>
        </div>

        <div className="rounded-xl border border-[#E6D6BE] bg-[#FFF5E7] px-3 py-2">
          <p className="font-nunito text-[11px] font-bold uppercase tracking-wide text-[#B07534]">
            Пример
          </p>
          <p className="mt-1 text-sm text-[#6A533A]">
            курица, рис, томаты, без сахара, на 2 порции
          </p>
        </div>
      </div>
    </aside>
  );
}
