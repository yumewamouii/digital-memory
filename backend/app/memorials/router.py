"""Memorial cards HTTP API."""

from __future__ import annotations

import io
from pathlib import Path
from uuid import uuid4

import qrcode
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
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
    MemorialAudioOut,
    MemorialCardCreate,
    MemorialCardOut,
    MemorialCardUpdate,
    MemorialDocumentOut,
    MemorialGalleryImageOut,
    MemorialTransferRequest,
    MemorialVideoLinkCreate,
    MemorialVideoOut,
    OwnershipClaimCreate,
    OwnershipClaimOut,
    OwnershipClaimReview,
)
from . import policies, service

router = APIRouter(prefix="/api/memorial-cards", tags=["memorials"])
settings = get_settings()
MEDIA_DIR = Path(__file__).resolve().parents[2] / "media"
PHOTO_MEDIA_ROOT = MEDIA_DIR / "memorial-photos"
GALLERY_MEDIA_ROOT = MEDIA_DIR / "memorial-gallery"
VIDEO_MEDIA_ROOT = MEDIA_DIR / "memorial-videos"
AUDIO_MEDIA_ROOT = MEDIA_DIR / "memorial-audio"
DOC_MEDIA_ROOT = MEDIA_DIR / "memorial-documents"

_EDIT_PERMS = require_any_permission(
    PermissionCode.MEMORIAL_UPDATE_OWN,
    PermissionCode.MEMORIAL_UPDATE_ORG,
    PermissionCode.MEMORIAL_UPDATE_ANY,
)


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


def _image_ext(content_type: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }[content_type]


@router.post("/{card_id}/photo", response_model=MemorialCardOut)
async def upload_memorial_photo(
    card_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(_EDIT_PERMS),
):
    card = service.get_card_or_404(db, card_id)
    if not policies.can_edit_memorial(db, current_user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    content_type = (file.content_type or "").lower()
    if content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(status_code=400, detail="Допустимы JPEG, PNG, WEBP, GIF")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 5 МБ")
    PHOTO_MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    rel = f"memorial-photos/{card_id}_{uuid4().hex}{_image_ext(content_type)}"
    dest = MEDIA_DIR / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    card = service.update_card(
        db,
        current_user,
        card,
        MemorialCardUpdate(photo_url=f"/media/{rel}"),
        request=request,
    )
    return service.enrich_card(db, current_user, card)


@router.post("/{card_id}/gallery", response_model=MemorialGalleryImageOut, status_code=status.HTTP_201_CREATED)
async def upload_gallery_image(
    card_id: int,
    request: Request,
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(_EDIT_PERMS),
):
    card = service.get_card_or_404(db, card_id)
    if not policies.can_edit_memorial(db, current_user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    content_type = (file.content_type or "").lower()
    if content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(status_code=400, detail="Допустимы JPEG, PNG, WEBP, GIF")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 5 МБ")
    GALLERY_MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    rel = f"memorial-gallery/{card_id}_{uuid4().hex}{_image_ext(content_type)}"
    dest = MEDIA_DIR / rel
    dest.write_bytes(data)
    image = service.add_gallery_image(
        db,
        current_user,
        card,
        url=f"/media/{rel}",
        caption=caption,
        request=request,
    )
    return MemorialGalleryImageOut.model_validate(image)


@router.delete("/{card_id}/gallery/{image_id}", response_model=MemorialCardOut)
def delete_gallery_image(
    card_id: int,
    image_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_EDIT_PERMS),
):
    card = service.get_card_or_404(db, card_id)
    service.delete_gallery_image(db, current_user, card, image_id, request=request)
    db.expire(card)
    card = service.get_card_or_404(db, card_id)
    return service.enrich_card(db, current_user, card)


@router.post("/{card_id}/videos", response_model=MemorialVideoOut, status_code=status.HTTP_201_CREATED)
def add_memorial_video_link(
    card_id: int,
    payload: MemorialVideoLinkCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_EDIT_PERMS),
):
    card = service.get_card_or_404(db, card_id)
    video = service.add_video_link(
        db,
        current_user,
        card,
        url=payload.url,
        title=payload.title,
        request=request,
    )
    return MemorialVideoOut.model_validate(video)


@router.post(
    "/{card_id}/videos/upload",
    response_model=MemorialVideoOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_memorial_video_file(
    card_id: int,
    request: Request,
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(_EDIT_PERMS),
):
    card = service.get_card_or_404(db, card_id)
    if not policies.can_edit_memorial(db, current_user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    mime = (file.content_type or "").lower()
    if mime not in ("video/mp4", "video/webm"):
        raise HTTPException(status_code=400, detail="Допустимы MP4 и WebM")
    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 50 МБ")
    VIDEO_MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    ext = ".mp4" if mime == "video/mp4" else ".webm"
    rel = f"memorial-videos/{card_id}_{uuid4().hex}{ext}"
    dest = MEDIA_DIR / rel
    dest.write_bytes(data)
    video = service.add_video_file(
        db,
        current_user,
        card,
        url=f"/media/{rel}",
        title=title,
        request=request,
    )
    return MemorialVideoOut.model_validate(video)


@router.delete("/{card_id}/videos/{video_id}", response_model=MemorialCardOut)
def delete_memorial_video(
    card_id: int,
    video_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_EDIT_PERMS),
):
    card = service.get_card_or_404(db, card_id)
    service.delete_video(db, current_user, card, video_id, request=request)
    db.expire(card)
    card = service.get_card_or_404(db, card_id)
    return service.enrich_card(db, current_user, card)


@router.post("/{card_id}/audio", response_model=MemorialAudioOut, status_code=status.HTTP_201_CREATED)
async def upload_memorial_audio(
    card_id: int,
    request: Request,
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(_EDIT_PERMS),
):
    card = service.get_card_or_404(db, card_id)
    if not policies.can_edit_memorial(db, current_user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    mime = (file.content_type or "").lower()
    allowed = {
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/ogg": ".ogg",
        "audio/webm": ".webm",
        "audio/mp4": ".m4a",
        "audio/x-m4a": ".m4a",
        "audio/aac": ".aac",
    }
    if mime not in allowed:
        # browsers sometimes omit type for recordings — sniff by filename
        name = (file.filename or "").lower()
        if name.endswith(".webm"):
            mime = "audio/webm"
        elif name.endswith(".mp3"):
            mime = "audio/mpeg"
        elif name.endswith(".wav"):
            mime = "audio/wav"
        elif name.endswith(".ogg"):
            mime = "audio/ogg"
        elif name.endswith(".m4a"):
            mime = "audio/mp4"
        else:
            raise HTTPException(
                status_code=400,
                detail="Допустимы MP3, WAV, OGG, WebM, M4A",
            )
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 20 МБ")
    AUDIO_MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    rel = f"memorial-audio/{card_id}_{uuid4().hex}{allowed[mime]}"
    dest = MEDIA_DIR / rel
    dest.write_bytes(data)
    clip = service.add_audio(
        db,
        current_user,
        card,
        url=f"/media/{rel}",
        title=title,
        request=request,
    )
    return MemorialAudioOut.model_validate(clip)


@router.delete("/{card_id}/audio/{audio_id}", response_model=MemorialCardOut)
def delete_memorial_audio(
    card_id: int,
    audio_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_EDIT_PERMS),
):
    card = service.get_card_or_404(db, card_id)
    service.delete_audio(db, current_user, card, audio_id, request=request)
    db.expire(card)
    card = service.get_card_or_404(db, card_id)
    return service.enrich_card(db, current_user, card)


@router.post(
    "/{card_id}/documents",
    response_model=MemorialDocumentOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_memorial_document(
    card_id: int,
    request: Request,
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    category: str = Form(default="other"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_EDIT_PERMS),
):
    card = service.get_card_or_404(db, card_id)
    if not policies.can_edit_memorial(db, current_user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    mime = (file.content_type or "").lower()
    name = (file.filename or "").lower()
    allowed_ext = {
        "application/pdf": ".pdf",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    ext = allowed_ext.get(mime)
    if not ext:
        if name.endswith(".pdf"):
            ext = ".pdf"
        elif name.endswith((".jpg", ".jpeg")):
            ext = ".jpg"
        elif name.endswith(".png"):
            ext = ".png"
        elif name.endswith(".webp"):
            ext = ".webp"
        else:
            raise HTTPException(status_code=400, detail="Допустимы PDF и изображения")
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 15 МБ")
    DOC_MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    rel = f"memorial-documents/{card_id}_{uuid4().hex}{ext}"
    dest = MEDIA_DIR / rel
    dest.write_bytes(data)
    doc = service.add_document(
        db,
        current_user,
        card,
        url=f"/media/{rel}",
        title=title,
        category=category,
        original_name=file.filename,
        request=request,
    )
    return MemorialDocumentOut.model_validate(doc)


@router.delete("/{card_id}/documents/{document_id}", response_model=MemorialCardOut)
def delete_memorial_document(
    card_id: int,
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_EDIT_PERMS),
):
    card = service.get_card_or_404(db, card_id)
    service.delete_document(db, current_user, card, document_id, request=request)
    db.expire(card)
    card = service.get_card_or_404(db, card_id)
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
    current_user: User | None = Depends(get_current_user_optional),
):
    card = service.get_card_or_404(db, card_id)
    if not policies.can_view_memorial(db, current_user, card):
        raise HTTPException(status_code=404, detail="Card not found")

    public_url = f"{settings.public_frontend_url.rstrip('/')}/memory/{card.id}"
    image = qrcode.make(public_url)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")
