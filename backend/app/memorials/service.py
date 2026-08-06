"""Memorial card use-cases."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..audit.service import log_action
from ..domain.enums import ClaimStatus, MemorialStatus, MemorialVisibility, PermissionCode
from ..models import (
    FamilyTree,
    MemorialAudio,
    MemorialCard,
    MemorialDocument,
    MemorialGalleryImage,
    MemorialVideo,
    OrganizationMember,
    OwnershipClaim,
    TreeFamily,
    TreeFamilyChild,
    TreePerson,
    User,
)
from ..rbac import service as rbac_service
from ..schemas import (
    MemorialAudioOut,
    MemorialCardCreate,
    MemorialCardOut,
    MemorialCardUpdate,
    MemorialDocumentOut,
    MemorialExternalLink,
    MemorialGalleryImageOut,
    MemorialRelativeOut,
    MemorialVideoOut,
)
from ..services.tree_access import can_edit_tree, resolve_tree_access_level
from . import policies
from .video_links import parse_video_url


def _card_snapshot(card: MemorialCard) -> dict:
    return {
        "id": card.id,
        "owner_id": card.owner_id,
        "created_by": card.created_by,
        "organization_id": card.organization_id,
        "first_name": card.first_name,
        "last_name": card.last_name,
        "middle_name": card.middle_name,
        "visibility": card.visibility,
        "status": card.status,
        "deleted_at": card.deleted_at.isoformat() if card.deleted_at else None,
    }


def _family_tree_link(db: Session, user: User | None, card: MemorialCard) -> dict:
    person = (
        db.query(TreePerson)
        .filter(TreePerson.memorial_card_id == card.id)
        .order_by(TreePerson.id.asc())
        .first()
    )
    if not person:
        return {}
    tree = db.query(FamilyTree).filter(FamilyTree.id == person.tree_id).first()
    if not tree:
        return {}
    if resolve_tree_access_level(db, tree, user, None) is None:
        return {}
    return {
        "family_tree_id": tree.id,
        "family_tree_title": tree.title or "Семейное древо",
        "tree_person_id": person.id,
        "family_tree_can_edit": can_edit_tree(db, tree, user, None),
    }


def _person_full_name(person: TreePerson) -> str:
    return (
        " ".join(
            part
            for part in [
                (person.last_name or "").strip(),
                (person.first_name or "").strip(),
                (person.middle_name or "").strip(),
            ]
            if part
        )
        or "Без имени"
    )


def _spouse_role(gender: str | None) -> str:
    if gender == "female":
        return "Супруга"
    if gender == "male":
        return "Супруг"
    return "Супруг(а)"


def _parent_role(gender: str | None) -> str:
    if gender == "female":
        return "Мать"
    if gender == "male":
        return "Отец"
    return "Родитель"


def _child_role(gender: str | None) -> str:
    if gender == "female":
        return "Дочь"
    if gender == "male":
        return "Сын"
    return "Ребёнок"


def _close_relatives_from_tree(db: Session, person: TreePerson) -> list[MemorialRelativeOut]:
    """Compact spouse / children / parents list for memorial page."""
    items: list[MemorialRelativeOut] = []
    seen: set[int] = set()

    as_partner = (
        db.query(TreeFamily)
        .filter(
            TreeFamily.tree_id == person.tree_id,
            (TreeFamily.partner_a_id == person.id) | (TreeFamily.partner_b_id == person.id),
        )
        .all()
    )
    for family in as_partner:
        spouse_id = (
            family.partner_b_id if family.partner_a_id == person.id else family.partner_a_id
        )
        if spouse_id and spouse_id not in seen:
            spouse = db.query(TreePerson).filter(TreePerson.id == spouse_id).first()
            if spouse:
                seen.add(spouse.id)
                items.append(
                    MemorialRelativeOut(
                        role=_spouse_role(spouse.gender),
                        name=_person_full_name(spouse),
                    )
                )
        for link in sorted(family.children or [], key=lambda c: c.sort_order):
            if link.person_id in seen or link.person_id == person.id:
                continue
            child = db.query(TreePerson).filter(TreePerson.id == link.person_id).first()
            if child:
                seen.add(child.id)
                items.append(
                    MemorialRelativeOut(
                        role=_child_role(child.gender),
                        name=_person_full_name(child),
                    )
                )

    as_child_links = (
        db.query(TreeFamilyChild)
        .filter(TreeFamilyChild.person_id == person.id)
        .all()
    )
    for link in as_child_links:
        family = db.query(TreeFamily).filter(TreeFamily.id == link.family_id).first()
        if not family:
            continue
        for parent_id in (family.partner_a_id, family.partner_b_id):
            if not parent_id or parent_id in seen or parent_id == person.id:
                continue
            parent = db.query(TreePerson).filter(TreePerson.id == parent_id).first()
            if parent:
                seen.add(parent.id)
                items.append(
                    MemorialRelativeOut(
                        role=_parent_role(parent.gender),
                        name=_person_full_name(parent),
                    )
                )

    return items


def _relatives_from_text(text: str | None) -> list[MemorialRelativeOut]:
    if not text or not text.strip():
        return []
    items: list[MemorialRelativeOut] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if ":" in line:
            role, name = line.split(":", 1)
            role, name = role.strip(), name.strip()
            if role and name:
                items.append(MemorialRelativeOut(role=role, name=name))
                continue
        items.append(MemorialRelativeOut(role="Родственник", name=line))
    return items


def _normalize_external_links(raw) -> list[MemorialExternalLink]:
    if not raw:
        return []
    items: list[MemorialExternalLink] = []
    for item in raw:
        try:
            if isinstance(item, MemorialExternalLink):
                items.append(MemorialExternalLink(label=item.label, url=item.url))
                continue
            if isinstance(item, dict):
                label = str(item.get("label") or "").strip()
                url = str(item.get("url") or "").strip()
                if label and url:
                    items.append(MemorialExternalLink(label=label, url=url))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    return items


def _external_links_payload(raw) -> list[dict] | None:
    if raw is None:
        return None
    return [link.model_dump() for link in _normalize_external_links(raw)]


def _resolve_memorial_life_status(
    *,
    life_status: str | None,
    death_date,
    cemetery_name: str | None = None,
    cemetery_location: str | None = None,
) -> str:
    if death_date:
        return "deceased"
    if life_status in ("unknown", "alive", "deceased"):
        return life_status
    if cemetery_name or cemetery_location:
        return "deceased"
    return "unknown"


def _clear_death_fields(target) -> None:
    target["death_date"] = None
    target["death_place"] = None
    target["death_lat"] = None
    target["death_lng"] = None
    target["cemetery_name"] = None
    target["cemetery_location"] = None
    target["cemetery_lat"] = None
    target["cemetery_lng"] = None


def enrich_card(db: Session, user: User | None, card: MemorialCard) -> MemorialCardOut:
    if getattr(card, "external_links", None) is None:
        card.external_links = []
    if not getattr(card, "page_kind", None):
        card.page_kind = "brief"
    data = MemorialCardOut.model_validate(card)
    tree_link = _family_tree_link(db, user, card)
    updates: dict = {**tree_link}

    relatives: list[MemorialRelativeOut] = []
    person_id = tree_link.get("tree_person_id")
    if person_id:
        person = db.query(TreePerson).filter(TreePerson.id == person_id).first()
        if person:
            relatives = _close_relatives_from_tree(db, person)
    if not relatives:
        relatives = _relatives_from_text(getattr(card, "relatives_text", None))
    updates["relatives"] = relatives
    updates["external_links"] = _normalize_external_links(getattr(card, "external_links", None))
    updates["gallery"] = [
        MemorialGalleryImageOut.model_validate(img)
        for img in sorted(card.gallery_images or [], key=lambda g: (g.sort_order, g.id))
    ]
    updates["videos"] = [
        MemorialVideoOut.model_validate(vid)
        for vid in sorted(card.videos or [], key=lambda v: (v.sort_order, v.id))
    ]
    updates["audio"] = [
        MemorialAudioOut.model_validate(clip)
        for clip in sorted(card.audio_clips or [], key=lambda a: (a.sort_order, a.id))
    ]
    updates["documents"] = [
        MemorialDocumentOut.model_validate(doc)
        for doc in sorted(card.documents or [], key=lambda d: (d.sort_order, d.id))
    ]
    updates["page_kind"] = getattr(card, "page_kind", None) or "brief"
    updates["guestbook_enabled"] = bool(getattr(card, "guestbook_enabled", False))
    updates["metal_plaque"] = bool(getattr(card, "metal_plaque", False))
    updates["life_status"] = _resolve_memorial_life_status(
        life_status=getattr(card, "life_status", None),
        death_date=getattr(card, "death_date", None),
        cemetery_name=getattr(card, "cemetery_name", None),
        cemetery_location=getattr(card, "cemetery_location", None),
    )

    if user:
        updates.update(
            {
                "can_edit": policies.can_edit_memorial(db, user, card),
                "can_delete": policies.can_delete_memorial(db, user, card),
                "can_transfer": policies.can_transfer_memorial(db, user, card),
                "can_assign_owner": policies.can_assign_owner(db, user, card),
            }
        )
    return data.model_copy(update=updates)


def create_card(
    db: Session,
    user: User,
    payload: MemorialCardCreate,
    request: Request | None = None,
) -> MemorialCard:
    org_id = payload.organization_id
    owner_id = payload.owner_id or user.id

    if org_id is not None:
        if not rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_CREATE_ORG):
            raise HTTPException(status_code=403, detail="Нет права создавать карточки организации")
        membership = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.status == "active",
            )
            .first()
        )
        if not membership and not rbac_service.user_has_permission(
            db, user, PermissionCode.ORG_MANAGE_ANY
        ):
            raise HTTPException(status_code=403, detail="Вы не состоите в этой организации")
    else:
        if not rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_CREATE):
            raise HTTPException(status_code=403, detail="Нет права создавать карточки")

    if payload.owner_id and payload.owner_id != user.id:
        if not rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_ASSIGN_OWNER):
            raise HTTPException(status_code=403, detail="Нет права назначать владельца")
        if not db.query(User).filter(User.id == payload.owner_id).first():
            raise HTTPException(status_code=404, detail="Владелец не найден")

    life_status = _resolve_memorial_life_status(
        life_status=payload.life_status,
        death_date=payload.death_date,
        cemetery_name=payload.cemetery_name,
        cemetery_location=payload.cemetery_location,
    )
    death_date = payload.death_date if life_status == "deceased" else None
    death_place = payload.death_place if life_status == "deceased" else None
    death_lat = payload.death_lat if life_status == "deceased" else None
    death_lng = payload.death_lng if life_status == "deceased" else None
    cemetery_name = payload.cemetery_name if life_status == "deceased" else None
    cemetery_location = payload.cemetery_location if life_status == "deceased" else None
    cemetery_lat = payload.cemetery_lat if life_status == "deceased" else None
    cemetery_lng = payload.cemetery_lng if life_status == "deceased" else None

    card = MemorialCard(
        owner_id=owner_id,
        created_by=user.id,
        organization_id=org_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        middle_name=payload.middle_name,
        birth_date=payload.birth_date,
        death_date=death_date,
        birth_place=payload.birth_place,
        birth_lat=payload.birth_lat,
        birth_lng=payload.birth_lng,
        death_place=death_place,
        death_lat=death_lat,
        death_lng=death_lng,
        life_status=life_status,
        epitaph=payload.epitaph,
        short_description=payload.short_description,
        relatives_text=payload.relatives_text,
        biography=payload.biography,
        photo_url=payload.photo_url,
        cemetery_name=cemetery_name,
        cemetery_location=cemetery_location,
        cemetery_lat=cemetery_lat,
        cemetery_lng=cemetery_lng,
        page_kind=payload.page_kind or "brief",
        guestbook_enabled=bool(payload.guestbook_enabled) if payload.guestbook_enabled is not None else False,
        metal_plaque=bool(payload.metal_plaque) if payload.metal_plaque is not None else False,
        external_links=_external_links_payload(payload.external_links) or [],
        visibility=payload.visibility or MemorialVisibility.PRIVATE,
        status=payload.status or MemorialStatus.PUBLISHED,
    )
    db.add(card)
    db.flush()
    log_action(
        db,
        action="memorial.create",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def list_accessible_cards(db: Session, user: User, *, include_deleted: bool = False) -> list[MemorialCard]:
    q = db.query(MemorialCard)
    if not include_deleted:
        q = q.filter(MemorialCard.deleted_at.is_(None))

    if rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_READ_ANY):
        return q.order_by(MemorialCard.created_at.desc()).all()

    org_ids = [
        m.organization_id
        for m in db.query(OrganizationMember)
        .filter(
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == "active",
        )
        .all()
    ]
    clauses = [MemorialCard.owner_id == user.id]
    if org_ids:
        clauses.append(MemorialCard.organization_id.in_(org_ids))
    return q.filter(or_(*clauses)).order_by(MemorialCard.created_at.desc()).all()


def search_public_cards(
    db: Session,
    *,
    query: str | None = None,
    limit: int = 50,
) -> list[MemorialCard]:
    q = db.query(MemorialCard).filter(
        MemorialCard.deleted_at.is_(None),
        MemorialCard.visibility == MemorialVisibility.PUBLIC,
        MemorialCard.status == MemorialStatus.PUBLISHED,
    )
    if query:
        like = f"%{query.strip()}%"
        q = q.filter(
            or_(
                MemorialCard.first_name.ilike(like),
                MemorialCard.last_name.ilike(like),
                MemorialCard.middle_name.ilike(like),
                MemorialCard.short_description.ilike(like),
                MemorialCard.cemetery_name.ilike(like),
            )
        )
    return q.order_by(MemorialCard.created_at.desc()).limit(limit).all()


def get_card_or_404(db: Session, card_id: int, *, include_deleted: bool = False) -> MemorialCard:
    q = db.query(MemorialCard).filter(MemorialCard.id == card_id)
    if not include_deleted:
        q = q.filter(MemorialCard.deleted_at.is_(None))
    card = q.first()
    if not card:
        raise HTTPException(status_code=404, detail="Карточка не найдена")
    return card


def update_card(
    db: Session,
    user: User,
    card: MemorialCard,
    payload: MemorialCardUpdate,
    request: Request | None = None,
) -> MemorialCard:
    if not policies.can_edit_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    old = _card_snapshot(card)
    data = payload.model_dump(exclude_unset=True)
    if "external_links" in data:
        data["external_links"] = _external_links_payload(payload.external_links) or []

    next_death = data["death_date"] if "death_date" in data else card.death_date
    next_cemetery_name = data["cemetery_name"] if "cemetery_name" in data else card.cemetery_name
    next_cemetery_location = (
        data["cemetery_location"] if "cemetery_location" in data else card.cemetery_location
    )
    next_status = _resolve_memorial_life_status(
        life_status=data.get("life_status", getattr(card, "life_status", None)),
        death_date=next_death,
        cemetery_name=next_cemetery_name,
        cemetery_location=next_cemetery_location,
    )
    data["life_status"] = next_status
    if next_status != "deceased":
        _clear_death_fields(data)

    for field, value in data.items():
        setattr(card, field, value)
    db.flush()
    log_action(
        db,
        action="memorial.update",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value=old,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def add_gallery_image(
    db: Session,
    user: User,
    card: MemorialCard,
    *,
    url: str,
    caption: str | None = None,
    request: Request | None = None,
) -> MemorialGalleryImage:
    if not policies.can_edit_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    max_order = (
        db.query(MemorialGalleryImage)
        .filter(MemorialGalleryImage.card_id == card.id)
        .count()
    )
    image = MemorialGalleryImage(
        card_id=card.id,
        url=url,
        caption=(caption or "").strip() or None,
        sort_order=max_order,
    )
    db.add(image)
    db.flush()
    log_action(
        db,
        action="memorial.gallery.add",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        new_value={"image_id": image.id, "url": url},
    )
    db.commit()
    db.refresh(image)
    return image


def delete_gallery_image(
    db: Session,
    user: User,
    card: MemorialCard,
    image_id: int,
    request: Request | None = None,
) -> None:
    if not policies.can_edit_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    image = (
        db.query(MemorialGalleryImage)
        .filter(MemorialGalleryImage.id == image_id, MemorialGalleryImage.card_id == card.id)
        .first()
    )
    if not image:
        raise HTTPException(status_code=404, detail="Фото не найдено")
    db.delete(image)
    log_action(
        db,
        action="memorial.gallery.delete",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value={"image_id": image_id},
    )
    db.commit()


def add_video_file(
    db: Session,
    user: User,
    card: MemorialCard,
    *,
    url: str,
    title: str | None = None,
    request: Request | None = None,
) -> MemorialVideo:
    if not policies.can_edit_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    max_order = db.query(MemorialVideo).filter(MemorialVideo.card_id == card.id).count()
    video = MemorialVideo(
        card_id=card.id,
        source="file",
        url=url,
        embed_url=None,
        title=(title or "").strip() or None,
        sort_order=max_order,
    )
    db.add(video)
    db.flush()
    log_action(
        db,
        action="memorial.video.add",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        new_value={"video_id": video.id, "source": "file"},
    )
    db.commit()
    db.refresh(video)
    return video


def add_video_link(
    db: Session,
    user: User,
    card: MemorialCard,
    *,
    url: str,
    title: str | None = None,
    request: Request | None = None,
) -> MemorialVideo:
    if not policies.can_edit_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    parsed = parse_video_url(url)
    max_order = db.query(MemorialVideo).filter(MemorialVideo.card_id == card.id).count()
    video = MemorialVideo(
        card_id=card.id,
        source=parsed["source"],
        url=parsed["url"],
        embed_url=parsed["embed_url"],
        title=(title or "").strip() or None,
        sort_order=max_order,
    )
    db.add(video)
    db.flush()
    log_action(
        db,
        action="memorial.video.add",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        new_value={"video_id": video.id, "source": parsed["source"]},
    )
    db.commit()
    db.refresh(video)
    return video


def delete_video(
    db: Session,
    user: User,
    card: MemorialCard,
    video_id: int,
    request: Request | None = None,
) -> None:
    if not policies.can_edit_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    video = (
        db.query(MemorialVideo)
        .filter(MemorialVideo.id == video_id, MemorialVideo.card_id == card.id)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Видео не найдено")
    db.delete(video)
    log_action(
        db,
        action="memorial.video.delete",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value={"video_id": video_id},
    )
    db.commit()


def add_audio(
    db: Session,
    user: User,
    card: MemorialCard,
    *,
    url: str,
    title: str | None = None,
    request: Request | None = None,
) -> MemorialAudio:
    if not policies.can_edit_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    max_order = db.query(MemorialAudio).filter(MemorialAudio.card_id == card.id).count()
    clip = MemorialAudio(
        card_id=card.id,
        url=url,
        title=(title or "").strip() or None,
        sort_order=max_order,
    )
    db.add(clip)
    db.flush()
    log_action(
        db,
        action="memorial.audio.add",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        new_value={"audio_id": clip.id},
    )
    db.commit()
    db.refresh(clip)
    return clip


def delete_audio(
    db: Session,
    user: User,
    card: MemorialCard,
    audio_id: int,
    request: Request | None = None,
) -> None:
    if not policies.can_edit_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    clip = (
        db.query(MemorialAudio)
        .filter(MemorialAudio.id == audio_id, MemorialAudio.card_id == card.id)
        .first()
    )
    if not clip:
        raise HTTPException(status_code=404, detail="Аудио не найдено")
    db.delete(clip)
    log_action(
        db,
        action="memorial.audio.delete",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value={"audio_id": audio_id},
    )
    db.commit()


_DOC_CATEGORIES = {"diploma", "military", "letter", "award", "other"}


def add_document(
    db: Session,
    user: User,
    card: MemorialCard,
    *,
    url: str,
    title: str | None = None,
    category: str = "other",
    original_name: str | None = None,
    request: Request | None = None,
) -> MemorialDocument:
    if not policies.can_edit_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    cat = (category or "other").strip().lower()
    if cat not in _DOC_CATEGORIES:
        cat = "other"
    max_order = db.query(MemorialDocument).filter(MemorialDocument.card_id == card.id).count()
    doc = MemorialDocument(
        card_id=card.id,
        url=url,
        title=(title or "").strip() or None,
        category=cat,
        original_name=(original_name or "").strip() or None,
        sort_order=max_order,
    )
    db.add(doc)
    db.flush()
    log_action(
        db,
        action="memorial.document.add",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        new_value={"document_id": doc.id, "category": cat},
    )
    db.commit()
    db.refresh(doc)
    return doc


def delete_document(
    db: Session,
    user: User,
    card: MemorialCard,
    document_id: int,
    request: Request | None = None,
) -> None:
    if not policies.can_edit_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на редактирование")
    doc = (
        db.query(MemorialDocument)
        .filter(MemorialDocument.id == document_id, MemorialDocument.card_id == card.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")
    db.delete(doc)
    log_action(
        db,
        action="memorial.document.delete",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value={"document_id": document_id},
    )
    db.commit()


def soft_delete_card(
    db: Session,
    user: User,
    card: MemorialCard,
    request: Request | None = None,
) -> MemorialCard:
    if not policies.can_delete_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на удаление")
    old = _card_snapshot(card)
    card.deleted_at = datetime.now(timezone.utc)
    card.deleted_by = user.id
    db.flush()
    log_action(
        db,
        action="memorial.soft_delete",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value=old,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def restore_card(
    db: Session,
    user: User,
    card: MemorialCard,
    request: Request | None = None,
) -> MemorialCard:
    if not policies.can_restore_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на восстановление")
    old = _card_snapshot(card)
    card.deleted_at = None
    card.deleted_by = None
    db.flush()
    log_action(
        db,
        action="memorial.restore",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value=old,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def transfer_ownership(
    db: Session,
    user: User,
    card: MemorialCard,
    new_owner_id: int,
    request: Request | None = None,
) -> MemorialCard:
    if not policies.can_transfer_memorial(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на передачу владения")
    new_owner = db.query(User).filter(User.id == new_owner_id).first()
    if not new_owner:
        raise HTTPException(status_code=404, detail="Новый владелец не найден")
    old = _card_snapshot(card)
    card.owner_id = new_owner_id
    db.flush()
    log_action(
        db,
        action="memorial.transfer_ownership",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value=old,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def assign_owner(
    db: Session,
    user: User,
    card: MemorialCard,
    owner_id: int,
    request: Request | None = None,
) -> MemorialCard:
    if not policies.can_assign_owner(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав назначать владельца")
    if not db.query(User).filter(User.id == owner_id).first():
        raise HTTPException(status_code=404, detail="Владелец не найден")
    old = _card_snapshot(card)
    card.owner_id = owner_id
    db.flush()
    log_action(
        db,
        action="memorial.assign_owner",
        entity_type="memorial_card",
        entity_id=card.id,
        user=user,
        request=request,
        old_value=old,
        new_value=_card_snapshot(card),
    )
    db.commit()
    db.refresh(card)
    return card


def create_ownership_claim(
    db: Session,
    user: User,
    card: MemorialCard,
    message: str | None,
    request: Request | None = None,
) -> OwnershipClaim:
    if not rbac_service.user_has_permission(db, user, PermissionCode.MEMORIAL_CLAIM_REQUEST):
        raise HTTPException(status_code=403, detail="Нет права подавать запрос")
    if card.owner_id == user.id:
        raise HTTPException(status_code=400, detail="Вы уже владелец карточки")
    existing = (
        db.query(OwnershipClaim)
        .filter(
            OwnershipClaim.memorial_id == card.id,
            OwnershipClaim.requester_id == user.id,
            OwnershipClaim.status == ClaimStatus.PENDING,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Запрос уже отправлен")

    claim = OwnershipClaim(
        memorial_id=card.id,
        requester_id=user.id,
        message=message,
        status=ClaimStatus.PENDING,
    )
    db.add(claim)
    db.flush()
    log_action(
        db,
        action="memorial.claim_request",
        entity_type="ownership_claim",
        entity_id=claim.id,
        user=user,
        request=request,
        new_value={"memorial_id": card.id, "requester_id": user.id, "message": message},
    )
    db.commit()
    db.refresh(claim)
    return claim


def review_ownership_claim(
    db: Session,
    user: User,
    claim: OwnershipClaim,
    approve: bool,
    request: Request | None = None,
) -> OwnershipClaim:
    card = get_card_or_404(db, claim.memorial_id)
    if not policies.can_review_claim(db, user, card):
        raise HTTPException(status_code=403, detail="Нет прав на рассмотрение запроса")
    if claim.status != ClaimStatus.PENDING:
        raise HTTPException(status_code=400, detail="Запрос уже рассмотрен")

    old = {"status": claim.status, "owner_id": card.owner_id}
    claim.reviewed_by = user.id
    claim.reviewed_at = datetime.now(timezone.utc)
    if approve:
        claim.status = ClaimStatus.APPROVED
        card.owner_id = claim.requester_id
    else:
        claim.status = ClaimStatus.REJECTED
    db.flush()
    log_action(
        db,
        action="memorial.claim_review",
        entity_type="ownership_claim",
        entity_id=claim.id,
        user=user,
        request=request,
        old_value=old,
        new_value={
            "status": claim.status,
            "owner_id": card.owner_id,
            "approve": approve,
        },
    )
    db.commit()
    db.refresh(claim)
    return claim
