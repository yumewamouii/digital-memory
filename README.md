# Digital Memory MVP

MVP-платформа цифрового мемориала:

- **Frontend:** React (Vite)
- **Backend:** FastAPI + SQLite

Репозиторий: https://github.com/yumewamouii/digital-memory

## Что реализовано

- Регистрация и авторизация (JWT)
- Карточки памяти (краткая / расширенная)
- Генеалогическое древо
- QR-код страницы памяти
- Карта с выбором точки (Иркутск)

## Локальный запуск

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Проверка: http://localhost:8000/api/health

### Frontend

```bash
cd frontend
npm install
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # macOS/Linux
npm run dev
```

Откройте http://localhost:5173 — API по умолчанию `http://localhost:8000/api`.

## Полный деплой (API + сайт)

Схема:

| Часть | Куда |
|-------|------|
| Backend API | [Render](https://render.com) (бесплатный Web Service) |
| Frontend | GitHub Pages (автодеплой из Actions) |

### 1. Залейте код на GitHub

```bash
git add .
git commit -m "Prepare production deploy"
git push origin main
```

### 2. Backend на Render

1. Зарегистрируйтесь на https://render.com и подключите GitHub.
2. **New → Blueprint** → выберите репозиторий `digital-memory` (есть `render.yaml`).
   Либо **New → Web Service** вручную:
   - Root Directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Environment variables:

| Variable | Example |
|----------|---------|
| `SECRET_KEY` | случайная длинная строка (Render может сгенерировать) |
| `DATABASE_URL` | `sqlite:///./digital_memory.db` |
| `CORS_ORIGINS` | `https://yumewamouii.github.io` |
| `PUBLIC_FRONTEND_URL` | `https://yumewamouii.github.io/digital-memory` |

4. После деплоя скопируйте URL API, например:
   `https://digital-memory-api.onrender.com`

Проверка: `https://<your-api>.onrender.com/api/health`

> На бесплатном плане Render сервис «засыпает» без трафика (~50 с на первый запрос).  
> SQLite на free-плане **не сохраняется навсегда** между пересборками — для продакшена позже лучше Postgres (Neon/Supabase) через `DATABASE_URL`.

### 3. Frontend на GitHub Pages

1. В репозитории GitHub: **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret:**
   - Name: `VITE_API_URL`
   - Value: `https://<your-api>.onrender.com/api`
3. Workflow `.github/workflows/deploy-frontend.yml` соберёт фронт и задеплоит на Pages при пуше в `main`.
4. Сайт будет по адресу:
   **https://yumewamouii.github.io/digital-memory/**

5. В Render обновите `CORS_ORIGINS` / `PUBLIC_FRONTEND_URL`, если URL отличаются, и сделайте **Manual Deploy**.

### 4. Порядок первого запуска

1. Задеплоить API на Render → получить URL.
2. Добавить секрет `VITE_API_URL`.
3. Push в `main` или запустить workflow **Deploy frontend to GitHub Pages** вручную (**Actions → Run workflow**).
4. Проверить регистрацию/вход на сайте.

## Переменные окружения

### Backend (`backend/.env`)

| Переменная | Назначение |
|------------|------------|
| `SECRET_KEY` | Секрет JWT |
| `DATABASE_URL` | SQLite или Postgres |
| `CORS_ORIGINS` | Домены фронта через запятую |
| `PUBLIC_FRONTEND_URL` | Базовый URL сайта (для QR) |

### Frontend

| Переменная | Назначение |
|------------|------------|
| `VITE_API_URL` | URL API, например `https://xxx.onrender.com/api` |
| `VITE_BASE` | Базовый путь (`/digital-memory/` на Pages) |

## Структура

- `frontend/` — React-приложение
- `backend/` — FastAPI
- `render.yaml` — Blueprint для Render
- `.github/workflows/deploy-frontend.yml` — деплой на GitHub Pages
