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

const PERSON_DATA_KEYS = [
  "firstName",
  "lastName",
  "middleName",
  "birthYear",
  "deathYear",
  "note",
  "gender",
];

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

export function toDateInputValue(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
  return "";
}

export function formatPersonDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}.${month}.${year}`;
  }
  return raw;
}

export function emptyTreeDocument() {
  return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
}

export function parseTreeJson(raw) {
  if (!raw) return emptyTreeDocument();
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      viewport: parsed.viewport || { x: 0, y: 0, zoom: 1 },
    };
  } catch {
    return emptyTreeDocument();
  }
}

export function pickPersonData(data = {}) {
  const next = {};
  for (const key of PERSON_DATA_KEYS) {
    next[key] = data[key] ?? "";
  }
  return next;
}

export function serializeTree(nodes, edges, viewport) {
  return JSON.stringify({
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type || "person",
      position: node.position,
      data: pickPersonData(node.data),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined,
      type: edge.type || "relation",
      data: { relation: edge.data?.relation || "parent" },
    })),
    viewport: viewport || { x: 0, y: 0, zoom: 1 },
  });
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
  const birth = toDateInputValue(birthValue);
  if (!birth) return null;
  const birthDate = new Date(`${birth}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const endRaw = toDateInputValue(deathValue);
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

export function countTreePeople(raw) {
  return parseTreeJson(raw).nodes.length;
}

/**
 * Generation layout: parents above children, spouses side by side.
 */
export function layoutTreeByGenerations(nodes, edges, options = {}) {
  const gapX = options.gapX ?? 56;
  const gapY = options.gapY ?? 140;
  const nodeWidth = options.nodeWidth ?? 200;
  const startX = options.startX ?? 40;
  const startY = options.startY ?? 40;

  if (!nodes.length) return nodes;

  const nodeIds = new Set(nodes.map((n) => n.id));
  const childrenOf = new Map();
  const parentsOf = new Map();
  const spouseOf = new Map();

  for (const id of nodeIds) {
    childrenOf.set(id, []);
    parentsOf.set(id, []);
    spouseOf.set(id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    const relation = edge.data?.relation || "parent";
    if (relation === "parent") {
      childrenOf.get(edge.source).push(edge.target);
      parentsOf.get(edge.target).push(edge.source);
    } else if (relation === "spouse") {
      spouseOf.get(edge.source).push(edge.target);
      spouseOf.get(edge.target).push(edge.source);
    }
  }

  const generation = new Map();
  const roots = [...nodeIds].filter((id) => parentsOf.get(id).length === 0);
  const queue = roots.length ? [...roots] : [...nodeIds];

  for (const id of queue) {
    if (!generation.has(id)) generation.set(id, 0);
  }

  let guard = 0;
  while (queue.length && guard < nodeIds.size * 4) {
    guard += 1;
    const id = queue.shift();
    const gen = generation.get(id) ?? 0;
    for (const child of childrenOf.get(id) || []) {
      const nextGen = gen + 1;
      if (!generation.has(child) || generation.get(child) < nextGen) {
        generation.set(child, nextGen);
        queue.push(child);
      }
    }
    for (const spouse of spouseOf.get(id) || []) {
      if (!generation.has(spouse)) {
        generation.set(spouse, gen);
        queue.push(spouse);
      }
    }
  }

  for (const id of nodeIds) {
    if (!generation.has(id)) generation.set(id, 0);
  }

  const byGen = new Map();
  for (const id of nodeIds) {
    const gen = generation.get(id);
    if (!byGen.has(gen)) byGen.set(gen, []);
    byGen.get(gen).push(id);
  }

  const placed = new Set();
  const positions = new Map();

  const sortedGens = [...byGen.keys()].sort((a, b) => a - b);
  for (const gen of sortedGens) {
    const ids = byGen.get(gen);
    const ordered = [];
    const localPlaced = new Set();

    const pushWithSpouses = (id) => {
      if (localPlaced.has(id)) return;
      ordered.push(id);
      localPlaced.add(id);
      for (const spouse of spouseOf.get(id) || []) {
        if (generation.get(spouse) === gen && !localPlaced.has(spouse)) {
          ordered.push(spouse);
          localPlaced.add(spouse);
        }
      }
    };

    const withParents = ids
      .slice()
      .sort((a, b) => {
        const pa = (parentsOf.get(a) || []).join(",");
        const pb = (parentsOf.get(b) || []).join(",");
        return pa.localeCompare(pb) || a.localeCompare(b);
      });

    for (const id of withParents) pushWithSpouses(id);

    ordered.forEach((id, index) => {
      positions.set(id, {
        x: startX + index * (nodeWidth + gapX),
        y: startY + gen * gapY,
      });
      placed.add(id);
    });
  }

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) || node.position || { x: startX, y: startY },
  }));
}
