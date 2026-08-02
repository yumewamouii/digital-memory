from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from ..models import FamilyTree, TreeFamily, TreeFamilyChild, TreePerson, TreePersonName
from .tree_access import assert_guest_person_limit
from .tree_layout import auto_layout_tree, ensure_layout


def touch_tree(tree: FamilyTree) -> None:
    from datetime import datetime, timezone

    tree.updated_at = datetime.now(timezone.utc)


def create_person(
    db: Session,
    tree: FamilyTree,
    *,
    first_name: str = "",
    last_name: str = "",
    middle_name: str = "",
    gender: str = "",
    birth_date: date | None = None,
    death_date: date | None = None,
    birth_place: str | None = None,
    death_place: str | None = None,
    note: str | None = None,
    is_deceased: bool = False,
    x: float = 0,
    y: float = 0,
    auto_layout: bool = True,
) -> TreePerson:
    assert_guest_person_limit(db, tree)
    person = TreePerson(
        tree_id=tree.id,
        first_name=first_name or "",
        last_name=last_name or "",
        middle_name=middle_name or "",
        gender=gender or "",
        birth_date=birth_date,
        death_date=death_date,
        birth_place=birth_place,
        death_place=death_place,
        note=note,
        is_deceased=is_deceased or bool(death_date),
    )
    db.add(person)
    db.flush()
    ensure_layout(db, person, x, y)
    touch_tree(tree)
    if auto_layout:
        auto_layout_tree(db, tree.id)
    return person


def find_or_create_couple_family(
    db: Session,
    tree: FamilyTree,
    partner_a_id: int | None,
    partner_b_id: int | None,
) -> TreeFamily:
    q = db.query(TreeFamily).filter(TreeFamily.tree_id == tree.id)
    if partner_a_id and partner_b_id:
        family = (
            q.filter(
                (
                    (TreeFamily.partner_a_id == partner_a_id)
                    & (TreeFamily.partner_b_id == partner_b_id)
                )
                | (
                    (TreeFamily.partner_a_id == partner_b_id)
                    & (TreeFamily.partner_b_id == partner_a_id)
                )
            ).first()
        )
        if family:
            return family
    family = TreeFamily(
        tree_id=tree.id,
        partner_a_id=partner_a_id,
        partner_b_id=partner_b_id,
    )
    db.add(family)
    db.flush()
    return family


def add_child_to_family(db: Session, family: TreeFamily, person_id: int) -> None:
    exists = (
        db.query(TreeFamilyChild)
        .filter(TreeFamilyChild.family_id == family.id, TreeFamilyChild.person_id == person_id)
        .first()
    )
    if exists:
        return
    count = db.query(TreeFamilyChild).filter(TreeFamilyChild.family_id == family.id).count()
    db.add(TreeFamilyChild(family_id=family.id, person_id=person_id, sort_order=count))


def add_relative(
    db: Session,
    tree: FamilyTree,
    anchor: TreePerson,
    *,
    relation: str,
    gender: str = "",
    last_name: str | None = None,
) -> TreePerson:
    """
    relation: parent | child | spouse | sibling
    """
    assert_guest_person_limit(db, tree)
    surname = last_name if last_name is not None else (anchor.last_name or "")
    person = create_person(
        db,
        tree,
        last_name=surname,
        gender=gender,
        auto_layout=False,
    )

    if relation == "spouse":
        find_or_create_couple_family(db, tree, anchor.id, person.id)
    elif relation == "parent":
        # new person is parent of anchor
        family = find_or_create_couple_family(db, tree, person.id, None)
        # If anchor already has a parental family with one parent, fill the second slot
        parental = (
            db.query(TreeFamily)
            .join(TreeFamilyChild, TreeFamilyChild.family_id == TreeFamily.id)
            .filter(TreeFamily.tree_id == tree.id, TreeFamilyChild.person_id == anchor.id)
            .first()
        )
        if parental:
            if not parental.partner_a_id:
                parental.partner_a_id = person.id
            elif not parental.partner_b_id and parental.partner_a_id != person.id:
                parental.partner_b_id = person.id
            else:
                add_child_to_family(db, family, anchor.id)
        else:
            add_child_to_family(db, family, anchor.id)
    elif relation == "child":
        # Prefer existing couple family of anchor
        family = (
            db.query(TreeFamily)
            .filter(
                TreeFamily.tree_id == tree.id,
                (TreeFamily.partner_a_id == anchor.id) | (TreeFamily.partner_b_id == anchor.id),
            )
            .first()
        )
        if not family:
            family = find_or_create_couple_family(db, tree, anchor.id, None)
        add_child_to_family(db, family, person.id)
    elif relation == "sibling":
        parental = (
            db.query(TreeFamily)
            .join(TreeFamilyChild, TreeFamilyChild.family_id == TreeFamily.id)
            .filter(TreeFamily.tree_id == tree.id, TreeFamilyChild.person_id == anchor.id)
            .first()
        )
        if not parental:
            parental = TreeFamily(tree_id=tree.id)
            db.add(parental)
            db.flush()
            add_child_to_family(db, parental, anchor.id)
        add_child_to_family(db, parental, person.id)
    else:
        raise ValueError(f"Unknown relation: {relation}")

    touch_tree(tree)
    auto_layout_tree(db, tree.id)
    return person


def delete_person(db: Session, tree: FamilyTree, person: TreePerson) -> None:
    # Remove from families as partner/child
    families = db.query(TreeFamily).filter(TreeFamily.tree_id == tree.id).all()
    for family in families:
        if family.partner_a_id == person.id:
            family.partner_a_id = None
        if family.partner_b_id == person.id:
            family.partner_b_id = None
        for child in list(family.children):
            if child.person_id == person.id:
                db.delete(child)
        if not family.partner_a_id and not family.partner_b_id and not family.children:
            db.delete(family)
    db.delete(person)
    touch_tree(tree)
    auto_layout_tree(db, tree.id)


def replace_alt_names(db: Session, person: TreePerson, alt_names: list[dict] | None) -> None:
    for existing in list(person.alt_names or []):
        db.delete(existing)
    db.flush()
    for item in alt_names or []:
        db.add(
            TreePersonName(
                person_id=person.id,
                name_type=(item.get("name_type") or "aka")[:32],
                first_name=(item.get("first_name") or "")[:120],
                last_name=(item.get("last_name") or "")[:120],
                middle_name=(item.get("middle_name") or "")[:120],
            )
        )
