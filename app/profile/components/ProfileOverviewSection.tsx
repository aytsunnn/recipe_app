"use client";

import { RefObject } from "react";
import { FollowUser } from "../../services/followService";
import { Recipe } from "../../services/recipeService";
import EditProfileModal from "./EditProfileModal";
import FriendsSidebar from "./FriendsSidebar";
import ProfileRecipesSection from "./ProfileRecipesSection";

interface EditProfileFormData {
  name: string;
  username: string;
  email: string;
  newPassword: string;
  confirmNewPassword: string;
  verifyCode: string;
}

interface ProfileOverviewSectionProps {
  isEditModalOpen: boolean;
  isEditVerificationStep: boolean;
  isEditProfileLoading: boolean;
  editProfileMessage: string | null;
  editFormData: EditProfileFormData;
  setEditFormData: (next: EditProfileFormData) => void;
  handleSaveProfile: () => void;
  handleResendEditVerificationCode: () => void;
  closeEditModal: () => void;
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  recipeFilter: "all" | "public" | "private";
  setRecipeFilter: (value: "all" | "public" | "private") => void;
  currentUserId: string;
  openRecipeActionsId: string | null;
  onToggleRecipeActions: (recipeId: string) => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeId: string) => void;
  feedColumnRef: RefObject<HTMLDivElement | null>;
  friends: FollowUser[];
}

export default function ProfileOverviewSection({
  isEditModalOpen,
  isEditVerificationStep,
  isEditProfileLoading,
  editProfileMessage,
  editFormData,
  setEditFormData,
  handleSaveProfile,
  handleResendEditVerificationCode,
  closeEditModal,
  recipes,
  filteredRecipes,
  recipeFilter,
  setRecipeFilter,
  currentUserId,
  openRecipeActionsId,
  onToggleRecipeActions,
  onEditRecipe,
  onDeleteRecipe,
  feedColumnRef,
  friends,
}: ProfileOverviewSectionProps) {
  return (
    <div className="grid grid-cols-[678px_255px] gap-5">
      <div className="flex min-w-0 flex-col gap-2.5">
        {isEditModalOpen ? (
          <EditProfileModal
            isOpen={isEditModalOpen}
            isVerificationStep={isEditVerificationStep}
            isLoading={isEditProfileLoading}
            message={editProfileMessage}
            formData={editFormData}
            onChange={setEditFormData}
            onSave={handleSaveProfile}
            onResendCode={handleResendEditVerificationCode}
            onClose={closeEditModal}
          />
        ) : (
          <ProfileRecipesSection
            recipes={recipes}
            filteredRecipes={filteredRecipes}
            recipeFilter={recipeFilter}
            setRecipeFilter={setRecipeFilter}
            currentUserId={currentUserId}
            openRecipeActionsId={openRecipeActionsId}
            onToggleRecipeActions={onToggleRecipeActions}
            onEditRecipe={onEditRecipe}
            onDeleteRecipe={onDeleteRecipe}
            feedColumnRef={feedColumnRef}
          />
        )}
      </div>
      <FriendsSidebar friends={friends} maxVisible={6} />
    </div>
  );
}
