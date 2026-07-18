import io
import json

import qrcode
from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, get_password_hash, verify_password
from .database import Base, engine, get_db
from .models import FamilyTree, MemorialCard, User
from .schemas import (
    FamilyTreeCreate,
    FamilyTreeOut,
    MemorialCardCreate,
    MemorialCardOut,
    SiteMapResponse,
    SiteSection,
    TokenResponse,
    UserCreate,
    UserOut,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Digital Memory MVP", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким email уже зарегистрирован",
        )

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/auth/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь с таким email не найден")
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный пароль")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@app.get("/api/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/api/memorial-cards", response_model=MemorialCardOut, status_code=status.HTTP_201_CREATED)
def create_memorial_card(
    payload: MemorialCardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = MemorialCard(owner_id=current_user.id, **payload.model_dump())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@app.get("/api/memorial-cards", response_model=list[MemorialCardOut])
def list_memorial_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(MemorialCard).filter(MemorialCard.owner_id == current_user.id).all()


@app.post("/api/family-trees", response_model=FamilyTreeOut, status_code=status.HTTP_201_CREATED)
def create_family_tree(
    payload: FamilyTreeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        json.loads(payload.tree_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="tree_json must be valid JSON string") from exc

    tree = FamilyTree(owner_id=current_user.id, **payload.model_dump())
    db.add(tree)
    db.commit()
    db.refresh(tree)
    return tree


@app.get("/api/family-trees", response_model=list[FamilyTreeOut])
def list_family_trees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(FamilyTree).filter(FamilyTree.owner_id == current_user.id).all()


@app.get("/api/memorial-cards/{card_id}/qr")
def generate_qr_for_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = (
        db.query(MemorialCard)
        .filter(MemorialCard.id == card_id, MemorialCard.owner_id == current_user.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    public_url = f"https://example.com/memorial/{card.id}"
    image = qrcode.make(public_url)
    buf = io.BytesIO()
    image.save(buf, format="PNG")

    return Response(content=buf.getvalue(), media_type="image/png")


@app.get("/api/site-map", response_model=SiteMapResponse)
def site_map() -> SiteMapResponse:
    sections = [
        SiteSection(slug="memory-page", title="Страница памяти", items=["Как работает", "Создать", "Личный кабинет", "Вид (пример)", "Вопросы"]),
        SiteSection(slug="memorial-places", title="Памятные места", items=["Кладбища Иркутской области", "Польза", "Примеры", "Преимущества"]),
        SiteSection(slug="honorable-citizens", title="Почетные граждане", items=["Кто относится", "Примеры", "Вопросы"]),
        SiteSection(slug="family-tree", title="Генеалогическое древо", items=["Пример", "Преимущества", "Как создать"]),
        SiteSection(slug="services", title="Услуги", items=["Генерация QR", "Изготовление QR", "Поиск места", "Уборка и уход", "Каталог памятников", "Гравировка", "Оградки", "Плитка", "Доп. принадлежности", "Благоустройство"]),
        SiteSection(slug="technical", title="Техническая информация", items=["Реквизиты", "Соглашение обработки персональных данных", "Условия оплаты/возврата", "Договор-оферта"]),
        SiteSection(slug="support", title="Техническая поддержка", items=["Написать нам", "Заказать звонок", "Позвонить"]),
        SiteSection(slug="social", title="Социальные сети", items=["VK", "Telegram", "YouTube"]),
    ]
    return SiteMapResponse(sections=sections)
