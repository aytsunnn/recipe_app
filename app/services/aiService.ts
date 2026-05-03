import { apiClient } from "./api";

interface GenerateRecipeRequest {
  products: string[];
}

type GenerateRecipeResponse = unknown;

class AiService {
  async generateByProducts(products: string[]): Promise<GenerateRecipeResponse> {
    return apiClient.post<GenerateRecipeResponse>("/ai/generate", { products } satisfies GenerateRecipeRequest);
  }
}

export const aiService = new AiService();

