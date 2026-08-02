from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr | None = None
    phone: str | None = None
    full_name: str
    email_verified: bool = False
    phone_verified: bool = False
    has_password: bool = False
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PhoneRequestCode(BaseModel):
    phone: str = Field(min_length=10, max_length=32)
    purpose: Literal["register", "login"]


class PhoneVerify(BaseModel):
    phone: str = Field(min_length=10, max_length=32)
    code: str = Field(min_length=4, max_length=12)
    full_name: str | None = Field(default=None, min_length=2, max_length=255)


class PasswordForgot(BaseModel):
    email: EmailStr | None = None
    phone: str | None = None

    @model_validator(mode="after")
    def require_one_contact(self):
        if bool(self.email) == bool(self.phone):
            raise ValueError("Укажите либо email, либо телефон")
        return self


class PasswordReset(BaseModel):
    email: EmailStr | None = None
    phone: str | None = None
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def require_one_contact(self):
        if bool(self.email) == bool(self.phone):
            raise ValueError("Укажите либо email, либо телефон")
        return self


class PasswordChangeRequest(BaseModel):
    channel: Literal["email", "phone"]


class PasswordChangeConfirm(BaseModel):
    channel: Literal["email", "phone"]
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=8, max_length=128)


class OAuthStartResponse(BaseModel):
    redirect_url: str
    state: str


class OAuthProvidersResponse(BaseModel):
    providers: list[str]


class MessageResponse(BaseModel):
    message: str


class MemorialCardCreate(BaseModel):
    first_name: str
    last_name: str
    middle_name: str | None = None
    birth_date: date | None = None
    death_date: date | None = None
    biography: str | None = None
    photo_url: str | None = None
    cemetery_name: str | None = None
    cemetery_location: str | None = None


class MemorialCardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    first_name: str
    last_name: str
    middle_name: str | None
    birth_date: date | None
    death_date: date | None
    biography: str | None
    photo_url: str | None
    cemetery_name: str | None
    cemetery_location: str | None
    created_at: datetime


class FamilyTreeCreate(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    description: str | None = None
    tree_json: str | None = None  # legacy optional


class FamilyTreeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    visibility: Literal["private", "link", "public"] | None = None
    tree_json: str | None = None


class AltNameIn(BaseModel):
    name_type: str = "aka"
    first_name: str = ""
    last_name: str = ""
    middle_name: str = ""


class PersonCreate(BaseModel):
    first_name: str = ""
    last_name: str = ""
    middle_name: str = ""
    gender: str = ""
    birth_date: date | None = None
    death_date: date | None = None
    birth_place: str | None = None
    death_place: str | None = None
    note: str | None = None
    is_deceased: bool = False
    alt_names: list[AltNameIn] = []


class PersonUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    gender: str | None = None
    birth_date: date | None = None
    death_date: date | None = None
    birth_place: str | None = None
    death_place: str | None = None
    note: str | None = None
    is_deceased: bool | None = None
    x: float | None = None
    y: float | None = None
    alt_names: list[AltNameIn] | None = None


class RelativeCreate(BaseModel):
    relation: Literal["parent", "child", "spouse", "sibling"]
    gender: str = ""
    last_name: str | None = None


class LayoutUpdateItem(BaseModel):
    person_id: int
    x: float
    y: float


class LayoutUpdate(BaseModel):
    items: list[LayoutUpdateItem]


class CollaboratorInvite(BaseModel):
    email: EmailStr
    role: Literal["editor", "viewer"] = "editor"


class FamilyTreeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int | None = None
    title: str
    description: str | None = None
    share_slug: str | None = None
    visibility: str = "private"
    person_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None
    # legacy clients
    tree_json: str | None = None


class SiteSection(BaseModel):
    slug: str
    title: str
    items: list[str]


class SiteMapResponse(BaseModel):
    sections: list[SiteSection]
