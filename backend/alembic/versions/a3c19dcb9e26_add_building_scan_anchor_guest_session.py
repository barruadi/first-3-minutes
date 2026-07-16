"""add building scan anchor guest session

Revision ID: a3c19dcb9e26
Revises:
Create Date: 2026-07-17 02:07:28.325963

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3c19dcb9e26'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('building_scans',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('installation_id', sa.String(), nullable=False),
        sa.Column('floor_plan_path', sa.String(), nullable=True),
        sa.Column('mesh_path', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_building_scans_installation_id', 'building_scans', ['installation_id'])

    op.create_table('building_anchors',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('scan_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('pos_x', sa.Float(), nullable=False),
        sa.Column('pos_z', sa.Float(), nullable=False),
        sa.Column('is_exit', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['scan_id'], ['building_scans.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_building_anchors_scan_id', 'building_anchors', ['scan_id'])

    op.create_table('guest_drill_sessions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('anchor_id', sa.String(), nullable=False),
        sa.Column('duration_seconds', sa.Float(), nullable=False),
        sa.Column('completed', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['anchor_id'], ['building_anchors.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_guest_drill_sessions_anchor_id', 'guest_drill_sessions', ['anchor_id'])


def downgrade() -> None:
    op.drop_index('ix_guest_drill_sessions_anchor_id', 'guest_drill_sessions')
    op.drop_table('guest_drill_sessions')
    op.drop_index('ix_building_anchors_scan_id', 'building_anchors')
    op.drop_table('building_anchors')
    op.drop_index('ix_building_scans_installation_id', 'building_scans')
    op.drop_table('building_scans')
