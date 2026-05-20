"use client";

import { ChangeEvent, RefObject } from "react";
import { FollowUser } from "../../services/followService";
import { Recipe } from "../../services/recipeService";
import EditProfileModal from "./EditProfileModal";
import FriendsSidebar from "./FriendsSidebar";
import ProfileRecipesSection from "./ProfileRecipesSection";

interface EditProfileFormData {
  name: string;
  username: string;
  email: string;
  bio: string;
  avatar_url: string | null;
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
  avatarLoading: boolean;
  isAvatarActionsOpen: boolean;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  onToggleAvatarActions: () => void;
  onAvatarFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onAvatarDeleteClick: () => void;
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
  onToggleRecipeVisibility: (recipe: Recipe) => void;
  onAddRecipeClick: () => void;
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
  avatarLoading,
  isAvatarActionsOpen,
  avatarInputRef,
  onToggleAvatarActions,
  onAvatarFileChange,
  onAvatarDeleteClick,
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
  onToggleRecipeVisibility,
  onAddRecipeClick,
  feedColumnRef,
  friends,
}: ProfileOverviewSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[678px_255px] lg:gap-5">
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
            avatarLoading={avatarLoading}
            isAvatarActionsOpen={isAvatarActionsOpen}
            avatarInputRef={avatarInputRef}
            onToggleAvatarActions={onToggleAvatarActions}
            onAvatarFileChange={onAvatarFileChange}
            onAvatarDeleteClick={onAvatarDeleteClick}
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
            onToggleVisibility={onToggleRecipeVisibility}
            onAddRecipeClick={onAddRecipeClick}
            feedColumnRef={feedColumnRef}
          />
        )}
      </div>
      <FriendsSidebar friends={friends} maxVisible={6} />
    </div>
  );
}

