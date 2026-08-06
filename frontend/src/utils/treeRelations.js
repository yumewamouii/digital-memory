export const RELATION_TYPES = [
  { id: "parent", label: "Родитель", description: "От родителя к ребёнку" },
  { id: "child", label: "Ребёнок", description: "От ребёнка к родителю" },
  { id: "spouse", label: "Супруги", description: "Брачный союз" },
  { id: "sibling", label: "Братья и сёстры", description: "Родные или сводные" },
];

export const RELATION_LABELS = Object.fromEntries(
  RELATION_TYPES.map((item) => [item.id, item.label]),
);

export const RELATION_COLORS = {
  parent: "#2f8fbf",
  child: "#3a8fc4",
  spouse: "#c47a3a",
  sibling: "#5a7a5a",
};

export const GENDER_OPTIONS = [
  { id: "", label: "Не указан" },
  { id: "male", label: "Мужской" },
  { id: "female", label: "Женский" },
];

export const LIFE_STATUS_OPTIONS = [
  { id: "unknown", label: "Неизвестно", marker: "unknown" },
  { id: "alive", label: "Жив", marker: "alive" },
  { id: "deceased", label: "Умер", marker: "deceased" },
];

/** Resolve stored / legacy person fields to life_status. */
export function deriveLifeStatus(person) {
  if (!person) return "unknown";
  const status = person.life_status;
  if (status === "unknown" || status === "alive" || status === "deceased") {
    if (person.death_date && status !== "deceased") return "deceased";
    return status;
  }
  if (person.is_deceased || person.death_date) return "deceased";
  return "unknown";
}

/** Normalize child edges into parent edges (source = parent, target = child). */
export function normalizeRelationEdge(source, target, relation) {
  if (relation === "child") {
    return { source: target, target: source, relation: "parent" };
  }
  return { source, target, relation };
}

export function relationEdgeKey(source, target, relation) {
  const rel = relation || "parent";
  if (rel === "spouse" || rel === "sibling") {
    return `${rel}:${[source, target].sort().join("|")}`;
  }
  return `${rel}:${source}->${target}`;
}

export function hasDuplicateRelation(edges, source, target, relation) {
  const key = relationEdgeKey(source, target, relation);
  return edges.some(
    (edge) =>
      relationEdgeKey(edge.source, edge.target, edge.data?.relation || "parent") === key,
  );
}

export function countParents(edges, personId) {
  return edges.filter(
    (edge) => (edge.data?.relation || "parent") === "parent" && edge.target === personId,
  ).length;
}

/** Max two biological/legal parents per person. */
export function canAddParentRelation(edges, parentId, childId) {
  if (parentId === childId) return { ok: false, reason: "Нельзя связать человека с самим собой" };
  if (hasDuplicateRelation(edges, parentId, childId, "parent")) {
    return { ok: false, reason: "Такая связь уже есть" };
  }
  if (countParents(edges, childId) >= 2) {
    return { ok: false, reason: "У человека уже указаны двое родителей" };
  }
  return { ok: true, reason: "" };
}

export function isLateralRelation(relation) {
  return relation === "spouse" || relation === "sibling";
}

export function isVerticalRelation(relation) {
  return relation === "parent" || relation === "child";
}

/**
 * Parent: bottom → top. Spouse/sibling: side handles by node X position.
 */
export function handlesForRelation(sourceId, targetId, relation, nodes = []) {
  if (relation === "parent") {
    return { sourceHandle: "bottom", targetHandle: "top" };
  }
  const sourceNode = nodes.find((node) => node.id === sourceId);
  const targetNode = nodes.find((node) => node.id === targetId);
  const sourceX = sourceNode?.position?.x ?? 0;
  const targetX = targetNode?.position?.x ?? 0;
  // Lateral edges use source handles on both ends (ConnectionMode.Loose).
  if (sourceX <= targetX) {
    return { sourceHandle: "right", targetHandle: "left" };
  }
  return { sourceHandle: "left", targetHandle: "right" };
}

/** One word; letters and optional internal hyphens, no spaces. */
export const PERSON_NAME_PATTERN = /^[\p{L}]+(?:-[\p{L}]+)*$/u;

export function sanitizePersonNameInput(value) {
  return String(value || "").replace(/\s+/g, "");
}

export function isValidPersonName(value, { allowEmpty = true } = {}) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return allowEmpty;
  return PERSON_NAME_PATTERN.test(trimmed);
}

const PARTIAL_DATE_RE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

/** Detect precision of a stored partial date. */
export function partialDatePrecision(value) {
  const raw = String(value || "").trim();
  if (!raw) return "year";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "day";
  if (/^\d{4}-\d{2}$/.test(raw)) return "month";
  if (/^\d{4}$/.test(raw)) return "year";
  return "year";
}

/** Normalize to YYYY | YYYY-MM | YYYY-MM-DD or "". */
export function normalizePartialDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const match = PARTIAL_DATE_RE.exec(raw);
  if (!match) return "";
  const year = Number(match[1]);
  if (year < 1 || year > 9999) return "";
  if (!match[2]) return String(year).padStart(4, "0");
  const month = Number(match[2]);
  if (month < 1 || month > 12) return "";
  if (!match[3]) return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  const day = Number(match[3]);
  const probe = new Date(year, month - 1, day);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return "";
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** @deprecated Prefer normalizePartialDate; kept for full-day inputs. */
export function toDateInputValue(value) {
  const normalized = normalizePartialDate(value);
  if (!normalized) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  if (/^\d{4}-\d{2}$/.test(normalized)) return `${normalized}-01`;
  if (/^\d{4}$/.test(normalized)) return `${normalized}-01-01`;
  return "";
}

export function formatPersonDate(value) {
  if (!value) return "";
  const raw = normalizePartialDate(value) || String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}.${month}.${year}`;
  }
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-");
    return `${month}.${year}`;
  }
  if (/^\d{4}$/.test(raw)) return raw;
  return raw;
}

export function formatPersonYears(birthYear, deathYear) {
  const birth = formatPersonDate(birthYear);
  const death = formatPersonDate(deathYear);
  if (birth && death) return `${birth} — ${death}`;
  if (birth) return `род. ${birth}`;
  if (death) return `† ${death}`;
  return "";
}

export function personDisplayName(data = {}) {
  return [data.lastName, data.firstName, data.middleName].filter(Boolean).join(" ") || "Без имени";
}

export function personInitials(data = {}) {
  const last = (data.lastName || "").trim().charAt(0);
  const first = (data.firstName || "").trim().charAt(0);
  const value = `${last}${first}`.toUpperCase();
  return value || "?";
}

export function personAge(birthValue, deathValue) {
  const birthNorm = normalizePartialDate(birthValue);
  // Age needs at least a year; prefer full dates when available
  if (!birthNorm) return null;
  const birth = toDateInputValue(birthNorm);
  const birthDate = new Date(`${birth}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const deathNorm = normalizePartialDate(deathValue);
  const endRaw = deathNorm ? toDateInputValue(deathNorm) : "";
  const endDate = endRaw ? new Date(`${endRaw}T00:00:00`) : new Date();
  if (Number.isNaN(endDate.getTime()) || endDate < birthDate) return null;
  let age = endDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = endDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/** Russian plural for age: 1 год, 2 года, 5 лет. */
export function formatAgeLabel(age) {
  if (age == null || Number.isNaN(age)) return "";
  const n = Math.abs(Number(age)) % 100;
  const n1 = n % 10;
  let word = "лет";
  if (n > 10 && n < 20) word = "лет";
  else if (n1 === 1) word = "год";
  else if (n1 >= 2 && n1 <= 4) word = "года";
  return `${age} ${word}`;
}

export const RELATIVE_ADD_OPTIONS = [
  {
    id: "father",
    label: "Отец",
    relation: "parent",
    gender: "male",
    slot: "top",
    offset: { x: -120, y: -170 },
  },
  {
    id: "mother",
    label: "Мать",
    relation: "parent",
    gender: "female",
    slot: "top",
    offset: { x: 120, y: -170 },
  },
  {
    id: "brother",
    label: "Брат",
    relation: "sibling",
    gender: "male",
    slot: "left",
    offset: { x: -250, y: -40 },
  },
  {
    id: "sister",
    label: "Сестра",
    relation: "sibling",
    gender: "female",
    slot: "left",
    offset: { x: -250, y: 80 },
  },
  {
    id: "partner-male",
    label: "Партнёр",
    relation: "spouse",
    gender: "male",
    slot: "right",
    hint: "Пара: муж, бывший муж, жених и т.д.",
    offset: { x: 250, y: -40 },
  },
  {
    id: "partner-female",
    label: "Партнёрша",
    relation: "spouse",
    gender: "female",
    slot: "right",
    hint: "Пара: жена, бывшая жена, невеста и т.д.",
    offset: { x: 250, y: 80 },
  },
  {
    id: "son",
    label: "Сын",
    relation: "child",
    gender: "male",
    slot: "bottom",
    offset: { x: -120, y: 170 },
  },
  {
    id: "daughter",
    label: "Дочь",
    relation: "child",
    gender: "female",
    slot: "bottom",
    offset: { x: 120, y: 170 },
  },
];
