// app/services/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Получаем токен из localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    console.log(`[API] Запрос: ${options?.method || 'GET'} ${url}`);

    try {
      const hasBody = typeof options?.body !== 'undefined';
      const isFormData =
        typeof FormData !== 'undefined' && options?.body instanceof FormData;

      const response = await fetch(url, {
        ...options,
        headers: {
          ...(!isFormData && hasBody ? { 'Content-Type': 'application/json' } : {}),
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options?.headers,
        },
        mode: 'cors',
      });

      console.log(`[API] Ответ: ${response.status} ${response.statusText} для ${url}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API] Ошибка: ${errorText}`);

        try {
          const errorJson = JSON.parse(errorText) as { message?: string };
          throw new ApiError(
            response.status,
            errorJson.message || `API Error (${response.status}): ${response.statusText}`
          );
        } catch {
          throw new ApiError(
            response.status,
            `API Error (${response.status}): ${errorText || response.statusText}`
          );
        }
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('[API] Данные получены:', data);
        return data;
      }

      console.warn(`[API] Ответ не JSON для ${url}`);
      return {} as T;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`API request failed: ${url}`, error.message);
        throw error;
      }
      throw new Error('Unknown API error');
    }
  }

  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  postForm<T>(endpoint: string, formData: FormData, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    });
  }

  put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
