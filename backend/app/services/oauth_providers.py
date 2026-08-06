from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import SessionLocal
from ..models import OAuthState

STATE_TTL_SECONDS = 600


@dataclass
class OAuthProfile:
    provider: str
    provider_user_id: str
    email: str | None
    full_name: str
    email_verified: bool = False


PROVIDERS = ("google", "vk", "mailru")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _cleanup_states(db: Session) -> None:
    db.query(OAuthState).filter(OAuthState.expires_at < _utcnow()).delete(
        synchronize_session=False
    )


def create_state(provider: str) -> str:
    db = SessionLocal()
    try:
        _cleanup_states(db)
        state = secrets.token_urlsafe(24)
        db.add(
            OAuthState(
                state=state,
                provider=provider,
                expires_at=_utcnow() + timedelta(seconds=STATE_TTL_SECONDS),
            )
        )
        db.commit()
        return state
    finally:
        db.close()


def consume_state(state: str, provider: str) -> None:
    db = SessionLocal()
    try:
        _cleanup_states(db)
        row = db.query(OAuthState).filter(OAuthState.state == state).first()
        if not row or row.provider != provider:
            raise HTTPException(status_code=400, detail="Некорректный OAuth state")
        expires = row.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < _utcnow():
            db.delete(row)
            db.commit()
            raise HTTPException(status_code=400, detail="Некорректный OAuth state")
        db.delete(row)
        db.commit()
    finally:
        db.close()


def provider_configured(provider: str) -> bool:
    settings = get_settings()
    if provider == "google":
        return bool(settings.google_client_id and settings.google_client_secret)
    if provider == "vk":
        return bool(settings.vk_client_id and settings.vk_client_secret)
    if provider == "mailru":
        return bool(settings.mailru_client_id and settings.mailru_client_secret)
    return False


def configured_providers() -> list[str]:
    return [name for name in PROVIDERS if provider_configured(name)]


def callback_url(provider: str) -> str:
    settings = get_settings()
    base = settings.oauth_redirect_base.rstrip("/")
    return f"{base}/api/auth/oauth/{provider}/callback"


def build_authorize_url(provider: str) -> dict[str, str]:
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown OAuth provider")
    if not provider_configured(provider):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"OAuth провайдер {provider} не настроен",
        )

    settings = get_settings()
    state = create_state(provider)
    redirect_uri = callback_url(provider)

    if provider == "google":
        params = {
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "online",
            "include_granted_scopes": "true",
            "state": state,
            "prompt": "select_account",
        }
        url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        return {"redirect_url": url, "state": state}

    if provider == "vk":
        params = {
            "client_id": settings.vk_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "email",
            "state": state,
            "v": "5.199",
        }
        url = f"https://oauth.vk.com/authorize?{urlencode(params)}"
        return {"redirect_url": url, "state": state}

    params = {
        "client_id": settings.mailru_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "userinfo",
        "state": state,
    }
    url = f"https://oauth.mail.ru/login?{urlencode(params)}"
    return {"redirect_url": url, "state": state}


async def exchange_code(provider: str, code: str) -> OAuthProfile:
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown OAuth provider")
    if not provider_configured(provider):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"OAuth провайдер {provider} не настроен",
        )

    settings = get_settings()
    redirect_uri = callback_url(provider)

    async with httpx.AsyncClient(timeout=20.0) as client:
        if provider == "google":
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code >= 400:
                raise HTTPException(status_code=400, detail="Не удалось обменять код Google")
            access_token = token_resp.json().get("access_token")
            info_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if info_resp.status_code >= 400:
                raise HTTPException(status_code=400, detail="Не удалось получить профиль Google")
            info = info_resp.json()
            return OAuthProfile(
                provider="google",
                provider_user_id=str(info["sub"]),
                email=info.get("email"),
                full_name=info.get("name") or info.get("email") or "Google User",
                email_verified=bool(info.get("email_verified")),
            )

        if provider == "vk":
            token_resp = await client.get(
                "https://oauth.vk.com/access_token",
                params={
                    "client_id": settings.vk_client_id,
                    "client_secret": settings.vk_client_secret,
                    "redirect_uri": redirect_uri,
                    "code": code,
                },
            )
            if token_resp.status_code >= 400:
                raise HTTPException(status_code=400, detail="Не удалось обменять код VK")
            token_data = token_resp.json()
            if "error" in token_data:
                raise HTTPException(status_code=400, detail="Не удалось обменять код VK")
            access_token = token_data["access_token"]
            user_id = str(token_data["user_id"])
            email = token_data.get("email")
            info_resp = await client.get(
                "https://api.vk.com/method/users.get",
                params={
                    "access_token": access_token,
                    "user_ids": user_id,
                    "fields": "first_name,last_name",
                    "v": "5.199",
                },
            )
            info_data = info_resp.json()
            user_info = (info_data.get("response") or [{}])[0]
            full_name = (
                f"{user_info.get('first_name', '')} {user_info.get('last_name', '')}".strip()
                or f"VK User {user_id}"
            )
            return OAuthProfile(
                provider="vk",
                provider_user_id=user_id,
                email=email,
                full_name=full_name,
                email_verified=bool(email),
            )

        token_resp = await client.post(
            "https://oauth.mail.ru/token",
            data={
                "code": code,
                "client_id": settings.mailru_client_id,
                "client_secret": settings.mailru_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code >= 400:
            raise HTTPException(status_code=400, detail="Не удалось обменять код Mail.ru")
        access_token = token_resp.json().get("access_token")
        info_resp = await client.get(
            "https://oauth.mail.ru/userinfo",
            params={"access_token": access_token},
        )
        if info_resp.status_code >= 400:
            raise HTTPException(status_code=400, detail="Не удалось получить профиль Mail.ru")
        info = info_resp.json()
        full_name = info.get("name") or info.get("nickname") or info.get("email") or "Mail.ru User"
        return OAuthProfile(
            provider="mailru",
            provider_user_id=str(info.get("id") or info.get("email")),
            email=info.get("email"),
            full_name=full_name,
            email_verified=bool(info.get("email")),
        )
