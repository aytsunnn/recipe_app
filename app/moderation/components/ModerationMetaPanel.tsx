"use client";

import { useEffect, useMemo, useState } from "react";
import { useUiFeedback } from "../../components/UiFeedbackProvider";
import {
  MetaEntityType,
  MetaItem,
  moderationService,
} from "../../services/moderationService";
import { uploadService } from "../../services/uploadService";

type MetaConfig = {
  type: MetaEntityType;
  label: string;
  fields: Array<{ key: string; label: string; required?: boolean }>;
};

const META_CONFIGS: MetaConfig[] = [
  {
    type: "categories",
    label: "Категории",
    fields: [
      { key: "name", label: "Название", required: true },
      { key: "description", label: "Описание" },
      { key: "image_url", label: "Ссылка на изображение" },
    ],
  },
  {
    type: "kitchens",
    label: "Кухни",
    fields: [
      { key: "name", label: "Название", required: true },
      { key: "image_url", label: "Ссылка на изображение" },
    ],
  },
  {
    type: "cooking-types",
    label: "Способы приготовления",
    fields: [
      { key: "name", label: "Название", required: true },
      { key: "image_url", label: "Ссылка на изображение" },
    ],
  },
  {
    type: "celebrations",
    label: "Праздники",
    fields: [
      { key: "name", label: "Название", required: true },
      { key: "image_url", label: "Ссылка на изображение" },
    ],
  },
  {
    type: "units",
    label: "Единицы измерения",
    fields: [
      { key: "name", label: "Название", required: true },
      { key: "short_name", label: "Краткое название", required: true },
    ],
  },
  {
    type: "ingredients",
    label: "Ингредиенты",
    fields: [
      { key: "name", label: "Название", required: true },
      { key: "unit_of_measurement", label: "Единица измерения" },
      { key: "description", label: "Описание" },
    ],
  },
];

const emptyDraft = (config: MetaConfig) =>
  Object.fromEntries(config.fields.map((field) => [field.key, ""])) as Record<
    string,
    string
  >;

export default function ModerationMetaPanel() {
  const { toast, confirm } = useUiFeedback();
  const [activeType, setActiveType] = useState<MetaEntityType>("categories");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<MetaItem[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const config = useMemo(
    () => META_CONFIGS.find((item) => item.type === activeType) || META_CONFIGS[0],
    [activeType]
  );
  const [draft, setDraft] = useState<Record<string, string>>(emptyDraft(config));

  const resetDraft = () => {
    setEditingId(null);
    setDraft(emptyDraft(config));
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await moderationService.getMetaItems(activeType);
      setItems(result);
    } catch (error) {
      console.error("Ошибка загрузки Meta:", error);
      toast("Не удалось загрузить meta-данные", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      resetDraft();
      void loadItems();
    });
  }, [activeType]);

  const validate = (): boolean => {
    const missing = config.fields.find(
      (field) => field.required && !String(draft[field.key] || "").trim()
    );
    if (missing) {
      toast(`Заполните поле: ${missing.label}`, "error");
      return false;
    }
    return true;
  };

  const getPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {};
    config.fields.forEach((field) => {
      const value = String(draft[field.key] || "").trim();
      if (value.length > 0) payload[field.key] = value;
    });
    return payload;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = getPayload();
      if (editingId === null) {
        await moderationService.createMetaItem(activeType, payload);
        toast("Создано", "success");
      } else {
        await moderationService.updateMetaItem(activeType, editingId, payload);
        toast("Обновлено", "success");
      }
      resetDraft();
      await loadItems();
    } catch (error) {
      console.error("Ошибка сохранения Meta:", error);
      toast("Не удалось сохранить", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: MetaItem) => {
    const nextDraft = emptyDraft(config);
    config.fields.forEach((field) => {
      const value = item[field.key];
      nextDraft[field.key] = value === null || value === undefined ? "" : String(value);
    });
    setEditingId(item.id);
    setDraft(nextDraft);
  };

  const handleDelete = async (id: string | number) => {
    const approved = await confirm("Удалить запись?");
    if (!approved) return;
    try {
      await moderationService.deleteMetaItem(activeType, id);
      toast("Удалено", "success");
      await loadItems();
      if (editingId === id) resetDraft();
    } catch (error) {
      console.error("Ошибка удаления Meta:", error);
      toast("Не удалось удалить", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
        {META_CONFIGS.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => setActiveType(item.type)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:px-4 ${
              activeType === item.type
                ? "bg-umami-orange text-white"
                : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-umami-light-gray/50 bg-[#fcfbf8] p-3 sm:p-4">
        <h3 className="mb-3 font-nunito text-sm font-bold text-umami-dark-gray sm:text-base">
          {editingId === null ? `Создать: ${config.label}` : `Редактировать: ${config.label}`}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {config.fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-xs text-umami-gray">
                {field.label}
                {field.required ? " *" : ""}
              </span>
              {field.key === "image_url" ? (
                <div className="mt-1 flex flex-col gap-2">
                  {draft[field.key] ? (
                    <div className="relative group w-full max-w-[200px] h-28 rounded-xl overflow-hidden border border-umami-light-gray/50 shadow-sm transition-all hover:shadow-md">
                      <img
                        src={draft[field.key]}
                        alt="Preview"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, [field.key]: "" }))}
                        className="absolute right-2 top-2 rounded-full bg-red-500/80 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-red-600 focus:outline-none"
                        title="Удалить"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full max-w-[200px] h-28 border-2 border-dashed border-umami-orange/30 rounded-xl bg-umami-orange/5 hover:bg-umami-orange/10 hover:border-umami-orange/60 transition-all duration-300 cursor-pointer group">
                      {uploading ? (
                        <div className="flex flex-col items-center gap-1">
                          <svg className="animate-spin h-5 w-5 text-umami-orange" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="text-[10px] text-umami-gray">Загрузка...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 p-3 text-center">
                          <svg className="h-6 w-6 text-umami-orange/60 group-hover:text-umami-orange group-hover:scale-110 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-umami-orange/80 group-hover:text-umami-orange transition-colors">Загрузить фото</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploading(true);
                            const uploadedUrl = await uploadService.uploadImage(file, "recipes");
                            setDraft((prev) => ({ ...prev, [field.key]: uploadedUrl }));
                            toast("Изображение загружено", "success");
                          } catch (err: unknown) {
                            console.error(err);
                            toast("Ошибка загрузки: " + (err instanceof Error ? err.message : ""), "error");
                          } finally {
                            setUploading(false);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <input
                  value={draft[field.key] || ""}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-umami-light-gray/50 px-3 text-sm focus:outline-none"
                />
              )}
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || uploading}
            className="rounded-full bg-umami-orange px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60 sm:px-4 sm:py-2"
          >
            {editingId === null ? "Создать" : "Сохранить"}
          </button>
          {editingId !== null ? (
            <button
              type="button"
              onClick={resetDraft}
              className="rounded-full bg-[#f3efe2] px-3 py-1.5 text-xs font-bold text-umami-dark-gray sm:px-4 sm:py-2"
            >
              Отмена
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-umami-light-gray/50 bg-white p-3 sm:p-4">
        {loading ? (
          <p className="text-sm text-umami-gray">Загрузка...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-umami-gray">Список пуст</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={String(item.id)} className="rounded-lg border border-umami-light-gray/40 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-umami-gray">ID: {String(item.id)}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-full bg-[#f3efe2] px-3 py-1 text-xs font-bold text-umami-dark-gray"
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {config.fields.map((field) => (
                    <div key={`${item.id}-${field.key}`} className="text-sm text-umami-dark-gray break-words flex flex-col gap-1">
                      <span className="font-bold text-xs text-umami-gray">{field.label}</span>
                      {field.key === "image_url" ? (
                        item[field.key] ? (
                          <div className="w-20 h-12 rounded-lg overflow-hidden border border-umami-light-gray/30 shadow-sm">
                            <img
                              src={String(item[field.key])}
                              alt={String(item.name || "Preview")}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-umami-gray/60">—</span>
                        )
                      ) : (
                        <span className="text-sm">{String(item[field.key] ?? "—")}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
