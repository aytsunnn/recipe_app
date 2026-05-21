// app/services/authService.ts
import { ApiError, apiClient } from './api';
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
  bio?: string | null;
  role?: string;
  is_blocked?: boolean;
}

class AuthService {
  getRoleFromToken(): string | undefined {
    const token = this.getToken();
    if (!token) return undefined;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return undefined;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const decoded = atob(padded);
      const payload = JSON.parse(decoded) as { role?: string };
      return payload.role;
    } catch {
      return undefined;
    }
  }

  private fixImageUrl(url: string | null): string | null {
    if (!url) return null;
    const normalized = normalizeImageUrl(url, '');
    return normalized || null;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', data);
  }

  async register(data: RegisterData): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>('/auth/register', data);
  }

  async verifyEmail(data: VerifyEmailData): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/verify-email', data);
  }

  async requestPasswordRecoveryCode(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/password-recovery', { email });
  }

  async resendVerificationCode(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/resend-code', { email });
  }

  // Backward-compatible alias for old call sites.
  async requestEmailCode(email: string): Promise<{ message: string }> {
    return this.requestPasswordRecoveryCode(email);
  }

  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/reset-password', data);
  }

  async logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  }

  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      const user = await apiClient.get<User>('/users/me');
      return {
        ...user,
        role: user.role || this.getRoleFromToken(),
        avatar_url: this.fixImageUrl(user.avatar_url),
      };
    } catch (error) {
      console.error('Failed to get current user:', error);

      // Сбрасываем токен только если он реально невалиден (401).
      // 403 может прилетать из-за прав на конкретный роут, токен при этом валидный.
      if (error instanceof ApiError && error.status === 401) {
        this.removeToken();
      }

      return null;
    }
  }

  dispatchAuthChange(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }
  }
}

export const authService = new AuthService();
