"""add floor plan metadata to building_scans

Revision ID: b1f2e3d4c5a6
Revises: a3c19dcb9e26
Create Date: 2026-07-17 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b1f2e3d4c5a6'
down_revision: Union[str, Sequence[str], None] = 'a3c19dcb9e26'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('building_scans', sa.Column('scale_meters_per_pixel', sa.Float(), nullable=False, server_default='0.01'))
    op.add_column('building_scans', sa.Column('origin_x', sa.Float(), nullable=False, server_default='0.0'))
    op.add_column('building_scans', sa.Column('origin_z', sa.Float(), nullable=False, server_default='0.0'))

def downgrade() -> None:
    op.drop_column('building_scans', 'origin_z')
    op.drop_column('building_scans', 'origin_x')
    op.drop_column('building_scans', 'scale_meters_per_pixel')
