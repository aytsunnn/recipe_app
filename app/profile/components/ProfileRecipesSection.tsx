"use client";

import { RefObject } from "react";
import Image from "next/image";
import FeedCard from "../../components/FeedCard";
import ScrollToTopButton from "../../components/ScrollToTopButton";
import { Recipe } from "../../services/recipeService";
import RecipeActionsMenu from "./RecipeActionsMenu";
import RecipeVisibilityFilter from "./RecipeVisibilityFilter";
import ProfileRecipesEmptyState from "./ProfileRecipesEmptyState";

interface ProfileRecipesSectionProps {
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  recipeFilter: "all" | "public" | "private";
  setRecipeFilter: (value: "all" | "public" | "private") => void;
  currentUserId: string;
  openRecipeActionsId: string | null;
  onToggleRecipeActions: (recipeId: string) => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeId: string) => void;
  onToggleVisibility: (recipe: Recipe) => void;
  feedColumnRef: RefObject<HTMLDivElement | null>;
}

export default function ProfileRecipesSection({
  recipes,
  filteredRecipes,
  recipeFilter,
  setRecipeFilter,
  currentUserId,
  openRecipeActionsId,
  onToggleRecipeActions,
  onEditRecipe,
  onDeleteRecipe,
  onToggleVisibility,
  feedColumnRef,
}: ProfileRecipesSectionProps) {
  if (recipes.length === 0) {
    return <ProfileRecipesEmptyState variant="empty" />;
  }

  return (
    <div ref={feedColumnRef} className="flex flex-col gap-2.5 pb-10">
      <RecipeVisibilityFilter
        value={recipeFilter}
        totalCount={recipes.length}
        publicCount={recipes.filter((r) => !r.is_private).length}
        privateCount={recipes.filter((r) => r.is_private).length}
        onChange={setRecipeFilter}
      />

      {filteredRecipes.length > 0 ? (
        filteredRecipes.map((recipe) => (
          <FeedCard
            key={recipe.id}
            recipe={recipe}
            currentUserId={currentUserId}
            isFollowing={false}
            showAuthorHeader={false}
            detailsQuery="from=profile"
            headerLeftSlot={
              <button
                type="button"
                onClick={() => onToggleVisibility(recipe)}
                className="inline-flex items-center gap-2 rounded-full px-2 py-1 hover:bg-[#f3efe2]"
              >
                <Image
                  width={20}
                  height={20}
                  src={recipe.is_private ? "/LockSimple.svg" : "/LockSimpleOpen.svg"}
                  alt="visibility"
                />
                <span className="font-nunito text-sm font-semibold text-umami-gray">
                  {recipe.is_private ? "Приватный" : "Публичный"}
                </span>
              </button>
            }
            headerRightSlot={
              <RecipeActionsMenu
                isOpen={openRecipeActionsId === recipe.id}
                onToggle={() => onToggleRecipeActions(recipe.id)}
                onEdit={() => onEditRecipe(recipe)}
                onDelete={() => onDeleteRecipe(recipe.id)}
              />
            }
          />
        ))
      ) : (
        <ProfileRecipesEmptyState variant="filtered" />
      )}
      <ScrollToTopButton anchorRef={feedColumnRef} />
    </div>
  );
}
