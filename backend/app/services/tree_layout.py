from __future__ import annotations

from collections import defaultdict

from sqlalchemy.orm import Session

from ..models import TreeFamily, TreeFamilyChild, TreePerson, TreePersonLayout

# Must stay wider/taller than frontend .person-node (184×214) with room for edge stems.
NODE_STEP_X = 250.0
NODE_STEP_Y = 340.0
START_X = 80.0
START_Y = 60.0


def ensure_layout(db: Session, person: TreePerson, x: float = 0, y: float = 0) -> TreePersonLayout:
    layout = (
        db.query(TreePersonLayout).filter(TreePersonLayout.person_id == person.id).first()
    )
    if layout:
        return layout
    if person.layout:
        return person.layout
    layout = TreePersonLayout(person_id=person.id, x=x, y=y)
    db.add(layout)
    db.flush()
    return layout


def auto_layout_tree(
    db: Session,
    tree_id: int,
    gap_x: float = NODE_STEP_X,
    gap_y: float = NODE_STEP_Y,
    start_x: float = START_X,
    start_y: float = START_Y,
) -> None:
    """
    Family-aware generation layout:
    - same generation = same Y
    - spouse pairs are atomic (nobody sits between spouses)
    - parents centered above their children block
    """
    db.flush()

    persons = db.query(TreePerson).filter(TreePerson.tree_id == tree_id).all()
    if not persons:
        return

    person_map = {p.id: p for p in persons}
    person_ids = set(person_map)

    families = db.query(TreeFamily).filter(TreeFamily.tree_id == tree_id).all()
    children_rows = (
        db.query(TreeFamilyChild)
        .join(TreeFamily, TreeFamily.id == TreeFamilyChild.family_id)
        .filter(TreeFamily.tree_id == tree_id)
        .all()
    )

    parents_of: dict[int, set[int]] = defaultdict(set)
    children_of: dict[int, set[int]] = defaultdict(set)
    spouses_of: dict[int, set[int]] = defaultdict(set)
    family_children: dict[int, list[int]] = defaultdict(list)

    for row in children_rows:
        if row.person_id in person_ids:
            family_children[row.family_id].append(row.person_id)

    for family in families:
        kids = sorted({kid for kid in family_children.get(family.id, []) if kid in person_ids})
        partners = [pid for pid in (family.partner_a_id, family.partner_b_id) if pid in person_ids]
        family_children[family.id] = kids
        if len(partners) == 2:
            spouses_of[partners[0]].add(partners[1])
            spouses_of[partners[1]].add(partners[0])
        for parent_id in partners:
            for child_id in kids:
                children_of[parent_id].add(child_id)
                parents_of[child_id].add(parent_id)

    generation: dict[int, int] = {pid: 0 for pid in person_ids}
    siblings_by_parents: dict[frozenset[int], list[int]] = defaultdict(list)
    for child_id, parent_ids in parents_of.items():
        if parent_ids:
            siblings_by_parents[frozenset(parent_ids)].append(child_id)

    changed = True
    guard = 0
    while changed and guard < len(person_ids) * len(person_ids) + 2:
        guard += 1
        changed = False
        for child_id, parent_ids in parents_of.items():
            if not parent_ids:
                continue
            next_gen = max(generation[pid] for pid in parent_ids) + 1
            if generation[child_id] < next_gen:
                generation[child_id] = next_gen
                changed = True
        # Spouses always share a row.
        for pid, spouse_ids in spouses_of.items():
            for spouse_id in spouse_ids:
                shared = max(generation[pid], generation[spouse_id])
                if generation[pid] != shared or generation[spouse_id] != shared:
                    generation[pid] = shared
                    generation[spouse_id] = shared
                    changed = True
        # Full siblings share a row too (e.g. Elizaveta follows Alexandra after marriage).
        for siblings in siblings_by_parents.values():
            if len(siblings) < 2:
                continue
            shared = max(generation[pid] for pid in siblings)
            for pid in siblings:
                if generation[pid] != shared:
                    generation[pid] = shared
                    changed = True

    by_gen: dict[int, list[int]] = defaultdict(list)
    for pid, gen in generation.items():
        by_gen[gen].append(pid)

    def spouse_unit(pid: int, gen_ids: set[int]) -> frozenset[int]:
        members = {pid}
        for spouse_id in spouses_of.get(pid, []):
            if spouse_id in gen_ids:
                members.add(spouse_id)
        return frozenset(members)

    def order_unit(unit: frozenset[int]) -> list[int]:
        """Keep spouses adjacent; prefer male then female, else stable id order."""
        ids = list(unit)
        if len(ids) == 1:
            return ids
        ids.sort(
            key=lambda pid: (
                0 if (person_map[pid].gender or "") == "male" else 1,
                0 if (person_map[pid].gender or "") == "female" else 1,
                pid,
            )
        )
        return ids

    def unit_children(unit: frozenset[int]) -> list[int]:
        return sorted(
            {
                cid
                for member in unit
                for cid in children_of.get(member, [])
                if cid in person_ids
            }
        )

    def place_unit(unit_ids: list[int], y: float, left_x: float) -> float:
        """Place an atomic unit starting at left_x; return next free x."""
        x = left_x
        for pid in unit_ids:
            positions[pid] = (x, y)
            x += gap_x
        return x

    positions: dict[int, tuple[float, float]] = {}

    # Bottom-up: deepest generation first.
    for gen in sorted(by_gen.keys(), reverse=True):
        y = start_y + gen * gap_y
        ids = by_gen[gen]
        gen_ids = set(ids)
        placed: set[int] = set()
        units_in_order: list[list[int]] = []

        # Sibling groups by shared parents; attach in-law spouses into the same unit.
        groups: dict[frozenset[int], list[int]] = defaultdict(list)
        for pid in sorted(ids):
            parent_key = frozenset(parents_of.get(pid, []))
            groups[parent_key].append(pid)

        def append_unit(pid: int) -> list[int] | None:
            if pid in placed:
                return None
            ordered = order_unit(spouse_unit(pid, gen_ids))
            units_in_order.append(ordered)
            placed.update(ordered)
            return ordered

        for parent_key in sorted(groups.keys(), key=lambda k: (len(k) == 0, sorted(k))):
            members = sorted(groups[parent_key])
            for pid in members:
                if pid in placed:
                    continue
                append_unit(pid)
                # Keep unmarried full siblings next to a just-placed married sibling.
                for sib in members:
                    if sib in placed:
                        continue
                    if spouse_unit(sib, gen_ids) == frozenset({sib}):
                        append_unit(sib)

        cursor = start_x
        for ordered in units_in_order:
            unit = frozenset(ordered)
            child_ids = [cid for cid in unit_children(unit) if cid in positions]
            if child_ids:
                xs = [positions[cid][0] for cid in child_ids]
                center = (min(xs) + max(xs)) / 2.0
                width = (len(ordered) - 1) * gap_x
                left = center - width / 2.0
                left = max(left, cursor)
                cursor = place_unit(ordered, y, left)
            else:
                cursor = place_unit(ordered, y, cursor)
            cursor += gap_x * 0.15

    # Second pass (top-down): re-center units above children, then pack by atomic units.
    for gen in sorted(by_gen.keys()):
        y = start_y + gen * gap_y
        ids = by_gen[gen]
        gen_ids = set(ids)

        seen: set[frozenset[int]] = set()
        units: list[list[int]] = []
        for pid in sorted(ids):
            unit = spouse_unit(pid, gen_ids)
            if unit in seen:
                continue
            seen.add(unit)
            units.append(order_unit(unit))

        # Center each unit over its children when possible.
        for ordered in units:
            unit = frozenset(ordered)
            child_ids = [cid for cid in unit_children(unit) if cid in positions]
            if not child_ids:
                for pid in ordered:
                    if pid in positions:
                        positions[pid] = (positions[pid][0], y)
                    else:
                        positions[pid] = (start_x, y)
                continue
            xs = [positions[cid][0] for cid in child_ids]
            center = (min(xs) + max(xs)) / 2.0
            width = (len(ordered) - 1) * gap_x
            left = center - width / 2.0
            place_unit(ordered, y, left)

        # Pack left-to-right as atomic units so nobody can slip between spouses.
        units_sorted = sorted(
            units,
            key=lambda ordered: min(positions[pid][0] for pid in ordered if pid in positions),
        )
        cursor = start_x
        for ordered in units_sorted:
            desired = min(positions[pid][0] for pid in ordered)
            left = max(desired, cursor)
            cursor = place_unit(ordered, y, left)

    if positions:
        min_x = min(x for x, _ in positions.values())
        if min_x < start_x:
            dx = start_x - min_x
            positions = {pid: (x + dx, y) for pid, (x, y) in positions.items()}

    for person_id, (x, y) in positions.items():
        layout = ensure_layout(db, person_map[person_id])
        layout.x = float(x)
        layout.y = float(y)

    for person in persons:
        if person.id not in positions:
            layout = ensure_layout(db, person)
            layout.x = start_x
            layout.y = start_y

    db.flush()
