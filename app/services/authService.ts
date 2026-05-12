// app/services/authService.ts
import { apiClient } from './api';
import { normalizeImageUrl } from '../utils/imageUrl';

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

export interface VerifyEmailData {
  email: string;
  code: string;
}

export interface ResetPasswordData {
  email: string;
  code: string;
  new_password: string;
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

export interface RegisterResponse {
  message: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar_url: string | null;
}

class AuthService {
  // Р—Р°РјРµРЅСЏРµС‚ localhost URL РЅР° РїСѓР±Р»РёС‡РЅС‹Р№ Р°РґСЂРµСЃ
  private fixImageUrl(url: string | null): string | null {
    if (!url) return null;
    const normalized = normalizeImageUrl(url, "");
    return normalized || null;
  }

  // Р’С…РѕРґ
  async login(data: LoginData): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', data);
  }

  // Р РµРіРёСЃС‚СЂР°С†РёСЏ
  async register(data: RegisterData): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>('/auth/register', data);
  }

  // РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ email
  async verifyEmail(data: VerifyEmailData): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/verify-email', data);
  }

  // РџРѕРІС‚РѕСЂРЅР°СЏ РѕС‚РїСЂР°РІРєР° РєРѕРґР° РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ
  async requestEmailCode(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/password-recovery', { email });
  }

  // РћР±РЅРѕРІР»РµРЅРёРµ РїР°СЂРѕР»СЏ РїРѕ РєРѕРґСѓ
  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/reset-password', data);
  }

  // Р’С‹С…РѕРґ
  async logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  }

  // РЎРѕС…СЂР°РЅРµРЅРёРµ С‚РѕРєРµРЅР°
  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // РџРѕР»СѓС‡РµРЅРёРµ С‚РѕРєРµРЅР°
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  // РЈРґР°Р»РµРЅРёРµ С‚РѕРєРµРЅР°
  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // РџСЂРѕРІРµСЂРєР° Р°РІС‚РѕСЂРёР·Р°С†РёРё
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // РџРѕР»СѓС‡РµРЅРёРµ РґР°РЅРЅС‹С… С‚РµРєСѓС‰РµРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
  async getCurrentUser(): Promise<User | null> {
    if (!this.isAuthenticated()) {
      return null;
    }
    try {
      const user = await apiClient.get<User>('/users/me');
      // РСЃРїСЂР°РІР»СЏРµРј URL Р°РІР°С‚Р°СЂР°
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

  // РЈРІРµРґРѕРјР»РµРЅРёРµ РѕР± РёР·РјРµРЅРµРЅРёРё СЃРѕСЃС‚РѕСЏРЅРёСЏ Р°РІС‚РѕСЂРёР·Р°С†РёРё
  dispatchAuthChange(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }
  }
}

export const authService = new AuthService();


