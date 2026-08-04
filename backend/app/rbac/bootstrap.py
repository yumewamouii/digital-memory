"""Bootstrap helpers (super_admin from env)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from ..config import get_settings
from ..domain.enums import RoleCode
from ..models import User
from .service import get_user_role_codes, set_user_roles


def ensure_super_admin_from_env(db: Session, user: User) -> bool:
    """If user email matches SUPER_ADMIN_EMAIL, assign super_admin. Returns True if applied."""
    configured = (get_settings().super_admin_email or "").strip().lower()
    if not configured or not user.email:
        return False
    if user.email.strip().lower() != configured:
        return False
    current = get_user_role_codes(db, user)
    if RoleCode.SUPER_ADMIN in current and len(current) == 1:
        return False
    set_user_roles(db, user, [RoleCode.SUPER_ADMIN])
    db.commit()
    return True
