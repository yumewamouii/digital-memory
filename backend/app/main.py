import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .admin.router import router as admin_router
from .config import get_settings
from .database import engine
from .memorials.router import router as memorials_router
from .organizations.router import router as organizations_router
from .routers import auth as auth_router
from .routers import media as media_router
from .routers import trees as trees_router
from .schema_upgrade import upgrade_schema
from .schemas import SiteMapResponse, SiteSection
from .services.uploads import MEDIA_DIR

logging.basicConfig(level=logging.INFO)

settings = get_settings()
upgrade_schema(engine)

app = FastAPI(title=settings.app_name, version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Media is served only via signed /api/media/... (no world-readable StaticFiles).
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

app.include_router(auth_router.router)
app.include_router(media_router.router)
app.include_router(trees_router.router)
app.include_router(memorials_router)
app.include_router(organizations_router)
app.include_router(admin_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


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
