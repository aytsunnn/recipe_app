"use client";

import { useEffect, useMemo, useState } from "react";
import { useUiFeedback } from "../../components/UiFeedbackProvider";
import {
  MetaEntityType,
  MetaItem,
  moderationService,
} from "../../services/moderationService";

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
    resetDraft();
    void loadItems();
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
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              activeType === item.type
                ? "bg-umami-orange text-white"
                : "bg-[#f3efe2] text-umami-dark-gray hover:bg-[#ece4cf]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-umami-light-gray/50 bg-[#fcfbf8] p-4">
        <h3 className="mb-3 font-nunito text-base font-bold text-umami-dark-gray">
          {editingId === null ? `Создать: ${config.label}` : `Редактировать: ${config.label}`}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {config.fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-xs text-umami-gray">
                {field.label}
                {field.required ? " *" : ""}
              </span>
              <input
                value={draft[field.key] || ""}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
                className="h-10 w-full rounded-xl border border-umami-light-gray/50 px-3 text-sm focus:outline-none"
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="rounded-full bg-umami-orange px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {editingId === null ? "Создать" : "Сохранить"}
          </button>
          {editingId !== null ? (
            <button
              type="button"
              onClick={resetDraft}
              className="rounded-full bg-[#f3efe2] px-4 py-2 text-xs font-bold text-umami-dark-gray"
            >
              Отмена
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-umami-light-gray/50 bg-white p-4">
        {loading ? (
          <p className="text-sm text-umami-gray">Загрузка...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-umami-gray">Список пуст</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={String(item.id)}
                className="rounded-lg border border-umami-light-gray/40 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
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
                    <p key={`${item.id}-${field.key}`} className="text-sm text-umami-dark-gray">
                      <span className="font-bold">{field.label}: </span>
                      {String(item[field.key] ?? "—")}
                    </p>
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

