"""add used_ar to guest_drill_sessions

Revision ID: c2e3f4a5b6c7
Revises: b1f2e3d4c5a6
Create Date: 2026-07-17 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c2e3f4a5b6c7'
down_revision = 'b1f2e3d4c5a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('guest_drill_sessions', sa.Column('used_ar', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('guest_drill_sessions', 'used_ar')
