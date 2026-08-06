from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Header, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_user, get_current_user_optional
from ..database import get_db
from ..models import FamilyTree, MemorialCard, TreeCollaborator, TreePerson, User
from ..services.rate_limit import client_ip, enforce_rate_limit
from ..services.uploads import IMAGE_TYPES, require_image, write_media_bytes
from ..schemas import (
    CollaboratorInvite,
    FamilyTreeCreate,
    FamilyTreeUpdate,
    LayoutUpdate,
    PersonCreate,
    PersonUpdate,
    RelativeCreate,
)
from ..services.gedcom_import import import_gedcom_into_tree
from ..domain.enums import MemorialStatus, MemorialVisibility, PermissionCode, TreeAccessLevel
from ..rbac import service as rbac_service
from ..services.partial_dates import normalize_partial_date, partial_date_to_full
from ..services.tree_access import (
    can_edit_tree,
    can_manage_tree_access,
    can_view_via_share_slug,
    new_guest_token,
    new_invite_token,
    new_share_slug,
    require_tree_edit,
    require_tree_view,
    resolve_tree_access_level,
)
from ..services.tree_demo import clone_demo_tree, ensure_demo_tree
from ..services.tree_layout import auto_layout_tree, ensure_layout
from ..services.tree_ops import (
    add_relative,
    create_person,
    delete_person,
    replace_alt_names,
    resolve_life_status,
    touch_tree,
)
from ..services.tree_serialize import load_tree, tree_detail_dict, tree_summary_dict

router = APIRouter(prefix="/api/family-trees", tags=["family-trees"])


def _guest(x_guest_token: str | None = Header(default=None, alias="X-Guest-Token")) -> str | None:
    token = (x_guest_token or "").strip()
    return token or None


def _get_tree_or_404(db: Session, tree_id: int) -> FamilyTree:
    tree = load_tree(db, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Древо не найдено")
    return tree


def _assert_tree_not_stale(tree: FamilyTree, if_match: str | None) -> None:
    """Optimistic concurrency via If-Match: <tree.updated_at ISO>."""
    if not if_match:
        return
    current = tree.updated_at
    if current is None:
        return
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    raw = if_match.strip().strip('"')
    try:
        expected = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Некорректный заголовок If-Match") from exc
    if expected.tzinfo is None:
        expected = expected.replace(tzinfo=timezone.utc)
    if int(current.timestamp()) != int(expected.timestamp()):
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Древо изменено. Обновите страницу и повторите.",
                "updated_at": current.isoformat(),
            },
        )


def _limit_guest_mutation(request: Request, current_user: User | None, *, action: str) -> None:
    if current_user:
        return
    enforce_rate_limit(
        f"guest-tree:{action}:{client_ip(request)}",
        max_calls=20,
        window_seconds=3600,
        detail="Слишком много гостевых действий. Войдите или попробуйте позже.",
    )


@router.get("")
def list_trees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if rbac_service.user_has_permission(db, current_user, PermissionCode.TREE_READ_ANY):
        trees = (
            db.query(FamilyTree)
            .options(joinedload(FamilyTree.persons))
            .filter(FamilyTree.is_demo_template.is_(False))
            .order_by(FamilyTree.updated_at.desc())
            .all()
        )
        return [tree_summary_dict(t) for t in trees]

    trees = (
        db.query(FamilyTree)
        .options(joinedload(FamilyTree.persons))
        .filter(FamilyTree.owner_id == current_user.id, FamilyTree.is_demo_template.is_(False))
        .order_by(FamilyTree.updated_at.desc())
        .all()
    )
    collab_ids = [
        c.tree_id
        for c in db.query(TreeCollaborator)
        .filter(TreeCollaborator.user_id == current_user.id, TreeCollaborator.status == "accepted")
        .all()
    ]
    if collab_ids:
        extra = (
            db.query(FamilyTree)
            .options(joinedload(FamilyTree.persons))
            .filter(FamilyTree.id.in_(collab_ids))
            .all()
        )
        seen = {t.id for t in trees}
        trees.extend([t for t in extra if t.id not in seen])
    return [tree_summary_dict(t) for t in trees]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_tree(
    payload: FamilyTreeCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
    _limit_guest_mutation(request, current_user, action="create")
    token = guest_token or (new_guest_token() if not current_user else None)
    tree = FamilyTree(
        owner_id=current_user.id if current_user else None,
        title=payload.title.strip(),
        description=payload.description,
        tree_json=payload.tree_json or "{}",
        share_slug=new_share_slug(),
        visibility="private",
        guest_token=token if not current_user else None,
    )
    db.add(tree)
    db.commit()
    db.refresh(tree)
    detail = tree_detail_dict(tree, can_edit=True)
    if token:
        detail["guest_token"] = token
    return detail


@router.post("/guest", status_code=status.HTTP_201_CREATED)
def create_guest_tree(
    payload: FamilyTreeCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    _limit_guest_mutation(request, None, action="guest-create")
    token = new_guest_token()
    tree = FamilyTree(
        owner_id=None,
        title=payload.title.strip(),
        description=payload.description,
        tree_json="{}",
        share_slug=new_share_slug(),
        visibility="private",
        guest_token=token,
    )
    db.add(tree)
    db.commit()
    tree = load_tree(db, tree.id)
    detail = tree_detail_dict(tree, can_edit=True)
    detail["guest_token"] = token
    return detail


@router.post("/claim")
def claim_guest_trees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    guest_token: str | None = Depends(_guest),
):
    if not guest_token:
        raise HTTPException(status_code=400, detail="Нужен X-Guest-Token")
    trees = db.query(FamilyTree).filter(FamilyTree.guest_token == guest_token, FamilyTree.owner_id.is_(None)).all()
    for tree in trees:
        tree.owner_id = current_user.id
        tree.guest_token = None
        touch_tree(tree)
    db.commit()
    return {"claimed": len(trees)}


@router.get("/demo")
def get_demo(db: Session = Depends(get_db)):
    tree = ensure_demo_tree(db)
    tree = load_tree(db, tree.id)
    return tree_detail_dict(tree, can_edit=False)


@router.post("/demo/clone", status_code=status.HTTP_201_CREATED)
def clone_demo(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
    _limit_guest_mutation(request, current_user, action="demo-clone")
    token = None
    if not current_user:
        token = guest_token or new_guest_token()
    clone = clone_demo_tree(
        db,
        owner_id=current_user.id if current_user else None,
        guest_token=token if not current_user else None,
    )
    db.commit()
    clone = load_tree(db, clone.id)
    detail = tree_detail_dict(clone, can_edit=True)
    if token:
        detail["guest_token"] = token
    return detail


@router.post("/import/gedcom", status_code=status.HTTP_201_CREATED)
async def import_gedcom(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
    _limit_guest_mutation(request, current_user, action="gedcom")
    # Cap before parsing: unbounded GEDCOM can exhaust memory / fill DB.
    GEDCOM_MAX_BYTES = 5 * 1024 * 1024
    content = await file.read(GEDCOM_MAX_BYTES + 1)
    if not content:
        raise HTTPException(status_code=400, detail="Пустой файл")
    if len(content) > GEDCOM_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Файл GEDCOM больше 5 МБ")
    token = guest_token or (new_guest_token() if not current_user else None)
    tree = FamilyTree(
        owner_id=current_user.id if current_user else None,
        title=(file.filename or "Импорт GEDCOM").rsplit(".", 1)[0][:255] or "Импорт GEDCOM",
        description="Импортировано из GEDCOM",
        tree_json="{}",
        share_slug=new_share_slug(),
        visibility="private",
        guest_token=token if not current_user else None,
    )
    db.add(tree)
    db.flush()
    report = import_gedcom_into_tree(db, tree, content)
    # Guest limit after import
    if not current_user:
        from ..models import TreePerson
        from ..services.tree_access import GUEST_PERSON_LIMIT

        count = db.query(TreePerson).filter(TreePerson.tree_id == tree.id).count()
        if count > GUEST_PERSON_LIMIT:
            db.rollback()
            raise HTTPException(
                status_code=403,
                detail=f"В файле {count} человек. Без регистрации лимит {GUEST_PERSON_LIMIT}. Войдите и импортируйте снова.",
            )
    db.commit()
    tree = load_tree(db, tree.id)
    detail = tree_detail_dict(tree, can_edit=True)
    if token and not current_user:
        detail["guest_token"] = token
    detail["import_report"] = report
    return detail


@router.get("/s/{share_slug}")
def get_by_slug(
    share_slug: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
    tree = (
        db.query(FamilyTree)
        .filter(FamilyTree.share_slug == share_slug)
        .first()
    )
    if not tree:
        raise HTTPException(status_code=404, detail="Древо не найдено")
    tree = load_tree(db, tree.id)
    if not can_view_via_share_slug(db, tree, current_user, guest_token):
        raise HTTPException(status_code=404, detail="Древо не найдено")
    level = resolve_tree_access_level(db, tree, current_user, guest_token)
    if level is None and tree.visibility in ("link", "public"):
        level = TreeAccessLevel.VIEWER
    can_edit = can_edit_tree(db, tree, current_user, guest_token)
    return tree_detail_dict(
        tree,
        can_edit=can_edit,
        access_level=level.value if level else None,
    )


@router.get("/{tree_id}")
def get_tree(
    tree_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
    tree = _get_tree_or_404(db, tree_id)
    require_tree_view(db, tree, current_user, guest_token)
    level = resolve_tree_access_level(db, tree, current_user, guest_token)
    return tree_detail_dict(
        tree,
        can_edit=can_edit_tree(db, tree, current_user, guest_token),
        access_level=level.value if level else None,
    )


@router.put("/{tree_id}")
def update_tree(
    tree_id: int,
    payload: FamilyTreeUpdate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
    if_match: str | None = Header(default=None, alias="If-Match"),
):
    tree = _get_tree_or_404(db, tree_id)
    require_tree_edit(db, tree, current_user, guest_token)
    _assert_tree_not_stale(tree, if_match)
    data = payload.model_dump(exclude_unset=True)
    data.pop("tree_json", None)
    for key, value in data.items():
        setattr(tree, key, value)
    if not tree.share_slug:
        tree.share_slug = new_share_slug()
    touch_tree(tree)
    db.commit()
    tree = load_tree(db, tree.id)
    return tree_detail_dict(tree, can_edit=True)


@router.delete("/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_tree(
    tree_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
    tree = _get_tree_or_404(db, tree_id)
    if tree.is_demo_template:
        raise HTTPException(status_code=403, detail="Демо-шаблон нельзя удалить")
    level = resolve_tree_access_level(db, tree, current_user, guest_token)
    allowed = level == TreeAccessLevel.OWNER or (
        guest_token and tree.guest_token == guest_token and not tree.owner_id
    )
    if current_user and rbac_service.user_has_permission(
        db, current_user, PermissionCode.TREE_DELETE_ANY
    ):
        allowed = True
    if not allowed:
        raise HTTPException(status_code=403, detail="Удалить может только владелец")
    db.delete(tree)
    db.commit()


@router.post("/{tree_id}/persons", status_code=status.HTTP_201_CREATED)
def create_tree_person(
    tree_id: int,
    payload: PersonCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
    tree = _get_tree_or_404(db, tree_id)
    require_tree_edit(db, tree, current_user, guest_token)
    person = create_person(
        db,
        tree,
        first_name=payload.first_name,
        last_name=payload.last_name,
        middle_name=payload.middle_name,
        gender=payload.gender,
        birth_date=payload.birth_date,
        death_date=payload.death_date,
        birth_place=payload.birth_place,
        birth_lat=payload.birth_lat,
        birth_lng=payload.birth_lng,
        death_place=payload.death_place,
        death_lat=payload.death_lat,
        death_lng=payload.death_lng,
        burial_place=payload.burial_place,
        burial_lat=payload.burial_lat,
        burial_lng=payload.burial_lng,
        note=payload.note,
        life_status=payload.life_status,
        is_deceased=payload.is_deceased,
    )
    if payload.alt_names:
        replace_alt_names(db, person, [n.model_dump() for n in payload.alt_names])
    db.commit()
    tree = load_tree(db, tree.id)
    return tree_detail_dict(tree, can_edit=True)


@router.put("/{tree_id}/persons/{person_id}")
def update_tree_person(
    tree_id: int,
    person_id: int,
    payload: PersonUpdate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
    if_match: str | None = Header(default=None, alias="If-Match"),
):
    tree = _get_tree_or_404(db, tree_id)
    require_tree_edit(db, tree, current_user, guest_token)
    _assert_tree_not_stale(tree, if_match)
    person = db.query(TreePerson).filter(TreePerson.id == person_id, TreePerson.tree_id == tree_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Человек не найден")
    data = payload.model_dump(exclude_unset=True)
    alt_names = data.pop("alt_names", None)
    x = data.pop("x", None)
    y = data.pop("y", None)
    life_status_in = data.pop("life_status", None)
    is_deceased_in = data.pop("is_deceased", None)
    for key, value in data.items():
        if key in ("birth_date", "death_date") and value is not None:
            value = normalize_partial_date(value) if value else None
        setattr(person, key, value)
    death = person.death_date
    status = resolve_life_status(
        life_status=life_status_in,
        is_deceased=is_deceased_in,
        death_date=death,
        previous=getattr(person, "life_status", None),
    )
    person.life_status = status
    person.is_deceased = status == "deceased"
    if status != "deceased":
        person.death_date = None
        person.burial_place = None
        person.burial_lat = None
        person.burial_lng = None
        person.death_place = None
        person.death_lat = None
        person.death_lng = None
    if alt_names is not None:
        replace_alt_names(db, person, alt_names)
    if x is not None or y is not None:
        layout = ensure_layout(db, person)
        if x is not None:
            layout.x = x
        if y is not None:
            layout.y = y
    touch_tree(tree)
    db.commit()
    tree = load_tree(db, tree.id)
    return tree_detail_dict(tree, can_edit=True)


@router.delete("/{tree_id}/persons/{person_id}")
def delete_tree_person(
    tree_id: int,
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
    tree = _get_tree_or_404(db, tree_id)
    require_tree_edit(db, tree, current_user, guest_token)
    person = db.query(TreePerson).filter(TreePerson.id == person_id, TreePerson.tree_id == tree_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Человек не найден")
    delete_person(db, tree, person)
    db.commit()
    tree = load_tree(db, tree.id)
    return tree_detail_dict(tree, can_edit=True)


@router.post("/{tree_id}/persons/{person_id}/relatives", status_code=status.HTTP_201_CREATED)
def create_relative(
    tree_id: int,
    person_id: int,
    payload: RelativeCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
    tree = _get_tree_or_404(db, tree_id)
    require_tree_edit(db, tree, current_user, guest_token)
    anchor = db.query(TreePerson).filter(TreePerson.id == person_id, TreePerson.tree_id == tree_id).first()
    if not anchor:
        raise HTTPException(status_code=404, detail="Человек не найден")
    try:
        person = add_relative(
            db,
            tree,
            anchor,
            relation=payload.relation,
            gender=payload.gender,
            last_name=payload.last_name,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit()
    tree = load_tree(db, tree.id)
    detail = tree_detail_dict(tree, can_edit=True)
    detail["new_person_id"] = person.id
    return detail


@router.post("/{tree_id}/layout")
def update_layout(
    tree_id: int,
    payload: LayoutUpdate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
    if_match: str | None = Header(default=None, alias="If-Match"),
):
    tree = _get_tree_or_404(db, tree_id)
    _assert_tree_not_stale(tree, if_match)
    require_tree_edit(db, tree, current_user, guest_token)
    persons = {p.id: p for p in tree.persons}
    for item in payload.items:
        person = persons.get(item.person_id)
        if not person:
            continue
        layout = ensure_layout(db, person)
        layout.x = item.x
        layout.y = item.y
    touch_tree(tree)
    db.commit()
    tree = load_tree(db, tree.id)
    return tree_detail_dict(tree, can_edit=True)


@router.post("/{tree_id}/layout/auto")
def run_auto_layout(
    tree_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
    tree = _get_tree_or_404(db, tree_id)
    require_tree_edit(db, tree, current_user, guest_token)
    auto_layout_tree(db, tree.id)
    touch_tree(tree)
    db.commit()
    tree = load_tree(db, tree.id)
    return tree_detail_dict(tree, can_edit=True)


@router.post("/{tree_id}/persons/{person_id}/photo")
async def upload_photo(
    tree_id: int,
    person_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
    if_match: str | None = Header(default=None, alias="If-Match"),
):
    tree = _get_tree_or_404(db, tree_id)
    require_tree_edit(db, tree, current_user, guest_token)
    _assert_tree_not_stale(tree, if_match)
    person = db.query(TreePerson).filter(TreePerson.id == person_id, TreePerson.tree_id == tree_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Человек не найден")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 5 МБ")
    mime = require_image(data)
    rel = f"tree-photos/{tree_id}_{person_id}_{uuid4().hex}{IMAGE_TYPES[mime]}"
    write_media_bytes(rel, data)
    person.photo_path = rel
    touch_tree(tree)
    db.commit()
    tree = load_tree(db, tree.id)
    return tree_detail_dict(tree, can_edit=True)


@router.post("/{tree_id}/persons/{person_id}/memorial", status_code=status.HTTP_201_CREATED)
def create_person_memorial(
    tree_id: int,
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a memorial page from a tree person (or return existing link)."""
    tree = _get_tree_or_404(db, tree_id)
    require_tree_edit(db, tree, current_user, None)
    person = db.query(TreePerson).filter(TreePerson.id == person_id, TreePerson.tree_id == tree_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Человек не найден")

    if person.memorial_card_id:
        tree = load_tree(db, tree.id)
        detail = tree_detail_dict(tree, can_edit=True)
        detail["memorial_card_id"] = person.memorial_card_id
        return detail

    if not rbac_service.user_has_permission(db, current_user, PermissionCode.MEMORIAL_CREATE):
        raise HTTPException(status_code=403, detail="Нет права создавать страницы памяти")

    first = (person.first_name or "").strip() or "Без имени"
    last = (person.last_name or "").strip() or "—"
    photo_url = f"/media/{person.photo_path}" if person.photo_path else None

    card = MemorialCard(
        owner_id=current_user.id,
        created_by=current_user.id,
        first_name=first[:120],
        last_name=last[:120],
        middle_name=(person.middle_name or None),
        birth_date=partial_date_to_full(person.birth_date),
        death_date=partial_date_to_full(person.death_date),
        birth_place=person.birth_place,
        birth_lat=person.birth_lat,
        birth_lng=person.birth_lng,
        death_place=person.death_place,
        death_lat=person.death_lat,
        death_lng=person.death_lng,
        photo_url=photo_url,
        cemetery_name=(person.burial_place or None),
        cemetery_location=(person.burial_place or None),
        cemetery_lat=person.burial_lat,
        cemetery_lng=person.burial_lng,
        visibility=MemorialVisibility.PRIVATE,
        status=MemorialStatus.PUBLISHED,
    )
    db.add(card)
    db.flush()
    person.memorial_card_id = card.id
    touch_tree(tree)
    db.commit()
    tree = load_tree(db, tree.id)
    detail = tree_detail_dict(tree, can_edit=True)
    detail["memorial_card_id"] = card.id
    return detail


@router.get("/{tree_id}/collaborators")
def list_collaborators(
    tree_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tree = _get_tree_or_404(db, tree_id)
    if not can_manage_tree_access(db, tree, current_user):
        raise HTTPException(status_code=403, detail="Нет права управлять доступом")
    rows = db.query(TreeCollaborator).filter(TreeCollaborator.tree_id == tree_id).all()
    # Never expose invite_token in list responses (one-time link only on create).
    return [
        {
            "id": r.id,
            "email": r.email,
            "user_id": r.user_id,
            "role": r.role,
            "status": r.status,
            "access_level": r.role,
        }
        for r in rows
    ]


@router.post("/{tree_id}/collaborators", status_code=status.HTTP_201_CREATED)
def invite_collaborator(
    tree_id: int,
    payload: CollaboratorInvite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tree = _get_tree_or_404(db, tree_id)
    if not can_manage_tree_access(db, tree, current_user):
        raise HTTPException(status_code=403, detail="Нет права управлять доступом")
    if not rbac_service.user_has_permission(db, current_user, PermissionCode.TREE_INVITE):
        if not rbac_service.user_has_permission(
            db, current_user, PermissionCode.TREE_UPDATE_ANY
        ):
            raise HTTPException(status_code=403, detail="Нет права приглашать")
    email = str(payload.email).lower()
    existing_user = db.query(User).filter(User.email == email).first()
    # Always pending until /invites/.../accept — auto-accept was privilege escalation.
    row = TreeCollaborator(
        tree_id=tree.id,
        user_id=existing_user.id if existing_user else None,
        email=email,
        role=payload.role,
        invite_token=new_invite_token(),
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "email": row.email,
        "role": row.role,
        "status": row.status,
        "invite_token": row.invite_token,
        "invite_url": f"/family-tree/invite/{row.invite_token}",
    }


@router.post("/invites/{invite_token}/accept")
def accept_invite(
    invite_token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(TreeCollaborator).filter(TreeCollaborator.invite_token == invite_token).first()
    if not row:
        raise HTTPException(status_code=404, detail="Приглашение не найдено")
    if row.email and current_user.email and row.email.lower() != current_user.email.lower():
        raise HTTPException(status_code=403, detail="Приглашение для другого email")
    row.user_id = current_user.id
    row.status = "accepted"
    db.commit()
    return {"tree_id": row.tree_id, "role": row.role}
