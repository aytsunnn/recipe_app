"use client";

import { Recipe } from "../../services/recipeService";

type RecipeDraft = {
  title: string;
  description: string;
  difficulty?: string;
  portion?: number;
  cooking_time?: number;
  calorific?: number;
  proteins?: number;
  fats?: number;
  carbohydrates?: number;
  kitchen?: string;
  celebration?: string;
  cookingType?: string;
  ingredients: Array<{
    name: string;
    quantity?: string;
    unit?: string;
  }>;
  steps: Array<{
    step_number?: number;
    description: string;
  }>;
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text?: string;
  recipeDraft?: RecipeDraft;
  recipeCard?: Recipe;
}

interface MicrochefMessageListProps {
  messages: ChatMessage[];
  chatLoading: boolean;
  savingDraftId: string | null;
  expandedDraftIds: Set<string>;
  onSaveDraft: (messageId: string, draft: RecipeDraft) => void;
  onToggleExpanded: (messageId: string) => void;
}

export default function MicrochefMessageList({
  messages,
  chatLoading,
  savingDraftId,
  expandedDraftIds,
  onSaveDraft,
  onToggleExpanded,
}: MicrochefMessageListProps) {
  return (
    <div className="modal-thin-scroll flex-1 space-y-2 overflow-y-auto rounded-2xl border border-[#efefef] bg-[#faf9f6] p-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`${message.role === "user" ? "ml-auto" : ""} w-fit max-w-[92%] sm:max-w-[85%]`}
        >
          {message.recipeCard || message.recipeDraft ? (
            <div className="w-fit max-w-[560px] rounded-2xl border border-[#E9E1D2] bg-white p-3 sm:p-4">
              <div className="w-full text-left">
                <p className="line-clamp-2 font-nunito text-base font-bold text-umami-dark-gray sm:text-lg">
                  {message.recipeDraft?.title || message.recipeCard?.title}
                </p>
                <p className="mt-1 line-clamp-3 text-sm text-umami-gray">
                  {message.recipeDraft?.description || message.recipeCard?.description}
                </p>
                <p className="mt-2 text-xs text-umami-gray">
                  {message.recipeDraft?.portion ?? message.recipeCard?.portion
                    ? `${message.recipeDraft?.portion ?? message.recipeCard?.portion} порц. • `
                    : ""}
                  {message.recipeDraft?.cooking_time ?? message.recipeCard?.cooking_time
                    ? `${message.recipeDraft?.cooking_time ?? message.recipeCard?.cooking_time} мин • `
                    : ""}
                  {message.recipeDraft?.difficulty || message.recipeCard?.difficulty || "без уровня"}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {message.recipeDraft ? (
                  <button
                    type="button"
                    disabled={savingDraftId === message.id}
                    onClick={() => onSaveDraft(message.id, message.recipeDraft!)}
                    className="rounded-full bg-umami-green px-3 py-1.5 font-nunito text-xs font-bold text-white disabled:opacity-60"
                  >
                    {savingDraftId === message.id ? "Сохраняем..." : "Сохранить как приватный"}
                  </button>
                ) : null}

                {message.recipeDraft ? (
                  <button
                    type="button"
                    onClick={() => onToggleExpanded(message.id)}
                    className="rounded-full bg-umami-orange px-3 py-1.5 font-nunito text-xs font-bold text-white"
                  >
                    {expandedDraftIds.has(message.id) ? "Свернуть" : "Подробнее"}
                  </button>
                ) : null}
              </div>

              {message.recipeDraft && expandedDraftIds.has(message.id) ? (
                <div className="mt-3 space-y-3 rounded-xl border border-[#E6D6BE] bg-[#FFF8EC] p-3">
                  <div className="grid grid-cols-1 gap-1 text-xs text-[#6A533A] sm:grid-cols-2 sm:gap-2">
                    {typeof message.recipeDraft.calorific === "number" ? (
                      <p>Калории: {message.recipeDraft.calorific}</p>
                    ) : null}
                    {typeof message.recipeDraft.proteins === "number" ? (
                      <p>Белки: {message.recipeDraft.proteins}</p>
                    ) : null}
                    {typeof message.recipeDraft.fats === "number" ? (
                      <p>Жиры: {message.recipeDraft.fats}</p>
                    ) : null}
                    {typeof message.recipeDraft.carbohydrates === "number" ? (
                      <p>Углеводы: {message.recipeDraft.carbohydrates}</p>
                    ) : null}
                    {message.recipeDraft.kitchen ? <p>Кухня: {message.recipeDraft.kitchen}</p> : null}
                    {message.recipeDraft.celebration ? <p>Праздник: {message.recipeDraft.celebration}</p> : null}
                    {message.recipeDraft.cookingType ? <p>Тип: {message.recipeDraft.cookingType}</p> : null}
                  </div>

                  {message.recipeDraft.ingredients.length > 0 ? (
                    <div>
                      <p className="font-nunito text-xs font-bold uppercase tracking-wide text-[#9A846B]">
                        Ингредиенты
                      </p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-[#5E5142]">
                        {message.recipeDraft.ingredients.map((item, idx) => (
                          <li key={`inline-ing-${message.id}-${idx}`}>
                            {item.name}
                            {item.quantity ? ` — ${item.quantity}` : ""}
                            {item.unit ? ` ${item.unit}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {message.recipeDraft.steps.length > 0 ? (
                    <div>
                      <p className="font-nunito text-xs font-bold uppercase tracking-wide text-[#9A846B]">
                        Шаги
                      </p>
                      <ol className="mt-1 list-decimal pl-5 text-sm text-[#5E5142]">
                        {message.recipeDraft.steps.map((item, idx) => (
                          <li key={`inline-step-${message.id}-${idx}`}>{item.description}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className={`inline-block max-w-full whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-umami-orange text-white"
                  : "bg-white text-umami-dark-gray"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      ))}
      {chatLoading && (
        <div className="max-w-[85%] rounded-2xl bg-white px-3 py-2 text-sm text-umami-gray">
          Микро-шеф думает...
        </div>
      )}
    </div>
  );
}
