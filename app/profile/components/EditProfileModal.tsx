"use client";

import Image from "next/image";
import { ChangeEvent, RefObject, useState } from "react";
import { normalizeImageUrl } from "../../utils/imageUrl";

interface EditProfileFormData {
  name: string;
  username: string;
  email: string;
  bio: string;
  avatar_url: string | null;
  newPassword: string;
  confirmNewPassword: string;
  verifyCode: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  isVerificationStep: boolean;
  isLoading: boolean;
  avatarLoading: boolean;
  isAvatarActionsOpen: boolean;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  message: string | null;
  formData: EditProfileFormData;
  onChange: (next: EditProfileFormData) => void;
  onSave: () => void;
  onResendCode: () => void;
  onClose: () => void;
  onToggleAvatarActions: () => void;
  onAvatarFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onAvatarDeleteClick: () => void;
}

export default function EditProfileModal({
  isOpen,
  isVerificationStep,
  isLoading,
  avatarLoading,
  isAvatarActionsOpen,
  avatarInputRef,
  message,
  formData,
  onChange,
  onSave,
  onResendCode,
  onClose,
  onToggleAvatarActions,
  onAvatarFileChange,
  onAvatarDeleteClick,
}: EditProfileModalProps) {
  if (!isOpen) return null;
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  return (
    <div className="rounded-[20px] border border-[#eaeaea] bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-nunito text-2xl font-bold text-umami-dark-gray">
          Редактировать профиль
        </h2>
        <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-[#f3efe2]">
          <Image src="/X.svg" alt="close" width={18} height={18} />
        </button>
      </div>

      {message && (
        <p className="mb-4 rounded-xl bg-[#f6f6f6] px-3 py-2 font-nunito text-sm text-umami-dark-gray">
          {message}
        </p>
      )}

      <div className="mb-4 flex justify-center">
        <div className="relative h-28 w-28 overflow-visible">
          <div className="h-full w-full overflow-hidden rounded-full">
            <Image
              width={112}
              height={112}
              src={normalizeImageUrl(formData.avatar_url, "/avatar.jpg")}
              alt="avatar"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={onToggleAvatarActions}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45"
              aria-label="avatar-actions"
            >
              <Image src="/Camera.svg" alt="camera" width={24} height={24} />
            </button>
          </div>
          {isAvatarActionsOpen ? (
            <div className="absolute left-[calc(100%+10px)] top-1/2 z-20 flex w-40 -translate-y-1/2 flex-col gap-2 rounded-2xl border border-umami-light-gray/50 bg-white p-2 shadow-md">
              <button
                type="button"
                disabled={avatarLoading}
                onClick={() => avatarInputRef.current?.click()}
                className="w-full rounded-full bg-[#f3efe2] px-3 py-1 text-xs font-bold text-umami-dark-gray"
              >
                {avatarLoading ? "Загрузка..." : "Изменить фото"}
              </button>
              <button
                type="button"
                disabled={avatarLoading}
                onClick={onAvatarDeleteClick}
                className="w-full rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white"
              >
                Удалить фото
              </button>
            </div>
          ) : null}
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onAvatarFileChange}
        />
      </div>

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
          <span className="mb-1 block font-inter text-sm text-umami-gray">Имя пользователя</span>
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
            readOnly
            className="w-full rounded-full border border-umami-light-gray bg-[#f8f8f8] px-4 py-2 font-nunito text-sm text-umami-gray"
          />
        </label>
        <div className="block">
          <button
            type="button"
            onClick={() => setShowPasswordFields((prev) => !prev)}
            className="rounded-full bg-[#f3efe2] px-4 py-1.5 font-nunito text-xs font-bold text-umami-dark-gray"
          >
            {showPasswordFields ? "Скрыть смену пароля" : "Сменить пароль"}
          </button>
        </div>
        {showPasswordFields ? (
          <>
            <label className="block">
              <span className="mb-1 block font-inter text-sm text-umami-gray">Новый пароль</span>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => onChange({ ...formData, newPassword: e.target.value })}
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
                className="w-full rounded-full border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
              />
            </label>
          </>
        ) : null}
        <label className="block">
          <span className="mb-1 block font-inter text-sm text-umami-gray">О себе</span>
          <textarea
            value={formData.bio}
            onChange={(e) => onChange({ ...formData, bio: e.target.value })}
            rows={3}
            className="w-full rounded-2xl border border-umami-light-gray px-4 py-2 font-nunito text-sm text-umami-dark-gray"
          />
        </label>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          type="button"
          disabled={isLoading}
          onClick={onSave}
          className="flex-1 rounded-full bg-umami-green px-6 py-2 font-nunito font-medium text-white disabled:opacity-60"
        >
          {isLoading ? "Сохраняем..." : isVerificationStep ? "Подтвердить и сохранить" : "Сохранить"}
        </button>
      </div>

      {isVerificationStep ? (
        <div className="mt-4 flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block font-inter text-sm text-umami-gray">Код подтверждения</span>
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
        </div>
      ) : null}
    </div>
  );
}
