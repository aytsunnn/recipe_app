"use client";

import { RefObject } from "react";
import Image from "next/image";
import FeedCard from "../../components/FeedCard";
import ScrollToTopButton from "../../components/ScrollToTopButton";
import { Recipe } from "../../services/recipeService";
import RecipeActionsMenu from "./RecipeActionsMenu";
import RecipeVisibilityFilter from "./RecipeVisibilityFilter";
import ProfileRecipesEmptyState from "./ProfileRecipesEmptyState";
import { div } from "framer-motion/client";

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
              recipe.is_private ? (
                <div className="flex gap-2 justify-center items-center">
                  <Image
                    width={20}
                    height={20}
                    src="/LockSimple.svg"
                    alt="lock"
                  />
                  <span className="font-nunito text-sm font-semibold text-umami-gray">
                    Приватный
                  </span>
                </div>
              ) : null
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
