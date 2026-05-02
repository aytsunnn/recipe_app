// app/services/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://188.233.238.70:5000';

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
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options?.headers,
        },
        mode: 'cors', // Явно указываем CORS режим
      });

      console.log(`[API] Ответ: ${response.status} ${response.statusText} для ${url}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API] Ошибка: ${errorText}`);
        
        // Пытаемся распарсить JSON ошибку
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || `API Error (${response.status}): ${response.statusText}`);
        } catch (parseError) {
          throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`[API] Данные получены:`, data);
        return data;
      }
      
      // Если ответ не JSON, возвращаем пустой объект
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

  put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);