"""Build enriched UserOut payloads."""

from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import User
from ..schemas import OrganizationBrief, UserOut
from . import service as rbac_service


def build_user_out(db: Session, user: User) -> UserOut:
    roles = rbac_service.get_user_role_codes(db, user)
    perms = sorted(rbac_service.get_user_permissions(db, user))
    membership = rbac_service.get_active_organization_membership(db, user)
    org_brief = None
    if membership:
        org = membership.organization
        if org is None:
            from ..models import Organization

            org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
        if org:
            org_brief = OrganizationBrief(
                id=org.id,
                name=org.name,
                logo=org.logo,
                subscription_plan=org.subscription_plan,
                subscription_status=org.subscription_status,
                member_role=membership.member_role,
            )
    return UserOut(
        id=user.id,
        email=user.email,
        phone=user.phone,
        full_name=user.full_name,
        email_verified=bool(user.email_verified),
        phone_verified=bool(user.phone_verified),
        has_password=user.has_password,
        is_active=bool(user.is_active),
        created_at=user.created_at,
        roles=roles,
        permissions=perms,
        organization=org_brief,
    )
