// app/utils/validation.ts

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Пароль должен содержать не менее 8 символов');
  }

  if (!/\d/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну цифру');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну строчную латинскую букву');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну прописную латинскую букву');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы один специальный символ');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUsername = (username: string): string | null => {
  if (username.length < 3) {
    return 'Имя пользователя должно содержать не менее 3 символов';
  }
  if (username.length > 20) {
    return 'Имя пользователя должно содержать не более 20 символов';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Имя пользователя может содержать только латинские буквы, цифры и подчеркивание';
  }
  return null;
};
