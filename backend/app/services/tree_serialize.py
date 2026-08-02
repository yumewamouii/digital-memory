from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from ..models import FamilyTree, TreeFamily, TreePerson


def person_to_dict(person: TreePerson) -> dict:
    layout = person.layout
    return {
        "id": person.id,
        "first_name": person.first_name or "",
        "last_name": person.last_name or "",
        "middle_name": person.middle_name or "",
        "gender": person.gender or "",
        "birth_date": person.birth_date.isoformat() if person.birth_date else None,
        "death_date": person.death_date.isoformat() if person.death_date else None,
        "birth_place": person.birth_place,
        "death_place": person.death_place,
        "photo_path": person.photo_path,
        "photo_url": f"/media/{person.photo_path}" if person.photo_path else None,
        "note": person.note,
        "is_deceased": bool(person.is_deceased),
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


def tree_detail_dict(tree: FamilyTree, *, can_edit: bool, can_view: bool = True) -> dict:
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
