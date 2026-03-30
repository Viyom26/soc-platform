import sys
from pathlib import Path
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context  # type: ignore

# ================= PATH FIX =================
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

# ================= CONFIG =================
config = context.config

# ================= LOGGING =================
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ================= IMPORT METADATA =================
from app.database import Base  # noqa
from app.models.alert import Alert  # noqa
from app.models.incident import Incident  # noqa
from app.models.audit import IncidentEvent  # noqa
from app.models.ip_analysis import IPAnalysis  # noqa

target_metadata = Base.metadata

# ================= MIGRATIONS =================

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""

    # 🔥 FIX: handle None safely (removes red error)
    section = config.get_section(config.config_ini_section)
    assert section is not None, "Alembic config section missing"

    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,  # detects column changes
        )

        with context.begin_transaction():
            context.run_migrations()


# ================= ENTRY =================
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()