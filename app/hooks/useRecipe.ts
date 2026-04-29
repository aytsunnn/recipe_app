import { useState, useEffect } from "react";
import { recipeService, Recipe } from "../services/recipeService";

export function useRecipe(id: string) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchRecipe = async () => {
      try {
        setLoading(true);
        const data = await recipeService.getById(id);
        setRecipe(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  return { recipe, loading, error };
}
