from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status
from sqlalchemy.orm import Session

from ..domain.enums import PermissionCode, TreeAccessLevel
from ..models import FamilyTree, TreeCollaborator, User
from ..rbac import service as rbac_service

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


def resolve_tree_access_level(
    db: Session,
    tree: FamilyTree,
    user: User | None = None,
    guest_token: str | None = None,
) -> TreeAccessLevel | None:
    """Return Owner / Editor / Viewer or None if no access."""
    if user and rbac_service.user_has_permission(db, user, PermissionCode.TREE_UPDATE_ANY):
        return TreeAccessLevel.OWNER

    if user and tree.owner_id and tree.owner_id == user.id:
        return TreeAccessLevel.OWNER

    if guest_token and tree.guest_token and tree.guest_token == guest_token and not tree.owner_id:
        return TreeAccessLevel.EDITOR

    collab = get_collaboration(db, tree, user)
    if collab:
        if collab.role == "editor":
            return TreeAccessLevel.EDITOR
        return TreeAccessLevel.VIEWER

    if user and rbac_service.user_has_permission(db, user, PermissionCode.TREE_READ_ANY):
        return TreeAccessLevel.VIEWER

    if tree.is_demo_template:
        return TreeAccessLevel.VIEWER
    if tree.visibility in ("link", "public"):
        return TreeAccessLevel.VIEWER
    return None


def can_view_tree(
    tree: FamilyTree,
    user: User | None = None,
    guest_token: str | None = None,
    db: Session | None = None,
) -> bool:
    if db is not None:
        return resolve_tree_access_level(db, tree, user, guest_token) is not None
    if tree.is_demo_template:
        return True
    if user and tree.owner_id and tree.owner_id == user.id:
        return True
    if guest_token and tree.guest_token and tree.guest_token == guest_token:
        return True
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
    level = resolve_tree_access_level(db, tree, user, guest_token)
    return level in (TreeAccessLevel.OWNER, TreeAccessLevel.EDITOR)


def can_manage_tree_access(
    db: Session,
    tree: FamilyTree,
    user: User | None = None,
) -> bool:
    if not user:
        return False
    if rbac_service.user_has_permission(db, user, PermissionCode.TREE_UPDATE_ANY):
        return True
    if tree.owner_id == user.id and rbac_service.user_has_permission(
        db, user, PermissionCode.TREE_MANAGE_ACCESS
    ):
        return True
    return False


def require_tree_view(
    db: Session,
    tree: FamilyTree,
    user: User | None = None,
    guest_token: str | None = None,
) -> None:
    if resolve_tree_access_level(db, tree, user, guest_token) is not None:
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
