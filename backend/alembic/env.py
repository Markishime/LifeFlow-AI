from alembic import context
from app.core import make_engine, settings
from app.models import Base

target_metadata = Base.metadata

if context.is_offline_mode():
    context.configure(url=settings().database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = make_engine(settings().database_url)
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            user_module_prefix="pgvector.sqlalchemy.",
        )
        with context.begin_transaction():
            context.run_migrations()
