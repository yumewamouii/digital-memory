# ГисМемориал

Платформа цифрового мемориала и семейной истории:

- **Frontend:** React (Vite)
- **Backend:** FastAPI + SQLite (локально; на Pages не нужен)

Репозиторий: https://github.com/yumewamouii/digital-memory

## Деплой только фронтенда на GitHub Pages

Бэкенд деплоить не нужно. Сайт будет статическим:
**https://yumewamouii.github.io/digital-memory/**

> Без API не будут работать регистрация, личный кабинет и создание карточек — остальной сайт (страницы, примеры, витрина) откроется нормально.

### Шаги (один раз)

1. Откройте репозиторий на GitHub → **Settings → Pages**.
2. **Build and deployment → Source:** выберите **GitHub Actions** (не «Deploy from a branch»).
3. Откройте вкладку **Actions**.
4. Слева выберите **Deploy frontend to GitHub Pages**.
5. **Run workflow** → Branch `main` → **Run workflow**.
6. Дождитесь зелёной галочки (1–3 минуты).
7. Откройте: https://yumewamouii.github.io/digital-memory/

Дальше сайт будет обновляться сам при каждом push в `main`, если менялись файлы в `frontend/`.  
Либо снова запускайте workflow вручную (**Actions → Run workflow**).

## Локальный запуск

### Frontend

```bash
cd frontend
npm install
npm run dev
```

http://localhost:5173

### Backend (только если нужен API локально)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

В `frontend` API по умолчанию: `http://localhost:8080/api` (см. `.env.example`).

### Авторизация (локально)

- Email/пароль, телефон (OTP), восстановление и смена пароля.
- SMS и письма в режиме разработки пишутся в **лог backend** (`NOTIFICATION_BACKEND=log`). Код вида `Ваш код подтверждения…` ищите в консоли `uvicorn`.
- OAuth (Google, VK, Mail.ru): заполните `*_CLIENT_ID` / `*_CLIENT_SECRET` и `OAUTH_REDIRECT_BASE` в `backend/.env` (см. `.env.example`). Без ключей кнопки соцсетей скрыты.
- Redirect URI для провайдеров: `{OAUTH_REDIRECT_BASE}/api/auth/oauth/{google|vk|mailru}/callback`.

## Структура

- `frontend/` — React-приложение (деплоится на Pages)
- `backend/` — FastAPI (локально)
- `.github/workflows/deploy-frontend.yml` — автодеплой фронта
- `render.yaml` — опционально, если позже захотите API на Render
