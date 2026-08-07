from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import JSON

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(32), unique=True, index=True, nullable=True)
    full_name = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    vk_id = Column(String(255), unique=True, index=True, nullable=True)
    mailru_id = Column(String(255), unique=True, index=True, nullable=True)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memorial_cards = relationship(
        "MemorialCard",
        back_populates="owner",
        foreign_keys="MemorialCard.owner_id",
    )
    family_trees = relationship("FamilyTree", back_populates="owner")
    tree_collaborations = relationship("TreeCollaborator", back_populates="user")
    user_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    organization_memberships = relationship(
        "OrganizationMember",
        back_populates="user",
        foreign_keys="OrganizationMember.user_id",
        cascade="all, delete-orphan",
    )

    @property
    def has_password(self) -> bool:
        return bool(self.password_hash)


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    role_permissions = relationship(
        "RolePermission", back_populates="role", cascade="all, delete-orphan"
    )
    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(128), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    category = Column(String(64), nullable=False, default="general")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    role_permissions = relationship(
        "RolePermission", back_populates="permission", cascade="all, delete-orphan"
    )


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),)

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False, index=True)

    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_role"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    logo = Column(String(500), nullable=True)
    subscription_plan = Column(String(64), nullable=False, default="free")
    subscription_status = Column(String(64), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    members = relationship(
        "OrganizationMember", back_populates="organization", cascade="all, delete-orphan"
    )
    memorials = relationship("MemorialCard", back_populates="organization")


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    member_role = Column(String(32), nullable=False, default="employee")  # owner|employee
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(32), nullable=False, default="active")  # pending|active|revoked
    invite_token = Column(String(64), unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="organization_memberships", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])


class AuthCode(Base):
    __tablename__ = "auth_codes"

    id = Column(Integer, primary_key=True, index=True)
    purpose = Column(String(64), nullable=False, index=True)
    target = Column(String(255), nullable=False, index=True)
    code_hash = Column(String(128), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OAuthState(Base):
    __tablename__ = "oauth_states"

    state = Column(String(64), primary_key=True)
    provider = Column(String(32), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MemorialCard(Base):
    __tablename__ = "memorial_cards"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=False)
    middle_name = Column(String(120), nullable=True)
    birth_date = Column(Date, nullable=True)
    death_date = Column(Date, nullable=True)
    birth_place = Column(String(500), nullable=True)
    birth_lat = Column(Float, nullable=True)
    birth_lng = Column(Float, nullable=True)
    death_place = Column(String(500), nullable=True)
    death_lat = Column(Float, nullable=True)
    death_lng = Column(Float, nullable=True)
    life_status = Column(String(16), nullable=False, default="unknown")  # unknown|alive|deceased
    epitaph = Column(Text, nullable=True)
    short_description = Column(String(160), nullable=True)
    relatives_text = Column(Text, nullable=True)
    biography = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    cemetery_name = Column(String(255), nullable=True)
    cemetery_location = Column(String(500), nullable=True)
    cemetery_lat = Column(Float, nullable=True)
    cemetery_lng = Column(Float, nullable=True)
    page_kind = Column(String(32), nullable=False, default="brief")
    guestbook_enabled = Column(Boolean, nullable=False, default=False)
    metal_plaque = Column(Boolean, nullable=False, default=False)
    external_links = Column(JSON, nullable=True)
    visibility = Column(String(32), nullable=False, default="private")
    status = Column(String(32), nullable=False, default="published")
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="memorial_cards", foreign_keys=[owner_id])
    creator = relationship("User", foreign_keys=[created_by])
    deleter = relationship("User", foreign_keys=[deleted_by])
    organization = relationship("Organization", back_populates="memorials")
    ownership_claims = relationship(
        "OwnershipClaim", back_populates="memorial", cascade="all, delete-orphan"
    )
    reports = relationship(
        "MemorialReport", back_populates="memorial", cascade="all, delete-orphan"
    )
    gallery_images = relationship(
        "MemorialGalleryImage",
        back_populates="memorial",
        cascade="all, delete-orphan",
        order_by="MemorialGalleryImage.sort_order",
    )
    videos = relationship(
        "MemorialVideo",
        back_populates="memorial",
        cascade="all, delete-orphan",
        order_by="MemorialVideo.sort_order",
    )
    audio_clips = relationship(
        "MemorialAudio",
        back_populates="memorial",
        cascade="all, delete-orphan",
        order_by="MemorialAudio.sort_order",
    )
    documents = relationship(
        "MemorialDocument",
        back_populates="memorial",
        cascade="all, delete-orphan",
        order_by="MemorialDocument.sort_order",
    )


class MemorialGalleryImage(Base):
    __tablename__ = "memorial_gallery_images"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("memorial_cards.id"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    caption = Column(String(255), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memorial = relationship("MemorialCard", back_populates="gallery_images")


class MemorialVideo(Base):
    __tablename__ = "memorial_videos"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("memorial_cards.id"), nullable=False, index=True)
    source = Column(String(32), nullable=False)  # file | rutube | vk | youtube
    url = Column(String(1000), nullable=False)
    embed_url = Column(String(1000), nullable=True)
    title = Column(String(255), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memorial = relationship("MemorialCard", back_populates="videos")


class MemorialAudio(Base):
    __tablename__ = "memorial_audio"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("memorial_cards.id"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    title = Column(String(255), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memorial = relationship("MemorialCard", back_populates="audio_clips")


class MemorialDocument(Base):
    __tablename__ = "memorial_documents"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("memorial_cards.id"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    title = Column(String(255), nullable=True)
    category = Column(String(64), nullable=False, default="other")
    # diploma | military | letter | award | other
    original_name = Column(String(255), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memorial = relationship("MemorialCard", back_populates="documents")


class OwnershipClaim(Base):
    __tablename__ = "ownership_claims"

    id = Column(Integer, primary_key=True, index=True)
    memorial_id = Column(Integer, ForeignKey("memorial_cards.id"), nullable=False, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="pending")
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memorial = relationship("MemorialCard", back_populates="ownership_claims")
    requester = relationship("User", foreign_keys=[requester_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class MemorialReport(Base):
    __tablename__ = "memorial_reports"
    __table_args__ = (
        UniqueConstraint("memorial_id", "reporter_id", name="uq_memorial_report_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    memorial_id = Column(Integer, ForeignKey("memorial_cards.id"), nullable=False, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(String(64), nullable=False)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memorial = relationship("MemorialCard", back_populates="reports")
    reporter = relationship("User", foreign_keys=[reporter_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(128), nullable=False, index=True)
    entity_type = Column(String(64), nullable=False, index=True)
    entity_id = Column(String(64), nullable=True, index=True)
    ip_address = Column(String(64), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User")


class FamilyTree(Base):
    __tablename__ = "family_trees"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    # Legacy blob; kept for migration / backward compatibility.
    tree_json = Column(Text, nullable=True, default="{}")
    share_slug = Column(String(64), unique=True, index=True, nullable=True)
    visibility = Column(String(32), nullable=False, default="private")  # private|link|public
    guest_token = Column(String(64), unique=True, index=True, nullable=True)
    is_demo_template = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="family_trees")
    persons = relationship("TreePerson", back_populates="tree", cascade="all, delete-orphan")
    families = relationship("TreeFamily", back_populates="tree", cascade="all, delete-orphan")
    collaborators = relationship(
        "TreeCollaborator", back_populates="tree", cascade="all, delete-orphan"
    )


class TreePerson(Base):
    __tablename__ = "tree_persons"

    id = Column(Integer, primary_key=True, index=True)
    tree_id = Column(Integer, ForeignKey("family_trees.id"), nullable=False, index=True)
    first_name = Column(String(120), nullable=True, default="")
    last_name = Column(String(120), nullable=True, default="")
    middle_name = Column(String(120), nullable=True, default="")
    gender = Column(String(16), nullable=True, default="")
    # Partial dates as text: YYYY | YYYY-MM | YYYY-MM-DD
    birth_date = Column(String(32), nullable=True)
    death_date = Column(String(32), nullable=True)
    birth_place = Column(String(500), nullable=True)
    birth_lat = Column(Float, nullable=True)
    birth_lng = Column(Float, nullable=True)
    death_place = Column(String(500), nullable=True)
    death_lat = Column(Float, nullable=True)
    death_lng = Column(Float, nullable=True)
    burial_place = Column(String(500), nullable=True)
    burial_lat = Column(Float, nullable=True)
    burial_lng = Column(Float, nullable=True)
    photo_path = Column(String(500), nullable=True)
    note = Column(Text, nullable=True)
    # unknown | alive | deceased — is_deceased kept in sync (True only when deceased)
    life_status = Column(String(16), nullable=False, default="unknown")
    is_deceased = Column(Boolean, default=False, nullable=False)
    memorial_card_id = Column(Integer, ForeignKey("memorial_cards.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tree = relationship("FamilyTree", back_populates="persons")
    memorial_card = relationship("MemorialCard", foreign_keys=[memorial_card_id])
    alt_names = relationship(
        "TreePersonName", back_populates="person", cascade="all, delete-orphan"
    )
    layout = relationship(
        "TreePersonLayout",
        back_populates="person",
        uselist=False,
        cascade="all, delete-orphan",
    )


class TreePersonName(Base):
    __tablename__ = "tree_person_names"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("tree_persons.id"), nullable=False, index=True)
    name_type = Column(String(32), nullable=False, default="aka")  # birth|married|aka
    first_name = Column(String(120), nullable=True, default="")
    last_name = Column(String(120), nullable=True, default="")
    middle_name = Column(String(120), nullable=True, default="")

    person = relationship("TreePerson", back_populates="alt_names")


class TreeFamily(Base):
    __tablename__ = "tree_families"

    id = Column(Integer, primary_key=True, index=True)
    tree_id = Column(Integer, ForeignKey("family_trees.id"), nullable=False, index=True)
    partner_a_id = Column(Integer, ForeignKey("tree_persons.id"), nullable=True)
    partner_b_id = Column(Integer, ForeignKey("tree_persons.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tree = relationship("FamilyTree", back_populates="families")
    partner_a = relationship("TreePerson", foreign_keys=[partner_a_id])
    partner_b = relationship("TreePerson", foreign_keys=[partner_b_id])
    children = relationship(
        "TreeFamilyChild", back_populates="family", cascade="all, delete-orphan"
    )


class TreeFamilyChild(Base):
    __tablename__ = "tree_family_children"
    __table_args__ = (UniqueConstraint("family_id", "person_id", name="uq_family_child"),)

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("tree_families.id"), nullable=False, index=True)
    person_id = Column(Integer, ForeignKey("tree_persons.id"), nullable=False, index=True)
    sort_order = Column(Integer, default=0, nullable=False)

    family = relationship("TreeFamily", back_populates="children")
    person = relationship("TreePerson")


class TreePersonLayout(Base):
    __tablename__ = "tree_person_layouts"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(
        Integer, ForeignKey("tree_persons.id"), nullable=False, unique=True, index=True
    )
    x = Column(Float, nullable=False, default=0)
    y = Column(Float, nullable=False, default=0)

    person = relationship("TreePerson", back_populates="layout")


class TreeCollaborator(Base):
    __tablename__ = "tree_collaborators"
    __table_args__ = (UniqueConstraint("tree_id", "user_id", name="uq_tree_user"),)

    id = Column(Integer, primary_key=True, index=True)
    tree_id = Column(Integer, ForeignKey("family_trees.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    role = Column(String(16), nullable=False, default="editor")  # editor|viewer
    invite_token = Column(String(64), unique=True, index=True, nullable=True)
    status = Column(String(32), nullable=False, default="pending")  # pending|accepted
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tree = relationship("FamilyTree", back_populates="collaborators")
    user = relationship("User", back_populates="tree_collaborations")
