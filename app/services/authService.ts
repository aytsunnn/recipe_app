// app/services/authService.ts
import { apiClient } from './api';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  name: string;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  user?: {
    id: string;
    email: string;
    username: string;
    name: string;
    avatar_url: string | null;
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar_url: string | null;
}

class AuthService {
  // Заменяет localhost URL на публичный адрес
  private fixImageUrl(url: string | null): string | null {
    if (!url) return null;
    const fixed = url.replace('http://127.0.0.1:9000', 'http://188.233.238.70:9000');
    // Validate the URL is actually usable
    if (fixed.startsWith('http://') || fixed.startsWith('https://') || fixed.startsWith('/')) {
      return fixed;
    }
    return null;
  }

  // Вход
  async login(data: LoginData): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', data);
  }

  // Регистрация
  async register(data: RegisterData): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', data);
  }

  // Выход
  async logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  }

  // Сохранение токена
  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // Получение токена
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  // Удаление токена
  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Проверка авторизации
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Получение данных текущего пользователя
  async getCurrentUser(): Promise<User | null> {
    if (!this.isAuthenticated()) {
      return null;
    }
    try {
      const user = await apiClient.get<User>('/users/me');
      // Исправляем URL аватара
      return {
        ...user,
        avatar_url: this.fixImageUrl(user.avatar_url),
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
      this.removeToken();
      return null;
    }
  }
}

export const authService = new AuthService();
