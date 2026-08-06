from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from ..models import FamilyTree, TreeFamily, TreePerson
from .partial_dates import normalize_partial_date


def _date_str(value) -> str | None:
    return normalize_partial_date(value)


def person_to_dict(person: TreePerson) -> dict:
    layout = person.layout
    memorial_id = getattr(person, "memorial_card_id", None)
    return {
        "id": person.id,
        "first_name": person.first_name or "",
        "last_name": person.last_name or "",
        "middle_name": person.middle_name or "",
        "gender": person.gender or "",
        "birth_date": _date_str(person.birth_date),
        "death_date": _date_str(person.death_date),
        "birth_place": person.birth_place,
        "birth_lat": person.birth_lat,
        "birth_lng": person.birth_lng,
        "death_place": person.death_place,
        "death_lat": person.death_lat,
        "death_lng": person.death_lng,
        "burial_place": person.burial_place,
        "burial_lat": person.burial_lat,
        "burial_lng": person.burial_lng,
        "photo_path": person.photo_path,
        "photo_url": f"/media/{person.photo_path}" if person.photo_path else None,
        "note": person.note,
        "life_status": getattr(person, "life_status", None)
        or ("deceased" if person.is_deceased or person.death_date else "unknown"),
        "is_deceased": bool(
            (getattr(person, "life_status", None) == "deceased")
            or person.is_deceased
            or person.death_date
        ),
        "memorial_card_id": memorial_id,
        "has_memorial": bool(memorial_id),
        "alt_names": [
            {
                "id": n.id,
                "name_type": n.name_type,
                "first_name": n.first_name or "",
                "last_name": n.last_name or "",
                "middle_name": n.middle_name or "",
            }
            for n in (person.alt_names or [])
        ],
        "x": layout.x if layout else 0,
        "y": layout.y if layout else 0,
    }


def family_to_dict(family: TreeFamily) -> dict:
    return {
        "id": family.id,
        "partner_a_id": family.partner_a_id,
        "partner_b_id": family.partner_b_id,
        "children_ids": [c.person_id for c in sorted(family.children, key=lambda r: r.sort_order)],
    }


def load_tree(db: Session, tree_id: int) -> FamilyTree | None:
    return (
        db.query(FamilyTree)
        .options(
            joinedload(FamilyTree.persons).joinedload(TreePerson.alt_names),
            joinedload(FamilyTree.persons).joinedload(TreePerson.layout),
            joinedload(FamilyTree.families).joinedload(TreeFamily.children),
        )
        .filter(FamilyTree.id == tree_id)
        .first()
    )


def tree_detail_dict(
    tree: FamilyTree,
    *,
    can_edit: bool,
    can_view: bool = True,
    access_level: str | None = None,
) -> dict:
    persons = sorted(tree.persons or [], key=lambda p: p.id)
    families = sorted(tree.families or [], key=lambda f: f.id)
    return {
        "id": tree.id,
        "owner_id": tree.owner_id,
        "title": tree.title,
        "description": tree.description,
        "share_slug": tree.share_slug,
        "visibility": tree.visibility or "private",
        "guest_token": tree.guest_token if can_edit and not tree.owner_id else None,
        "is_demo_template": bool(tree.is_demo_template),
        "created_at": tree.created_at,
        "updated_at": tree.updated_at,
        "person_count": len(persons),
        "can_edit": can_edit,
        "can_view": can_view,
        "access_level": access_level,  # owner | editor | viewer
        "persons": [person_to_dict(p) for p in persons],
        "families": [family_to_dict(f) for f in families],
    }


def tree_summary_dict(tree: FamilyTree) -> dict:
    return {
        "id": tree.id,
        "owner_id": tree.owner_id,
        "title": tree.title,
        "description": tree.description,
        "share_slug": tree.share_slug,
        "visibility": tree.visibility or "private",
        "person_count": len(tree.persons or []),
        "created_at": tree.created_at,
        "updated_at": tree.updated_at,
    }
