from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_user, get_current_user_optional
from ..database import get_db
from ..models import FamilyTree, TreeCollaborator, TreePerson, User
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
from ..domain.enums import PermissionCode, TreeAccessLevel
from ..rbac import service as rbac_service
from ..services.tree_access import (
    can_edit_tree,
    can_manage_tree_access,
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
    touch_tree,
)
from ..services.tree_serialize import load_tree, tree_detail_dict, tree_summary_dict

router = APIRouter(prefix="/api/family-trees", tags=["family-trees"])
MEDIA_ROOT = Path(__file__).resolve().parents[2] / "media" / "tree-photos"


def _guest(x_guest_token: str | None = Header(default=None, alias="X-Guest-Token")) -> str | None:
    token = (x_guest_token or "").strip()
    return token or None


def _get_tree_or_404(db: Session, tree_id: int) -> FamilyTree:
    tree = load_tree(db, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Древо не найдено")
    return tree


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
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
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
    db: Session = Depends(get_db),
):
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
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
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
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    guest_token: str | None = Depends(_guest),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Пустой файл")
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
    require_tree_view(db, tree, current_user, guest_token)
    level = resolve_tree_access_level(db, tree, current_user, guest_token)
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
):
    tree = _get_tree_or_404(db, tree_id)
    require_tree_edit(db, tree, current_user, guest_token)
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
        death_place=payload.death_place,
        note=payload.note,
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
):
    tree = _get_tree_or_404(db, tree_id)
    require_tree_edit(db, tree, current_user, guest_token)
    person = db.query(TreePerson).filter(TreePerson.id == person_id, TreePerson.tree_id == tree_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Человек не найден")
    data = payload.model_dump(exclude_unset=True)
    alt_names = data.pop("alt_names", None)
    x = data.pop("x", None)
    y = data.pop("y", None)
    for key, value in data.items():
        setattr(person, key, value)
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
):
    tree = _get_tree_or_404(db, tree_id)
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
):
    tree = _get_tree_or_404(db, tree_id)
    require_tree_edit(db, tree, current_user, guest_token)
    person = db.query(TreePerson).filter(TreePerson.id == person_id, TreePerson.tree_id == tree_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Человек не найден")
    content_type = (file.content_type or "").lower()
    if content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(status_code=400, detail="Допустимы JPEG, PNG, WEBP, GIF")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл больше 5 МБ")
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }[content_type]
    rel = f"tree-photos/{tree_id}_{person_id}_{uuid4().hex}{ext}"
    dest = Path(__file__).resolve().parents[2] / "media" / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    person.photo_path = rel
    touch_tree(tree)
    db.commit()
    tree = load_tree(db, tree.id)
    return tree_detail_dict(tree, can_edit=True)


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
    return [
        {
            "id": r.id,
            "email": r.email,
            "user_id": r.user_id,
            "role": r.role,
            "status": r.status,
            "invite_token": r.invite_token,
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
    row = TreeCollaborator(
        tree_id=tree.id,
        user_id=existing_user.id if existing_user else None,
        email=email,
        role=payload.role,
        invite_token=new_invite_token(),
        status="accepted" if existing_user else "pending",
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
