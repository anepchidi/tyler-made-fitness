"""Initial migration: Create User, Workout, ExerciseLibrary, Exercise, and Set tables"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('is_active', sa.Integer(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('email')
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_email', 'users', ['email'])

    # Create exercise_library table
    op.create_table(
        'exercise_library',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('muscle_group', sa.String(), nullable=False),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_exercise_library_id', 'exercise_library', ['id'])
    op.create_index('ix_exercise_library_name', 'exercise_library', ['name'])

    # Create workouts table
    op.create_table(
        'workouts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_workouts_id', 'workouts', ['id'])

    # Create exercises table (NEW STRUCTURE)
    op.create_table(
        'exercises',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workout_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('muscle_group', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['workout_id'], ['workouts.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_exercises_id', 'exercises', ['id'])

    # Create sets table (NEW - maps 1:many to exercises)
    op.create_table(
        'sets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('exercise_id', sa.Integer(), nullable=False),
        sa.Column('reps', sa.Integer(), nullable=False),
        sa.Column('weight', sa.Float(), nullable=False),
        sa.Column('set_number', sa.Integer(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['exercise_id'], ['exercises.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_sets_id', 'sets', ['id'])


def downgrade() -> None:
    op.drop_index('ix_sets_id', table_name='sets')
    op.drop_table('sets')
    op.drop_index('ix_exercises_id', table_name='exercises')
    op.drop_table('exercises')
    op.drop_index('ix_workouts_id', table_name='workouts')
    op.drop_table('workouts')
    op.drop_index('ix_exercise_library_name', table_name='exercise_library')
    op.drop_index('ix_exercise_library_id', table_name='exercise_library')
    op.drop_table('exercise_library')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_users_username', table_name='users')
    op.drop_index('ix_users_id', table_name='users')
    op.drop_table('users')
