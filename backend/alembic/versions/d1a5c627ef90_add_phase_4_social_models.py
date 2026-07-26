"""Add Phase 4 social models

Revision ID: d1a5c627ef90
Revises: 85a4ce77590b
Create Date: 2026-07-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd1a5c627ef90'
down_revision = '85a4ce77590b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_follows',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('follower_id', sa.Integer(), nullable=False),
        sa.Column('following_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['follower_id'], ['users.id']),
        sa.ForeignKeyConstraint(['following_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('follower_id', 'following_id', name='uq_user_follow'),
    )
    op.create_index(op.f('ix_user_follows_id'), 'user_follows', ['id'], unique=False)

    op.create_table(
        'workout_shares',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workout_id', sa.Integer(), nullable=False),
        sa.Column('visibility', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['workout_id'], ['workouts.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workout_id'),
    )
    op.create_index(op.f('ix_workout_shares_id'), 'workout_shares', ['id'], unique=False)

    op.create_table(
        'workout_comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workout_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['workout_id'], ['workouts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_workout_comments_id'), 'workout_comments', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_workout_comments_id'), table_name='workout_comments')
    op.drop_table('workout_comments')
    op.drop_index(op.f('ix_workout_shares_id'), table_name='workout_shares')
    op.drop_table('workout_shares')
    op.drop_index(op.f('ix_user_follows_id'), table_name='user_follows')
    op.drop_table('user_follows')
