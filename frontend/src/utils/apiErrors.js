const FIELD_LABELS = {
  first_name: "Имя",
  last_name: "Фамилия",
  middle_name: "Отчество",
  gender: "Пол",
  birth_date: "Дата рождения",
  death_date: "Дата смерти",
  birth_place: "Место рождения",
  death_place: "Место смерти",
  burial_place: "Место захоронения",
  is_deceased: "Статус",
  life_status: "Статус жизни",
  alt_names: "Другие имена",
  email: "Email",
  password: "Пароль",
  url: "Ссылка",
  label: "Название ссылки",
};

/** Normalize FastAPI `detail` (string | object | validation array) for UI text. */
export function formatApiError(detail, fallback = "Не удалось выполнить действие") {
  if (detail == null || detail === "") return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (!item || typeof item !== "object") return String(item);
      const loc = Array.isArray(item.loc)
        ? item.loc.filter((p) => p !== "body" && p !== "query" && p !== "path")
        : [];
      const fieldKey = loc.length ? String(loc[loc.length - 1]) : "";
      const field = FIELD_LABELS[fieldKey] || fieldKey;
      const msg = item.msg || item.message || "Некорректное значение";
      return field ? `${field}: ${msg}` : msg;
    });
    return parts.filter(Boolean).join("; ") || fallback;
  }
  if (typeof detail === "object") {
    return detail.msg || detail.message || detail.detail || fallback;
  }
  return String(detail);
}
