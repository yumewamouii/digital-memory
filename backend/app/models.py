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

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(32), unique=True, index=True, nullable=True)
    full_name = Column(String(255), nullable=False)
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
    biography = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    cemetery_name = Column(String(255), nullable=True)
    cemetery_location = Column(String(255), nullable=True)
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
    birth_date = Column(Date, nullable=True)
    death_date = Column(Date, nullable=True)
    birth_place = Column(String(255), nullable=True)
    death_place = Column(String(255), nullable=True)
    photo_path = Column(String(500), nullable=True)
    note = Column(Text, nullable=True)
    is_deceased = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tree = relationship("FamilyTree", back_populates="persons")
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
