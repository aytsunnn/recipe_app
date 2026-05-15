"use client";

interface EditProfileFormData {
  name: string;
  username: string;
  email: string;
  newPassword: string;
  confirmNewPassword: string;
  verifyCode: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  isVerificationStep: boolean;
  isLoading: boolean;
  message: string | null;
  formData: EditProfileFormData;
  onChange: (next: EditProfileFormData) => void;
  onSave: () => void;
  onResendCode: () => void;
  onClose: () => void;
}

export default function EditProfileModal({
  isOpen,
  isVerificationStep,
  isLoading,
  message,
  formData,
  onChange,
  onSave,
  onResendCode,
  onClose,
}: EditProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="rounded-[20px] border border-[#eaeaea] bg-white p-6">
      <h2 className="mb-4 font-nunito text-2xl font-bold text-umami-dark-gray">
        Редактировать профиль
      </h2>
      {message && (
        <p className="mb-4 rounded-xl bg-[#f6f6f6] px-3 py-2 font-nunito text-sm text-umami-dark-gray">
          {message}
        </p>
      )}
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block font-inter text-sm text-umami-gray">Имя</span>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onChange({ ...formData, name: e.target.value })}
            className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-inter text-sm text-umami-gray">
            Имя пользователя
          </span>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => onChange({ ...formData, username: e.target.value })}
            className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-inter text-sm text-umami-gray">Email</span>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onChange({ ...formData, email: e.target.value })}
            className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-inter text-sm text-umami-gray">
            Новый пароль
          </span>
          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) =>
              onChange({ ...formData, newPassword: e.target.value })
            }
            placeholder="Оставьте пустым, если не меняете"
            className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-inter text-sm text-umami-gray">
            Подтвердите новый пароль
          </span>
          <input
            type="password"
            value={formData.confirmNewPassword}
            onChange={(e) =>
              onChange({ ...formData, confirmNewPassword: e.target.value })
            }
            placeholder="Повторите новый пароль"
            className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
          />
        </label>
        {isVerificationStep && (
          <>
            <label className="block">
              <span className="mb-1 block font-inter text-sm text-umami-gray">
                Код подтверждения
              </span>
              <input
                type="text"
                value={formData.verifyCode}
                onChange={(e) => onChange({ ...formData, verifyCode: e.target.value })}
                placeholder="Введите код из письма"
                className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
              />
            </label>
            <button
              type="button"
              onClick={onResendCode}
              disabled={isLoading}
              className="w-fit font-nunito text-xs text-umami-green underline disabled:opacity-60"
            >
              Отправить код повторно
            </button>
          </>
        )}
      </div>
      <div className="mt-6 flex gap-4">
        <button
          type="button"
          disabled={isLoading}
          onClick={onSave}
          className="flex-1 rounded-full bg-umami-green px-6 py-2 font-nunito font-medium text-white disabled:opacity-60"
        >
          {isLoading
            ? "Сохраняем..."
            : isVerificationStep
              ? "Подтвердить и сохранить"
              : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full bg-umami-gray px-6 py-2 font-nunito font-medium text-white"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
