from datetime import date, datetime
from typing import Generic, Literal, TypeVar
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from .services.partial_dates import normalize_partial_date

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


def _coerce_partial_date(value: object) -> str | None:
    if value is None or value == "":
        return None
    return normalize_partial_date(value if isinstance(value, (str, date)) else str(value))


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class OrganizationBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    logo: str | None = None
    subscription_plan: str = "free"
    subscription_status: str = "active"
    member_role: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr | None = None
    phone: str | None = None
    full_name: str | None = None
    email_verified: bool = False
    phone_verified: bool = False
    has_password: bool = False
    is_active: bool = True
    created_at: datetime
    roles: list[str] = []
    permissions: list[str] = []
    organization: OrganizationBrief | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PhoneRequestCode(BaseModel):
    phone: str = Field(min_length=10, max_length=32)
    purpose: Literal["register", "login"]


class PhoneVerify(BaseModel):
    phone: str = Field(min_length=10, max_length=32)
    code: str = Field(min_length=4, max_length=12)


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


class MemorialRelativeOut(BaseModel):
    role: str
    name: str


class MemorialExternalLink(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    url: str = Field(min_length=1, max_length=1000)

    @field_validator("url")
    @classmethod
    def only_http_https(cls, value: str) -> str:
        url = (value or "").strip()
        parsed = urlparse(url)
        if parsed.scheme.lower() not in ("http", "https") or not parsed.netloc:
            raise ValueError("Ссылка должна начинаться с http:// или https://")
        return url


class MemorialGalleryImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    caption: str | None = None
    sort_order: int = 0


class MemorialVideoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    url: str
    embed_url: str | None = None
    title: str | None = None
    sort_order: int = 0


class MemorialVideoLinkCreate(BaseModel):
    url: str = Field(min_length=1, max_length=1000)
    title: str | None = Field(default=None, max_length=255)


class MemorialAudioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    title: str | None = None
    sort_order: int = 0


class MemorialDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    title: str | None = None
    category: str = "other"
    original_name: str | None = None
    sort_order: int = 0


class MemorialCardCreate(BaseModel):
    first_name: str
    last_name: str
    middle_name: str | None = None
    birth_date: date | None = None
    death_date: date | None = None
    birth_place: str | None = None
    birth_lat: float | None = None
    birth_lng: float | None = None
    death_place: str | None = None
    death_lat: float | None = None
    death_lng: float | None = None
    life_status: Literal["unknown", "alive", "deceased"] | None = None
    epitaph: str | None = None
    short_description: str | None = Field(default=None, max_length=160)
    relatives_text: str | None = None
    biography: str | None = None
    photo_url: str | None = None
    cemetery_name: str | None = None
    cemetery_location: str | None = None
    cemetery_lat: float | None = None
    cemetery_lng: float | None = None
    page_kind: Literal["brief", "extended"] | None = None
    guestbook_enabled: bool | None = None
    metal_plaque: bool | None = None
    external_links: list[MemorialExternalLink] | None = None
    visibility: Literal["private", "unlisted", "public"] | None = None
    status: Literal["draft", "published", "archived"] | None = None
    organization_id: int | None = None
    owner_id: int | None = None


class MemorialCardUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    birth_date: date | None = None
    death_date: date | None = None
    birth_place: str | None = None
    birth_lat: float | None = None
    birth_lng: float | None = None
    death_place: str | None = None
    death_lat: float | None = None
    death_lng: float | None = None
    life_status: Literal["unknown", "alive", "deceased"] | None = None
    epitaph: str | None = None
    short_description: str | None = Field(default=None, max_length=160)
    relatives_text: str | None = None
    biography: str | None = None
    photo_url: str | None = None
    cemetery_name: str | None = None
    cemetery_location: str | None = None
    cemetery_lat: float | None = None
    cemetery_lng: float | None = None
    page_kind: Literal["brief", "extended"] | None = None
    guestbook_enabled: bool | None = None
    metal_plaque: bool | None = None
    external_links: list[MemorialExternalLink] | None = None
    visibility: Literal["private", "unlisted", "public"] | None = None
    status: Literal["draft", "published", "archived"] | None = None


class MemorialCardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    created_by: int | None = None
    organization_id: int | None = None
    first_name: str
    last_name: str
    middle_name: str | None
    birth_date: date | None
    death_date: date | None
    birth_place: str | None = None
    birth_lat: float | None = None
    birth_lng: float | None = None
    death_place: str | None = None
    death_lat: float | None = None
    death_lng: float | None = None
    life_status: str = "unknown"
    epitaph: str | None = None
    short_description: str | None = None
    relatives_text: str | None = None
    biography: str | None
    photo_url: str | None
    cemetery_name: str | None
    cemetery_location: str | None
    cemetery_lat: float | None = None
    cemetery_lng: float | None = None
    page_kind: str = "brief"
    guestbook_enabled: bool = False
    metal_plaque: bool = False
    external_links: list[MemorialExternalLink] = []
    gallery: list[MemorialGalleryImageOut] = []
    videos: list[MemorialVideoOut] = []
    audio: list[MemorialAudioOut] = []
    documents: list[MemorialDocumentOut] = []
    visibility: str = "private"
    status: str = "published"
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None
    can_edit: bool = False
    can_delete: bool = False
    can_transfer: bool = False
    can_assign_owner: bool = False
    # Link back to genealogical tree when this memorial is tied to a tree person
    family_tree_id: int | None = None
    family_tree_title: str | None = None
    tree_person_id: int | None = None
    family_tree_can_edit: bool = False
    relatives: list[MemorialRelativeOut] = []


class MemorialCardPage(Page[MemorialCardOut]):
    pass


class MemorialTransferRequest(BaseModel):
    new_owner_id: int


class MemorialAssignOwnerRequest(BaseModel):
    owner_id: int


class OwnershipClaimCreate(BaseModel):
    message: str | None = Field(default=None, max_length=2000)


class OwnershipClaimReview(BaseModel):
    approve: bool
    message: str | None = None


class OwnershipClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    memorial_id: int
    requester_id: int
    message: str | None = None
    status: str
    reviewed_by: int | None = None
    reviewed_at: datetime | None = None
    created_at: datetime


class MemorialReportCreate(BaseModel):
    reason: Literal[
        "false_info",
        "profanity",
        "offensive",
        "nsfw_photo",
        "other",
    ]
    message: str | None = Field(default=None, max_length=2000)


class MemorialReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    memorial_id: int
    reporter_id: int
    reason: str
    message: str | None = None
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
    birth_date: str | None = None
    death_date: str | None = None
    birth_place: str | None = None
    birth_lat: float | None = None
    birth_lng: float | None = None
    death_place: str | None = None
    death_lat: float | None = None
    death_lng: float | None = None
    burial_place: str | None = None
    burial_lat: float | None = None
    burial_lng: float | None = None
    note: str | None = None
    life_status: Literal["unknown", "alive", "deceased"] | None = None
    is_deceased: bool | None = None
    alt_names: list[AltNameIn] = []

    @field_validator("birth_date", "death_date", mode="before")
    @classmethod
    def _validate_partial_dates(cls, value: object) -> str | None:
        return _coerce_partial_date(value)


class PersonUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    gender: str | None = None
    birth_date: str | None = None
    death_date: str | None = None
    birth_place: str | None = None
    birth_lat: float | None = None
    birth_lng: float | None = None
    death_place: str | None = None
    death_lat: float | None = None
    death_lng: float | None = None
    burial_place: str | None = None
    burial_lat: float | None = None
    burial_lng: float | None = None
    note: str | None = None
    life_status: Literal["unknown", "alive", "deceased"] | None = None
    is_deceased: bool | None = None
    x: float | None = None
    y: float | None = None
    alt_names: list[AltNameIn] | None = None

    @field_validator("birth_date", "death_date", mode="before")
    @classmethod
    def _validate_partial_dates(cls, value: object) -> str | None:
        return _coerce_partial_date(value)


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
