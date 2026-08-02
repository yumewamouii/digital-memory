from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import AuthCode
from .notify import send_email, send_sms

OTP_TTL_MINUTES = 10
OTP_RESEND_SECONDS = 60
OTP_MAX_ATTEMPTS = 5

PURPOSE_PHONE_REGISTER = "phone_register"
PURPOSE_PHONE_LOGIN = "phone_login"
PURPOSE_RESET_EMAIL = "reset_email"
PURPOSE_RESET_PHONE = "reset_phone"
PURPOSE_CHANGE_EMAIL = "change_email"
PURPOSE_CHANGE_PHONE = "change_phone"


def normalize_phone(phone: str) -> str:
    raw = (phone or "").strip()
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 11 and digits.startswith("8"):
        digits = "7" + digits[1:]
    if len(digits) == 11 and digits.startswith("7"):
        return f"+{digits}"
    if len(digits) == 10:
        return f"+7{digits}"
    raise HTTPException(status_code=400, detail="Укажите корректный номер телефона")


def generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_code(code: str) -> str:
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_and_send_code(
    db: Session,
    *,
    purpose: str,
    target: str,
    user_id: int | None = None,
    channel: str,
) -> AuthCode:
    now = _utcnow()
    recent = (
        db.query(AuthCode)
        .filter(
            AuthCode.purpose == purpose,
            AuthCode.target == target,
            AuthCode.consumed_at.is_(None),
        )
        .order_by(AuthCode.created_at.desc())
        .first()
    )
    if recent and recent.created_at:
        created = recent.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if (now - created).total_seconds() < OTP_RESEND_SECONDS:
            wait = int(OTP_RESEND_SECONDS - (now - created).total_seconds())
            raise HTTPException(
                status_code=429,
                detail=f"Повторная отправка доступна через {wait} сек.",
            )

    code = generate_code()
    auth_code = AuthCode(
        purpose=purpose,
        target=target,
        code_hash=hash_code(code),
        user_id=user_id,
        expires_at=now + timedelta(minutes=OTP_TTL_MINUTES),
        attempts=0,
    )
    db.add(auth_code)
    db.commit()
    db.refresh(auth_code)

    message = f"Ваш код подтверждения ГисМемориал: {code}. Действует {OTP_TTL_MINUTES} мин."
    if channel == "email":
        send_email(target, "Код подтверждения ГисМемориал", message)
    elif channel == "sms":
        send_sms(target, message)
    else:
        raise HTTPException(status_code=500, detail="Unknown notification channel")

    return auth_code


def verify_code(
    db: Session,
    *,
    purpose: str,
    target: str,
    code: str,
    user_id: int | None = None,
) -> AuthCode:
    now = _utcnow()
    query = (
        db.query(AuthCode)
        .filter(
            AuthCode.purpose == purpose,
            AuthCode.target == target,
            AuthCode.consumed_at.is_(None),
        )
        .order_by(AuthCode.created_at.desc())
    )
    if user_id is not None:
        query = query.filter(AuthCode.user_id == user_id)

    auth_code = query.first()
    if not auth_code:
        raise HTTPException(status_code=400, detail="Код не найден или уже использован")

    expires = auth_code.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        raise HTTPException(status_code=400, detail="Срок действия кода истёк")

    if auth_code.attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Превышено число попыток ввода кода")

    if hash_code(code) != auth_code.code_hash:
        auth_code.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Неверный код")

    auth_code.consumed_at = now
    db.commit()
    db.refresh(auth_code)
    return auth_code
