"use client";

import Image from "next/image";
import { RefObject } from "react";
import { Recipe } from "../../services/recipeService";
import MicrochefChatComposer from "./MicrochefChatComposer";
import MicrochefHelpSidebar from "./MicrochefHelpSidebar";
import MicrochefMessageList from "./MicrochefMessageList";

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

interface MicrochefChatModalProps {
  isOpen: boolean;
  messages: ChatMessage[];
  chatLoading: boolean;
  savingDraftId: string | null;
  expandedDraftIds: Set<string>;
  chatInputRef: RefObject<HTMLTextAreaElement | null>;
  chatInput: string;
  canSend: boolean;
  onClose: () => void;
  onSaveDraft: (messageId: string, draft: RecipeDraft) => void;
  onToggleExpanded: (messageId: string) => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export default function MicrochefChatModal({
  isOpen,
  messages,
  chatLoading,
  savingDraftId,
  expandedDraftIds,
  chatInputRef,
  chatInput,
  canSend,
  onClose,
  onSaveDraft,
  onToggleExpanded,
  onInputChange,
  onSend,
}: MicrochefChatModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="grid h-[80vh] w-full max-w-[1080px] grid-cols-[minmax(0,1fr)_320px] gap-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[20px] border border-[#eaeaea] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-nunito text-xl font-bold text-umami-dark-gray">
              Чат с микро-шефом
            </h3>
            <button type="button" onClick={onClose} aria-label="Закрыть чат">
              <Image src="/X.svg" alt="close" width={24} height={24} />
            </button>
          </div>

          <MicrochefMessageList
            messages={messages}
            chatLoading={chatLoading}
            savingDraftId={savingDraftId}
            expandedDraftIds={expandedDraftIds}
            onSaveDraft={onSaveDraft}
            onToggleExpanded={onToggleExpanded}
          />

          <MicrochefChatComposer
            inputRef={chatInputRef}
            value={chatInput}
            canSend={canSend}
            onChange={onInputChange}
            onSend={onSend}
          />
        </div>
        <MicrochefHelpSidebar />
      </div>
    </div>
  );
}
