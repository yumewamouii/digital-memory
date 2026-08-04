"""Memorial cards HTTP API."""

from __future__ import annotations

import io

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from ..auth import get_current_active_user, get_current_user_optional
from ..config import get_settings
from ..database import get_db
from ..domain.enums import PermissionCode
from ..models import OwnershipClaim, User
from ..rbac import service as rbac_service
from ..rbac.deps import require_any_permission, require_permission
from ..schemas import (
    MemorialAssignOwnerRequest,
    MemorialCardCreate,
    MemorialCardOut,
    MemorialCardUpdate,
    MemorialTransferRequest,
    OwnershipClaimCreate,
    OwnershipClaimOut,
    OwnershipClaimReview,
)
from . import policies, service

router = APIRouter(prefix="/api/memorial-cards", tags=["memorials"])
settings = get_settings()


@router.post("", response_model=MemorialCardOut, status_code=status.HTTP_201_CREATED)
def create_memorial_card(
    payload: MemorialCardCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(
            PermissionCode.MEMORIAL_CREATE,
            PermissionCode.MEMORIAL_CREATE_ORG,
        )
    ),
):
    card = service.create_card(db, current_user, payload, request=request)
    return service.enrich_card(db, current_user, card)


@router.get("", response_model=list[MemorialCardOut])
def list_memorial_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    include_deleted: bool = Query(default=False),
):
    if include_deleted and not (
        rbac_service.user_has_permission(
            db, current_user, PermissionCode.MEMORIAL_RESTORE
        )
        or rbac_service.user_has_permission(
            db, current_user, PermissionCode.MEMORIAL_READ_ANY
        )
    ):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    cards = service.list_accessible_cards(
        db, current_user, include_deleted=include_deleted
    )
    return [service.enrich_card(db, current_user, c) for c in cards]


@router.get("/search", response_model=list[MemorialCardOut])
def search_memorials(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    cards = service.search_public_cards(db, query=q)
    return [service.enrich_card(db, current_user, c) for c in cards]


@router.get("/{card_id}", response_model=MemorialCardOut)
def get_memorial_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    card = service.get_card_or_404(db, card_id, include_deleted=True)
    if not policies.can_view_memorial(db, current_user, card):
        raise HTTPException(status_code=404, detail="Карточка не найдена")
    return service.enrich_card(db, current_user, card)


@router.patch("/{card_id}", response_model=MemorialCardOut)
def update_memorial_card(
    card_id: int,
    payload: MemorialCardUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(
            PermissionCode.MEMORIAL_UPDATE_OWN,
            PermissionCode.MEMORIAL_UPDATE_ORG,
            PermissionCode.MEMORIAL_UPDATE_ANY,
        )
    ),
):
    card = service.get_card_or_404(db, card_id)
    card = service.update_card(db, current_user, card, payload, request=request)
    return service.enrich_card(db, current_user, card)


@router.delete("/{card_id}", response_model=MemorialCardOut)
def delete_memorial_card(
    card_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission(
            PermissionCode.MEMORIAL_DELETE_OWN,
            PermissionCode.MEMORIAL_DELETE_ORG,
            PermissionCode.MEMORIAL_DELETE_ANY,
        )
    ),
):
    card = service.get_card_or_404(db, card_id)
    card = service.soft_delete_card(db, current_user, card, request=request)
    return service.enrich_card(db, current_user, card)


@router.post("/{card_id}/restore", response_model=MemorialCardOut)
def restore_memorial_card(
    card_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionCode.MEMORIAL_RESTORE)),
):
    card = service.get_card_or_404(db, card_id, include_deleted=True)
    card = service.restore_card(db, current_user, card, request=request)
    return service.enrich_card(db, current_user, card)


@router.post("/{card_id}/transfer", response_model=MemorialCardOut)
def transfer_memorial(
    card_id: int,
    payload: MemorialTransferRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(PermissionCode.MEMORIAL_TRANSFER_OWNERSHIP)
    ),
):
    card = service.get_card_or_404(db, card_id)
    card = service.transfer_ownership(
        db, current_user, card, payload.new_owner_id, request=request
    )
    return service.enrich_card(db, current_user, card)


@router.post("/{card_id}/assign-owner", response_model=MemorialCardOut)
def assign_memorial_owner(
    card_id: int,
    payload: MemorialAssignOwnerRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(PermissionCode.MEMORIAL_ASSIGN_OWNER)
    ),
):
    card = service.get_card_or_404(db, card_id)
    card = service.assign_owner(db, current_user, card, payload.owner_id, request=request)
    return service.enrich_card(db, current_user, card)


@router.post(
    "/{card_id}/claims",
    response_model=OwnershipClaimOut,
    status_code=status.HTTP_201_CREATED,
)
def request_ownership_claim(
    card_id: int,
    payload: OwnershipClaimCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(PermissionCode.MEMORIAL_CLAIM_REQUEST)
    ),
):
    card = service.get_card_or_404(db, card_id)
    if not policies.can_view_memorial(db, current_user, card):
        raise HTTPException(status_code=404, detail="Карточка не найдена")
    return service.create_ownership_claim(
        db, current_user, card, payload.message, request=request
    )


@router.get("/{card_id}/claims", response_model=list[OwnershipClaimOut])
def list_ownership_claims(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    card = service.get_card_or_404(db, card_id, include_deleted=True)
    if not (
        policies.can_review_claim(db, current_user, card)
        or card.owner_id == current_user.id
    ):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    return (
        db.query(OwnershipClaim)
        .filter(OwnershipClaim.memorial_id == card_id)
        .order_by(OwnershipClaim.created_at.desc())
        .all()
    )


@router.post("/{card_id}/claims/{claim_id}/review", response_model=OwnershipClaimOut)
def review_claim(
    card_id: int,
    claim_id: int,
    payload: OwnershipClaimReview,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    claim = (
        db.query(OwnershipClaim)
        .filter(OwnershipClaim.id == claim_id, OwnershipClaim.memorial_id == card_id)
        .first()
    )
    if not claim:
        raise HTTPException(status_code=404, detail="Запрос не найден")
    return service.review_ownership_claim(
        db, current_user, claim, payload.approve, request=request
    )


@router.get("/{card_id}/qr")
def generate_qr_for_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    card = service.get_card_or_404(db, card_id)
    if not policies.can_view_memorial(db, current_user, card):
        raise HTTPException(status_code=404, detail="Card not found")

    public_url = f"{settings.public_frontend_url.rstrip('/')}/memory/{card.id}"
    image = qrcode.make(public_url)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")
