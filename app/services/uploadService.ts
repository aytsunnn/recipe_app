import { apiClient } from "./api";

interface UploadResponse {
  fileName?: string;
  file_name?: string;
  path?: string;
  url?: string;
  image_url?: string;
  location?: string;
}

class UploadService {
  private toPublicUrl(value: string): string {
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (value.startsWith("/")) return value;
    return `/${value}`;
  }

  async uploadImage(file: File, folder: "recipes" | "steps" | "avatars"): Promise<string> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("folder", folder);

    const response = await apiClient.postForm<UploadResponse>("/upload", formData);
    const rawValue =
      response?.url ||
      response?.image_url ||
      response?.location ||
      response?.path ||
      response?.fileName ||
      response?.file_name;

    if (!rawValue) {
      throw new Error("Сервер не вернул путь к загруженному изображению");
    }

    return this.toPublicUrl(rawValue);
  }
}

export const uploadService = new UploadService();
