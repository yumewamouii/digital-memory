"""Organization HTTP API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..domain.enums import PermissionCode
from ..models import User
from ..rbac.deps import require_any_permission, require_permission
from . import service
from .schemas import (
    MemberInvite,
    MemberOut,
    OrganizationCreate,
    OrganizationOut,
    OrganizationUpdate,
    OrgStatsOut,
    SubscriptionUpdate,
)

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


def _member_out(member) -> MemberOut:
    user = member.user
    return MemberOut(
        id=member.id,
        organization_id=member.organization_id,
        user_id=member.user_id,
        member_role=member.member_role,
        status=member.status,
        email=user.email if user else None,
        full_name=user.full_name if user else None,
        created_at=member.created_at,
    )


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionCode.ORG_CREATE)),
):
    org = service.create_organization(db, current_user, payload, request=request)
    return OrganizationOut(**service.enrich_org(db, org))


@router.get("", response_model=list[OrganizationOut])
def list_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(PermissionCode.ORG_READ, PermissionCode.ORG_MANAGE_ANY)
    ),
):
    orgs = service.list_my_organizations(db, current_user)
    return [OrganizationOut(**service.enrich_org(db, o)) for o in orgs]


@router.get("/{org_id}", response_model=OrganizationOut)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(PermissionCode.ORG_READ, PermissionCode.ORG_MANAGE_ANY)
    ),
):
    org = service.get_org_or_404(db, org_id)
    service.require_org_access(db, current_user, org)
    return OrganizationOut(**service.enrich_org(db, org))


@router.patch("/{org_id}", response_model=OrganizationOut)
def update_organization(
    org_id: int,
    payload: OrganizationUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(PermissionCode.ORG_UPDATE, PermissionCode.ORG_MANAGE_ANY)
    ),
):
    org = service.get_org_or_404(db, org_id)
    org = service.update_organization(db, current_user, org, payload, request=request)
    return OrganizationOut(**service.enrich_org(db, org))


@router.patch("/{org_id}/subscription", response_model=OrganizationOut)
def update_subscription(
    org_id: int,
    payload: SubscriptionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(
            PermissionCode.ORG_MANAGE_SUBSCRIPTION, PermissionCode.ORG_MANAGE_ANY
        )
    ),
):
    org = service.get_org_or_404(db, org_id)
    org = service.update_subscription(db, current_user, org, payload, request=request)
    return OrganizationOut(**service.enrich_org(db, org))


@router.delete("/{org_id}", response_model=OrganizationOut)
def delete_organization(
    org_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(PermissionCode.ORG_DELETE, PermissionCode.ORG_MANAGE_ANY)
    ),
):
    org = service.get_org_or_404(db, org_id)
    org = service.soft_delete_organization(db, current_user, org, request=request)
    return OrganizationOut(**service.enrich_org(db, org))


@router.post("/{org_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def invite_member(
    org_id: int,
    payload: MemberInvite,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionCode.ORG_INVITE_EMPLOYEE)),
):
    org = service.get_org_or_404(db, org_id)
    member = service.invite_employee(
        db, current_user, org, str(payload.email), request=request
    )
    return _member_out(member)


@router.get("/{org_id}/members", response_model=list[MemberOut])
def list_members(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(PermissionCode.ORG_READ, PermissionCode.ORG_MANAGE_ANY)
    ),
):
    org = service.get_org_or_404(db, org_id)
    members = service.list_members(db, current_user, org)
    return [_member_out(m) for m in members]


@router.get("/{org_id}/stats", response_model=OrgStatsOut)
def organization_stats(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(PermissionCode.ORG_STATS, PermissionCode.ORG_MANAGE_ANY)
    ),
):
    org = service.get_org_or_404(db, org_id)
    return OrgStatsOut(**service.org_stats(db, current_user, org))
