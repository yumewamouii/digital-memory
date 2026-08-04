from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    logo: str | None = None
    subscription_plan: Literal["free", "basic", "pro", "enterprise"] = "free"


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    logo: str | None = None


class SubscriptionUpdate(BaseModel):
    subscription_plan: Literal["free", "basic", "pro", "enterprise"]
    subscription_status: Literal["active", "trial", "suspended", "cancelled"] | None = None


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    logo: str | None = None
    subscription_plan: str
    subscription_status: str
    created_at: datetime
    deleted_at: datetime | None = None
    employee_count: int = 0
    memorial_count: int = 0


class MemberInvite(BaseModel):
    email: EmailStr
    member_role: Literal["employee"] = "employee"


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    user_id: int
    member_role: str
    status: str
    email: str | None = None
    full_name: str | None = None
    created_at: datetime


class OrgStatsOut(BaseModel):
    organization_id: int
    memorial_count: int
    employee_count: int
    published_count: int
    deleted_count: int
