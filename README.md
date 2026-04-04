# Digital Memory MVP

MVP-платформа цифрового мемориала с разделением на:

- **Frontend:** React.js (Vite)
- **Backend:** FastAPI + SQLite

## Что реализовано

- Регистрация и авторизация пользователей (JWT).
- Создание карточек памяти умерших людей.
- Создание генеалогического древа (JSON-структура).
- Генерация QR-кода для перехода к карточке памяти.
- Карта сайта на главной странице, отражающая разделы из ТЗ.

## Структура

- `frontend/` — клиентское приложение на React.
- `backend/` — API и бизнес-логика на FastAPI.

## Быстрый запуск

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend ожидает API по адресу `http://localhost:8000/api`.
