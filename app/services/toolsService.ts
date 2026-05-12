import { apiClient } from "./api";

export type ParsedRecipeResponse = unknown;

class ToolsService {
  async parseRecipeByUrl(url: string): Promise<ParsedRecipeResponse> {
    return apiClient.post<ParsedRecipeResponse>("/tools/parse", { url });
  }
}

export const toolsService = new ToolsService();
