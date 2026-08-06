import { RELATION_COLORS } from "./treeRelations";
import { PERSON_CARD } from "./treeCardLayout";

const { width: PERSON_NODE_W, height: PERSON_NODE_H, sideHandleY, hubSize: HUB_SIZE } = PERSON_CARD;

export function personDisplayName(person = {}) {
  return (
    [person.last_name, person.first_name, person.middle_name].filter(Boolean).join(" ") ||
    "Без имени"
  );
}

export function personSearchText(person = {}) {
  const parts = [
    person.last_name,
    person.first_name,
    person.middle_name,
    ...(person.alt_names || []).flatMap((n) => [n.last_name, n.first_name, n.middle_name]),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function spouseAnchor(person) {
  return {
    x: (person.x || 0) + PERSON_NODE_W / 2,
    y: (person.y || 0) + sideHandleY,
  };
}

export function buildFlowGraph(treeDoc) {
  const persons = treeDoc?.persons || [];
  const families = treeDoc?.families || [];
  const personById = Object.fromEntries(persons.map((p) => [p.id, p]));

  const nodes = persons.map((person) => ({
    id: `p-${person.id}`,
    type: "person",
    position: { x: person.x || 0, y: person.y || 0 },
    data: {
      personId: person.id,
      firstName: person.first_name,
      lastName: person.last_name,
      middleName: person.middle_name,
      gender: person.gender,
      birthYear: person.birth_date,
      deathYear: person.death_date,
      isDeceased: Boolean(
        person.life_status === "deceased" || person.is_deceased || person.death_date,
      ),
      lifeStatus: person.life_status || (person.is_deceased || person.death_date ? "deceased" : "unknown"),
      note: person.note,
      photoUrl: person.photo_url,
      hasMemorial: Boolean(person.has_memorial || person.memorial_card_id),
      memorialCardId: person.memorial_card_id || null,
      readOnly: true,
      showHandles: false,
    },
  }));

  const edges = [];
  const stroke = RELATION_COLORS.parent;

  families.forEach((family) => {
    const a = family.partner_a_id;
    const b = family.partner_b_id;
    const kids = (family.children_ids || []).filter((id) => personById[id]);
    const parents = [a, b].filter((id) => personById[id]);

    // Couple with children:
    //   [A] ——●—— [B]   (orange bar at avatar level)
    //         |
    //         ●         (drop junction between generations)
    //        /|\
    //      kids…
    if (parents.length === 2 && kids.length > 0) {
      const pa = personById[a];
      const pb = personById[b];
      const leftIsA = (pa.x || 0) <= (pb.x || 0);
      const left = leftIsA ? pa : pb;
      const right = leftIsA ? pb : pa;
      const leftId = leftIsA ? a : b;
      const rightId = leftIsA ? b : a;

      const rowY = Math.min(left.y || 0, right.y || 0);
      const leftA = spouseAnchor({ ...left, y: rowY });
      const rightA = spouseAnchor({ ...right, y: rowY });
      const midX = (leftA.x + rightA.x) / 2;
      const midY = leftA.y;

      const hubId = `f-${family.id}`;
      nodes.push({
        id: hubId,
        type: "familyHub",
        position: { x: midX - HUB_SIZE / 2, y: midY - HUB_SIZE / 2 },
        data: { familyId: family.id },
        draggable: false,
        selectable: false,
        focusable: false,
      });

      edges.push({
        id: `e-fam-l-${family.id}`,
        source: `p-${leftId}`,
        target: hubId,
        sourceHandle: "right",
        targetHandle: "left",
        type: "relation",
        data: { relation: "spouse", readOnly: true, hideLabel: true, path: "straight" },
        style: { stroke: RELATION_COLORS.spouse },
      });
      edges.push({
        id: `e-fam-r-${family.id}`,
        source: `p-${rightId}`,
        target: hubId,
        sourceHandle: "left",
        targetHandle: "right",
        type: "relation",
        data: { relation: "spouse", readOnly: true, hideLabel: true, path: "straight" },
        style: { stroke: RELATION_COLORS.spouse },
      });

      const childTops = kids.map((id) => personById[id].y || 0);
      const minChildY = Math.min(...childTops);
      const parentBottom = rowY + PERSON_NODE_H;
      const gap = minChildY - parentBottom;
      // Junction sits in the clear band between parent bottoms and child tops.
      const dropY =
        gap >= 40 ? parentBottom + gap * 0.45 : Math.min(parentBottom + 24, minChildY - 16);

      const dropId = `f-drop-${family.id}`;
      nodes.push({
        id: dropId,
        type: "familyHub",
        position: { x: midX - HUB_SIZE / 2, y: dropY - HUB_SIZE / 2 },
        data: { familyId: family.id, role: "drop" },
        draggable: false,
        selectable: false,
        focusable: false,
      });

      edges.push({
        id: `e-stem-${family.id}`,
        source: hubId,
        target: dropId,
        sourceHandle: "bottom",
        targetHandle: "top",
        type: "relation",
        data: { relation: "parent", readOnly: true, hideLabel: true, path: "straight" },
        style: { stroke },
      });

      kids.forEach((childId) => {
        const child = personById[childId];
        const childMidX = (child.x || 0) + PERSON_NODE_W / 2;
        const aligned = Math.abs(childMidX - midX) < 16;
        edges.push({
          id: `e-child-${family.id}-${childId}`,
          source: dropId,
          target: `p-${childId}`,
          sourceHandle: "bottom",
          targetHandle: "top",
          type: "relation",
          data: {
            relation: "parent",
            readOnly: true,
            hideLabel: true,
            path: aligned ? "straight" : "step",
          },
          style: { stroke },
        });
      });
      return;
    }

    if (parents.length === 2) {
      edges.push({
        id: `e-spouse-${family.id}`,
        source: `p-${a}`,
        target: `p-${b}`,
        sourceHandle: "right",
        targetHandle: "left",
        type: "relation",
        data: { relation: "spouse", readOnly: true, path: "straight" },
        style: { stroke: RELATION_COLORS.spouse },
      });
    }

    parents.forEach((parentId) => {
      kids.forEach((childId) => {
        edges.push({
          id: `e-parent-${family.id}-${parentId}-${childId}`,
          source: `p-${parentId}`,
          target: `p-${childId}`,
          sourceHandle: "bottom",
          targetHandle: "top",
          type: "relation",
          data: { relation: "parent", readOnly: true, hideLabel: kids.length > 1 },
          style: { stroke },
        });
      });
    });
  });

  return { nodes, edges };
}
