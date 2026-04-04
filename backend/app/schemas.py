from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


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
    tree_json: str = Field(description="JSON-stringified tree data")


class FamilyTreeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    title: str
    description: str | None
    tree_json: str
    created_at: datetime


class SiteSection(BaseModel):
    slug: str
    title: str
    items: list[str]


class SiteMapResponse(BaseModel):
    sections: list[SiteSection]
