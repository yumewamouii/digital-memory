from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status
from sqlalchemy.orm import Session

from ..models import FamilyTree, TreeCollaborator, User

GUEST_PERSON_LIMIT = 6


def new_share_slug() -> str:
    return secrets.token_urlsafe(18)


def new_guest_token() -> str:
    return secrets.token_urlsafe(24)


def new_invite_token() -> str:
    return secrets.token_urlsafe(24)


def get_collaboration(db: Session, tree: FamilyTree, user: User | None) -> TreeCollaborator | None:
    if not user:
        return None
    return (
        db.query(TreeCollaborator)
        .filter(
            TreeCollaborator.tree_id == tree.id,
            TreeCollaborator.user_id == user.id,
            TreeCollaborator.status == "accepted",
        )
        .first()
    )


def can_view_tree(
    tree: FamilyTree,
    user: User | None = None,
    guest_token: str | None = None,
) -> bool:
    if tree.is_demo_template:
        return True
    if user and tree.owner_id and tree.owner_id == user.id:
        return True
    if guest_token and tree.guest_token and tree.guest_token == guest_token:
        return True
    if user:
        # accepted collaborator checked by caller with db usually; allow if owner match above
        pass
    if tree.visibility in ("link", "public"):
        return True
    return False


def can_edit_tree(
    db: Session,
    tree: FamilyTree,
    user: User | None = None,
    guest_token: str | None = None,
) -> bool:
    if tree.is_demo_template:
        return False
    if user and tree.owner_id and tree.owner_id == user.id:
        return True
    if guest_token and tree.guest_token and tree.guest_token == guest_token and not tree.owner_id:
        return True
    collab = get_collaboration(db, tree, user)
    return bool(collab and collab.role == "editor")


def require_tree_view(
    db: Session,
    tree: FamilyTree,
    user: User | None = None,
    guest_token: str | None = None,
) -> None:
    if user and get_collaboration(db, tree, user):
        return
    if can_view_tree(tree, user, guest_token):
        return
    if user and tree.owner_id == user.id:
        return
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Древо не найдено")


def require_tree_edit(
    db: Session,
    tree: FamilyTree,
    user: User | None = None,
    guest_token: str | None = None,
) -> None:
    if can_edit_tree(db, tree, user, guest_token):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Нет прав на редактирование")


def assert_guest_person_limit(db: Session, tree: FamilyTree) -> None:
    if tree.owner_id:
        return
    count = len(tree.persons) if tree.persons is not None else 0
    # relationship may be lazy; count via query if needed
    from ..models import TreePerson

    count = db.query(TreePerson).filter(TreePerson.tree_id == tree.id).count()
    if count >= GUEST_PERSON_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Без регистрации можно создать до {GUEST_PERSON_LIMIT} карточек. Войдите, чтобы продолжить.",
        )


def parse_guest_header(x_guest_token: str | None = Header(default=None, alias="X-Guest-Token")) -> str | None:
    token = (x_guest_token or "").strip()
    return token or None
