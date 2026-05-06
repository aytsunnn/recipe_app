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
  private readonly storageBaseUrl =
    process.env.NEXT_PUBLIC_STORAGE_URL || "http://188.233.238.70:9000";

  private toPublicUrl(value: string): string {
    const normalized = value.trim();
    if (!normalized) return normalized;

    const withPublicHost = normalized
      .replace("http://127.0.0.1:9000", this.storageBaseUrl)
      .replace("http://localhost:9000", this.storageBaseUrl)
      .replace("http://127.0.0.1:9001", this.storageBaseUrl)
      .replace("http://localhost:9001", this.storageBaseUrl);

    if (withPublicHost.startsWith("http://") || withPublicHost.startsWith("https://")) {
      return withPublicHost;
    }

    const base = this.storageBaseUrl.replace(/\/+$/, "");
    const path = withPublicHost.replace(/^\/+/, "");
    return `${base}/${path}`;
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
