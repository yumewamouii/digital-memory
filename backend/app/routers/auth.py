from __future__ import annotations

from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..auth import create_access_token, get_current_user, get_password_hash, verify_password
from ..config import get_settings
from ..database import get_db
from ..domain.enums import RoleCode
from ..models import User
from ..rbac.bootstrap import ensure_super_admin_from_env
from ..rbac.service import assign_role_if_missing
from ..rbac.user_payload import build_user_out
from ..schemas import (
    MessageResponse,
    OAuthProvidersResponse,
    OAuthStartResponse,
    PasswordChangeConfirm,
    PasswordChangeRequest,
    PasswordForgot,
    PasswordReset,
    PhoneRequestCode,
    PhoneVerify,
    TokenResponse,
    UserCreate,
    UserOut,
)
from ..services import oauth_providers
from ..services.otp import (
    PURPOSE_CHANGE_EMAIL,
    PURPOSE_CHANGE_PHONE,
    PURPOSE_PHONE_LOGIN,
    PURPOSE_PHONE_REGISTER,
    PURPOSE_RESET_EMAIL,
    PURPOSE_RESET_PHONE,
    create_and_send_code,
    normalize_phone,
    verify_code,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


def _token_for_user(user: User) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(subject=str(user.id)))


def _find_or_link_oauth_user(db: Session, profile: oauth_providers.OAuthProfile) -> User:
    id_field = {
        "google": User.google_id,
        "vk": User.vk_id,
        "mailru": User.mailru_id,
    }[profile.provider]

    user = db.query(User).filter(id_field == profile.provider_user_id).first()
    if user:
        return user

    if profile.email:
        user = db.query(User).filter(User.email == profile.email).first()
        if user:
            # Never auto-link on unverified OAuth emails (account takeover risk).
            if not profile.email_verified:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Email от соцсети не подтверждён. Войдите паролем "
                        "или подтвердите email у провайдера."
                    ),
                )
            setattr(user, f"{profile.provider}_id", profile.provider_user_id)
            user.email_verified = True
            db.commit()
            db.refresh(user)
            return user

    user = User(
        email=profile.email,
        full_name=None,
        password_hash=None,
        email_verified=profile.email_verified if profile.email else False,
        **{f"{profile.provider}_id": profile.provider_user_id},
    )
    db.add(user)
    db.flush()
    assign_role_if_missing(db, user, RoleCode.USER)
    db.commit()
    db.refresh(user)
    return user


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким email уже зарегистрирован",
        )

    user = User(
        email=payload.email,
        full_name=None,
        password_hash=get_password_hash(payload.password),
        email_verified=False,
    )
    db.add(user)
    db.flush()
    assign_role_if_missing(db, user, RoleCode.USER)
    db.commit()
    db.refresh(user)
    return build_user_out(db, user)


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Uniform error text to avoid email / auth-method enumeration.
    invalid = HTTPException(status_code=401, detail="Неверный email или пароль")
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.password_hash:
        raise invalid
    if not verify_password(form_data.password, user.password_hash):
        raise invalid
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Аккаунт деактивирован")

    return _token_for_user(user)


@router.get("/me", response_model=UserOut)
def me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from ..models import UserRole

    has_any_role = db.query(UserRole).filter(UserRole.user_id == current_user.id).first()
    if not has_any_role:
        assign_role_if_missing(db, current_user, RoleCode.USER)
        db.commit()
    ensure_super_admin_from_env(db, current_user)
    return build_user_out(db, current_user)


@router.post("/phone/request-code", response_model=MessageResponse)
def phone_request_code(payload: PhoneRequestCode, db: Session = Depends(get_db)):
    phone = normalize_phone(payload.phone)
    existing = db.query(User).filter(User.phone == phone).first()

    if payload.purpose == "register":
        if existing:
            raise HTTPException(status_code=400, detail="Пользователь с таким телефоном уже зарегистрирован")
        purpose = PURPOSE_PHONE_REGISTER
    else:
        if not existing:
            raise HTTPException(status_code=404, detail="Пользователь с таким телефоном не найден")
        purpose = PURPOSE_PHONE_LOGIN

    create_and_send_code(
        db,
        purpose=purpose,
        target=phone,
        user_id=existing.id if existing else None,
        channel="sms",
    )
    return MessageResponse(message="Код отправлен")


@router.post("/phone/verify", response_model=TokenResponse)
def phone_verify(payload: PhoneVerify, db: Session = Depends(get_db)):
    phone = normalize_phone(payload.phone)
    existing = db.query(User).filter(User.phone == phone).first()

    if existing:
        verify_code(db, purpose=PURPOSE_PHONE_LOGIN, target=phone, code=payload.code, user_id=existing.id)
        if not existing.is_active:
            raise HTTPException(status_code=403, detail="Аккаунт деактивирован")
        existing.phone_verified = True
        db.commit()
        return _token_for_user(existing)

    verify_code(db, purpose=PURPOSE_PHONE_REGISTER, target=phone, code=payload.code)

    user = User(
        phone=phone,
        full_name=None,
        password_hash=None,
        phone_verified=True,
    )
    db.add(user)
    db.flush()
    assign_role_if_missing(db, user, RoleCode.USER)
    db.commit()
    db.refresh(user)
    return _token_for_user(user)


@router.post("/password/forgot", response_model=MessageResponse)
def password_forgot(payload: PasswordForgot, db: Session = Depends(get_db)):
    if payload.email:
        user = db.query(User).filter(User.email == payload.email).first()
        if not user:
            return MessageResponse(message="Если аккаунт существует, код отправлен")
        create_and_send_code(
            db,
            purpose=PURPOSE_RESET_EMAIL,
            target=str(payload.email),
            user_id=user.id,
            channel="email",
        )
        return MessageResponse(message="Если аккаунт существует, код отправлен")

    phone = normalize_phone(payload.phone or "")
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        return MessageResponse(message="Если аккаунт существует, код отправлен")
    create_and_send_code(
        db,
        purpose=PURPOSE_RESET_PHONE,
        target=phone,
        user_id=user.id,
        channel="sms",
    )
    return MessageResponse(message="Если аккаунт существует, код отправлен")


@router.post("/password/reset", response_model=MessageResponse)
def password_reset(payload: PasswordReset, db: Session = Depends(get_db)):
    if payload.email:
        user = db.query(User).filter(User.email == payload.email).first()
        if not user:
            raise HTTPException(status_code=400, detail="Неверный код или контакт")
        verify_code(
            db,
            purpose=PURPOSE_RESET_EMAIL,
            target=str(payload.email),
            code=payload.code,
            user_id=user.id,
        )
        user.password_hash = get_password_hash(payload.new_password)
        user.email_verified = True
        db.commit()
        return MessageResponse(message="Пароль обновлён")

    phone = normalize_phone(payload.phone or "")
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(status_code=400, detail="Неверный код или контакт")
    verify_code(
        db,
        purpose=PURPOSE_RESET_PHONE,
        target=phone,
        code=payload.code,
        user_id=user.id,
    )
    user.password_hash = get_password_hash(payload.new_password)
    user.phone_verified = True
    db.commit()
    return MessageResponse(message="Пароль обновлён")


@router.post("/password/change/request", response_model=MessageResponse)
def password_change_request(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.channel == "email":
        if not current_user.email:
            raise HTTPException(status_code=400, detail="К аккаунту не привязан email")
        create_and_send_code(
            db,
            purpose=PURPOSE_CHANGE_EMAIL,
            target=current_user.email,
            user_id=current_user.id,
            channel="email",
        )
        return MessageResponse(message="Код отправлен на email")

    if not current_user.phone:
        raise HTTPException(status_code=400, detail="К аккаунту не привязан телефон")
    create_and_send_code(
        db,
        purpose=PURPOSE_CHANGE_PHONE,
        target=current_user.phone,
        user_id=current_user.id,
        channel="sms",
    )
    return MessageResponse(message="Код отправлен по SMS")


@router.post("/password/change/confirm", response_model=MessageResponse)
def password_change_confirm(
    payload: PasswordChangeConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.channel == "email":
        if not current_user.email:
            raise HTTPException(status_code=400, detail="К аккаунту не привязан email")
        verify_code(
            db,
            purpose=PURPOSE_CHANGE_EMAIL,
            target=current_user.email,
            code=payload.code,
            user_id=current_user.id,
        )
    else:
        if not current_user.phone:
            raise HTTPException(status_code=400, detail="К аккаунту не привязан телефон")
        verify_code(
            db,
            purpose=PURPOSE_CHANGE_PHONE,
            target=current_user.phone,
            code=payload.code,
            user_id=current_user.id,
        )

    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    return MessageResponse(message="Пароль обновлён")


@router.get("/oauth/providers", response_model=OAuthProvidersResponse)
def oauth_providers_list():
    return OAuthProvidersResponse(providers=oauth_providers.configured_providers())


@router.get("/oauth/{provider}/start", response_model=OAuthStartResponse)
def oauth_start(provider: str):
    data = oauth_providers.build_authorize_url(provider)
    return OAuthStartResponse(**data)


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str | None = None,
    state: str | None = None,
    db: Session = Depends(get_db),
):
    frontend = settings.public_frontend_url.rstrip("/")
    if not code or not state:
        return RedirectResponse(f"{frontend}/auth/callback?error=missing_code")

    try:
        oauth_providers.consume_state(state, provider)
        profile = await oauth_providers.exchange_code(provider, code)
        user = _find_or_link_oauth_user(db, profile)
        token = create_access_token(subject=str(user.id))
        return RedirectResponse(f"{frontend}/auth/callback#{urlencode({'token': token})}")
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else "oauth_error"
        return RedirectResponse(f"{frontend}/auth/callback?{urlencode({'error': detail})}")
    except Exception:
        return RedirectResponse(f"{frontend}/auth/callback?error=oauth_failed")
