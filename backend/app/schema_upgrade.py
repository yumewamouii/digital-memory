"""Lightweight SQLite-friendly schema upgrades (no Alembic)."""

from __future__ import annotations

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from .database import Base, SessionLocal

logger = logging.getLogger(__name__)

USER_COLUMNS: dict[str, str] = {
    "phone": "VARCHAR(32)",
    "google_id": "VARCHAR(255)",
    "vk_id": "VARCHAR(255)",
    "mailru_id": "VARCHAR(255)",
    "email_verified": "BOOLEAN DEFAULT 0",
    "phone_verified": "BOOLEAN DEFAULT 0",
}

FAMILY_TREE_COLUMNS: dict[str, str] = {
    "share_slug": "VARCHAR(64)",
    "visibility": "VARCHAR(32) DEFAULT 'private'",
    "guest_token": "VARCHAR(64)",
    "is_demo_template": "BOOLEAN DEFAULT 0",
    "updated_at": "DATETIME",
}

MEMORIAL_CARD_COLUMNS: dict[str, str] = {
    "created_by": "INTEGER",
    "organization_id": "INTEGER",
    "visibility": "VARCHAR(32) DEFAULT 'private'",
    "status": "VARCHAR(32) DEFAULT 'published'",
    "deleted_at": "DATETIME",
    "deleted_by": "INTEGER",
    "updated_at": "DATETIME",
}


def _existing_columns(engine: Engine, table: str) -> set[str]:
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return set()
    return {col["name"] for col in inspector.get_columns(table)}


def _column_nullable(engine: Engine, table: str, column: str) -> bool | None:
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return None
    for col in inspector.get_columns(table):
        if col["name"] == column:
            return bool(col["nullable"])
    return None


def _rebuild_users_for_nullability(engine: Engine) -> None:
    """Recreate users table so email/password_hash can be NULL (SQLite)."""
    existing = _existing_columns(engine, "users")
    logger.info("Rebuilding users table to allow nullable email/password_hash")

    insert_cols = [
        "id",
        "email",
        "phone",
        "full_name",
        "password_hash",
        "google_id",
        "vk_id",
        "mailru_id",
        "email_verified",
        "phone_verified",
        "is_active",
        "created_at",
    ]
    defaults = {
        "phone": "NULL",
        "google_id": "NULL",
        "vk_id": "NULL",
        "mailru_id": "NULL",
        "email_verified": "0",
        "phone_verified": "0",
        "is_active": "1",
        "created_at": "CURRENT_TIMESTAMP",
    }
    select_parts = [col if col in existing else defaults.get(col, "NULL") for col in insert_cols]

    with engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys=OFF"))
        conn.execute(
            text(
                """
                CREATE TABLE users_new (
                    id INTEGER NOT NULL PRIMARY KEY,
                    email VARCHAR(255),
                    phone VARCHAR(32),
                    full_name VARCHAR(255) NOT NULL,
                    password_hash VARCHAR(255),
                    google_id VARCHAR(255),
                    vk_id VARCHAR(255),
                    mailru_id VARCHAR(255),
                    email_verified BOOLEAN DEFAULT 0,
                    phone_verified BOOLEAN DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                f"INSERT INTO users_new ({', '.join(insert_cols)}) "
                f"SELECT {', '.join(select_parts)} FROM users"
            )
        )
        conn.execute(text("DROP TABLE users"))
        conn.execute(text("ALTER TABLE users_new RENAME TO users"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone ON users (phone)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_vk_id ON users (vk_id)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_mailru_id ON users (mailru_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_id ON users (id)"))
        conn.execute(text("PRAGMA foreign_keys=ON"))


def _rebuild_family_trees_for_null_owner(engine: Engine) -> None:
    existing = _existing_columns(engine, "family_trees")
    if not existing:
        return
    logger.info("Rebuilding family_trees for nullable owner_id and new columns")
    insert_cols = [
        "id",
        "owner_id",
        "title",
        "description",
        "tree_json",
        "share_slug",
        "visibility",
        "guest_token",
        "is_demo_template",
        "created_at",
        "updated_at",
    ]
    defaults = {
        "description": "NULL",
        "tree_json": "'{}'",
        "share_slug": "NULL",
        "visibility": "'private'",
        "guest_token": "NULL",
        "is_demo_template": "0",
        "created_at": "CURRENT_TIMESTAMP",
        "updated_at": "CURRENT_TIMESTAMP",
    }
    select_parts = []
    for col in insert_cols:
        if col in existing:
            select_parts.append(col)
        else:
            select_parts.append(defaults.get(col, "NULL"))

    with engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys=OFF"))
        conn.execute(
            text(
                """
                CREATE TABLE family_trees_new (
                    id INTEGER NOT NULL PRIMARY KEY,
                    owner_id INTEGER,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    tree_json TEXT,
                    share_slug VARCHAR(64),
                    visibility VARCHAR(32) DEFAULT 'private' NOT NULL,
                    guest_token VARCHAR(64),
                    is_demo_template BOOLEAN DEFAULT 0 NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(owner_id) REFERENCES users (id)
                )
                """
            )
        )
        conn.execute(
            text(
                f"INSERT INTO family_trees_new ({', '.join(insert_cols)}) "
                f"SELECT {', '.join(select_parts)} FROM family_trees"
            )
        )
        conn.execute(text("DROP TABLE family_trees"))
        conn.execute(text("ALTER TABLE family_trees_new RENAME TO family_trees"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_family_trees_id ON family_trees (id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_family_trees_owner_id ON family_trees (owner_id)"))
        conn.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS ix_family_trees_share_slug ON family_trees (share_slug)")
        )
        conn.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS ix_family_trees_guest_token ON family_trees (guest_token)")
        )
        conn.execute(text("PRAGMA foreign_keys=ON"))


def upgrade_schema(engine: Engine) -> None:
    Base.metadata.create_all(bind=engine)

    existing_users = _existing_columns(engine, "users")
    if existing_users:
        with engine.begin() as conn:
            for name, ddl_type in USER_COLUMNS.items():
                if name not in existing_users:
                    logger.info("Adding column users.%s", name)
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {ddl_type}"))

        email_nullable = _column_nullable(engine, "users", "email")
        password_nullable = _column_nullable(engine, "users", "password_hash")
        if email_nullable is False or password_nullable is False:
            if engine.dialect.name == "sqlite":
                _rebuild_users_for_nullability(engine)

    existing_trees = _existing_columns(engine, "family_trees")
    if existing_trees:
        owner_nullable = _column_nullable(engine, "family_trees", "owner_id")
        needs_rebuild = owner_nullable is False or any(
            col not in existing_trees for col in FAMILY_TREE_COLUMNS
        )
        if needs_rebuild and engine.dialect.name == "sqlite":
            # Prefer additive columns when owner already nullable
            if owner_nullable is False:
                _rebuild_family_trees_for_null_owner(engine)
            else:
                with engine.begin() as conn:
                    cols = _existing_columns(engine, "family_trees")
                    for name, ddl_type in FAMILY_TREE_COLUMNS.items():
                        if name not in cols:
                            logger.info("Adding column family_trees.%s", name)
                            conn.execute(text(f"ALTER TABLE family_trees ADD COLUMN {name} {ddl_type}"))

    # Ensure new tables exist after model changes
    Base.metadata.create_all(bind=engine)

    existing_memorials = _existing_columns(engine, "memorial_cards")
    if existing_memorials:
        with engine.begin() as conn:
            for name, ddl_type in MEMORIAL_CARD_COLUMNS.items():
                if name not in existing_memorials:
                    logger.info("Adding column memorial_cards.%s", name)
                    conn.execute(text(f"ALTER TABLE memorial_cards ADD COLUMN {name} {ddl_type}"))

        # Backfill created_by / visibility / status for existing rows
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    UPDATE memorial_cards
                    SET created_by = owner_id
                    WHERE created_by IS NULL
                    """
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE memorial_cards
                    SET visibility = 'private'
                    WHERE visibility IS NULL OR visibility = ''
                    """
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE memorial_cards
                    SET status = 'published'
                    WHERE status IS NULL OR status = ''
                    """
                )
            )

    # Migrate legacy tree_json + seed demo + RBAC
    db: Session = SessionLocal()
    try:
        from .services.tree_demo import ensure_demo_tree
        from .services.tree_migrate import migrate_all_legacy_trees
        from .seed.rbac_seed import seed_rbac

        migrated = migrate_all_legacy_trees(db)
        if migrated:
            logger.info("Migrated %s legacy family trees", migrated)
        ensure_demo_tree(db)
        seed_rbac(db)
    except Exception:
        logger.exception("Tree migration/demo/RBAC seed failed")
        db.rollback()
    finally:
        db.close()
