"""FastAPI dependencies that check permissions (not role names)."""

from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import get_current_active_user, get_current_user
from ..database import get_db
from ..models import User
from . import service as rbac_service


def require_permission(permission_code: str) -> Callable:
    def _dependency(
        user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not rbac_service.user_has_permission(db, user, permission_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав",
            )
        return user

    return _dependency


def require_any_permission(*permission_codes: str) -> Callable:
    codes = list(permission_codes)

    def _dependency(
        user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db),
    ) -> User:
        if not rbac_service.user_has_any_permission(db, user, codes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав",
            )
        return user

    return _dependency


def get_current_user_with_permissions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Warm permission cache on the user object."""
    rbac_service.get_user_permissions(db, user)
    return user
