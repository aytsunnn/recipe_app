import { apiClient } from "./api";
import { normalizeImageUrl } from "../utils/imageUrl";


interface UploadResponse {
  fileName?: string;
  file_name?: string;
  path?: string;
  url?: string;
  image_url?: string;
  location?: string;
}

class UploadService {
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
      throw new Error("РЎРµСЂРІРµСЂ РЅРµ РІРµСЂРЅСѓР» РїСѓС‚СЊ Рє Р·Р°РіСЂСѓР¶РµРЅРЅРѕРјСѓ РёР·РѕР±СЂР°Р¶РµРЅРёСЋ");
    }
 
    return normalizeImageUrl(rawValue, "");
  }
}


export const uploadService = new UploadService();


