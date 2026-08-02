from __future__ import annotations

import json
import logging
from datetime import date, datetime

from sqlalchemy.orm import Session

from ..models import (
    FamilyTree,
    TreeFamily,
    TreeFamilyChild,
    TreePerson,
    TreePersonLayout,
)
from .tree_access import new_share_slug
from .tree_layout import auto_layout_tree, ensure_layout

logger = logging.getLogger(__name__)


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    raw = str(value).strip()
    for fmt in ("%Y-%m-%d", "%Y"):
        try:
            dt = datetime.strptime(raw if fmt != "%Y" else f"{raw}-01-01", "%Y-%m-%d")
            return dt.date()
        except ValueError:
            continue
    if len(raw) == 4 and raw.isdigit():
        return date(int(raw), 1, 1)
    return None


def tree_needs_migration(tree: FamilyTree) -> bool:
    if tree.persons:
        return False
    if not tree.tree_json or tree.tree_json in ("{}", "null"):
        return False
    try:
        data = json.loads(tree.tree_json)
    except json.JSONDecodeError:
        return False
    return bool(data.get("nodes"))


def migrate_tree_json(db: Session, tree: FamilyTree) -> bool:
    """Convert legacy React Flow tree_json into normalized tables."""
    if not tree_needs_migration(tree):
        if not tree.share_slug:
            tree.share_slug = new_share_slug()
        return False

    try:
        data = json.loads(tree.tree_json or "{}")
    except json.JSONDecodeError:
        logger.warning("Invalid tree_json for tree %s", tree.id)
        return False

    nodes = data.get("nodes") or []
    edges = data.get("edges") or []
    id_map: dict[str, TreePerson] = {}

    for node in nodes:
        node_id = str(node.get("id") or "")
        pdata = node.get("data") or {}
        person = TreePerson(
            tree_id=tree.id,
            first_name=(pdata.get("firstName") or "")[:120],
            last_name=(pdata.get("lastName") or "")[:120],
            middle_name=(pdata.get("middleName") or "")[:120],
            gender=(pdata.get("gender") or "")[:16],
            birth_date=_parse_date(pdata.get("birthYear")),
            death_date=_parse_date(pdata.get("deathYear")),
            note=pdata.get("note") or None,
            is_deceased=bool(pdata.get("deathYear")),
        )
        db.add(person)
        db.flush()
        pos = node.get("position") or {}
        ensure_layout(db, person, float(pos.get("x") or 0), float(pos.get("y") or 0))
        id_map[node_id] = person

    parent_links: list[tuple[TreePerson, TreePerson]] = []
    spouse_pairs: list[tuple[TreePerson, TreePerson]] = []
    seen_spouses: set[tuple[int, int]] = set()

    for edge in edges:
        relation = (edge.get("data") or {}).get("relation") or "parent"
        src = id_map.get(str(edge.get("source")))
        tgt = id_map.get(str(edge.get("target")))
        if not src or not tgt:
            continue
        if relation == "parent":
            parent_links.append((src, tgt))
        elif relation == "spouse":
            key = tuple(sorted((src.id, tgt.id)))
            if key in seen_spouses:
                continue
            seen_spouses.add(key)
            spouse_pairs.append((src, tgt))

    # Group children by parent pair when possible
    children_by_parent: dict[int, list[TreePerson]] = {}
    for parent, child in parent_links:
        children_by_parent.setdefault(parent.id, []).append(child)

    created_family_for_child: set[int] = set()

    for src, tgt in spouse_pairs:
        family = TreeFamily(tree_id=tree.id, partner_a_id=src.id, partner_b_id=tgt.id)
        db.add(family)
        db.flush()
        # Attach children who have both or either as parent
        for parent, child in parent_links:
            if parent.id in (src.id, tgt.id) and child.id not in created_family_for_child:
                # Prefer families where both parents are linked
                other_parents = [p.id for p, c in parent_links if c.id == child.id]
                if src.id in other_parents or tgt.id in other_parents:
                    db.add(TreeFamilyChild(family_id=family.id, person_id=child.id))
                    created_family_for_child.add(child.id)

    for parent, child in parent_links:
        if child.id in created_family_for_child:
            continue
        family = TreeFamily(tree_id=tree.id, partner_a_id=parent.id, partner_b_id=None)
        db.add(family)
        db.flush()
        db.add(TreeFamilyChild(family_id=family.id, person_id=child.id))
        created_family_for_child.add(child.id)

    # Sibling-only edges: put under shared synthetic family if they share no parents
    sibling_groups: list[set[int]] = []
    for edge in edges:
        relation = (edge.get("data") or {}).get("relation") or "parent"
        src = id_map.get(str(edge.get("source")))
        tgt = id_map.get(str(edge.get("target")))
        if not src or not tgt or relation != "sibling":
            continue
        merged = False
        for group in sibling_groups:
            if src.id in group or tgt.id in group:
                group.add(src.id)
                group.add(tgt.id)
                merged = True
                break
        if not merged:
            sibling_groups.append({src.id, tgt.id})

    for group in sibling_groups:
        # Skip if already share a family as children
        already = False
        for child_id in group:
            if child_id in created_family_for_child:
                already = True
                break
        if already:
            continue
        family = TreeFamily(tree_id=tree.id, partner_a_id=None, partner_b_id=None)
        db.add(family)
        db.flush()
        for idx, child_id in enumerate(sorted(group)):
            db.add(TreeFamilyChild(family_id=family.id, person_id=child_id, sort_order=idx))
            created_family_for_child.add(child_id)

    if not tree.share_slug:
        tree.share_slug = new_share_slug()
    if not tree.visibility:
        tree.visibility = "private"

    db.flush()
    auto_layout_tree(db, tree.id)
    logger.info("Migrated tree_json for tree %s (%s persons)", tree.id, len(id_map))
    return True


def migrate_all_legacy_trees(db: Session) -> int:
    count = 0
    trees = db.query(FamilyTree).all()
    for tree in trees:
        if not tree.share_slug:
            tree.share_slug = new_share_slug()
        if migrate_tree_json(db, tree):
            count += 1
    db.commit()
    return count
