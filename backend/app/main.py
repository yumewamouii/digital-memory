import io
import logging
from pathlib import Path

import qrcode
from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .auth import get_current_user
from .config import get_settings
from .database import engine, get_db
from .models import MemorialCard, User
from .routers import auth as auth_router
from .routers import trees as trees_router
from .schema_upgrade import upgrade_schema
from .schemas import (
    MemorialCardCreate,
    MemorialCardOut,
    SiteMapResponse,
    SiteSection,
)

logging.basicConfig(level=logging.INFO)

settings = get_settings()
upgrade_schema(engine)

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MEDIA_DIR = Path(__file__).resolve().parents[1] / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

app.include_router(auth_router.router)
app.include_router(trees_router.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


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

    public_url = f"{settings.public_frontend_url.rstrip('/')}/memory/example"
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
