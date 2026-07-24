"""Add UserSettings, NutritionEntry, and FoodItem models for Phase 2"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_settings table
    op.create_table(
        'user_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('weight_unit', sa.String(), nullable=False, server_default='kg'),
        sa.Column('height_cm', sa.Float(), nullable=True),
        sa.Column('bodyweight_kg', sa.Float(), nullable=True),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('fitness_goal', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('ix_user_settings_id', 'user_settings', ['id'])

    # Create nutrition_entries table
    op.create_table(
        'nutrition_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('meal_type', sa.String(), nullable=False),
        sa.Column('meal_name', sa.String(), nullable=False),
        sa.Column('calories', sa.Integer(), nullable=False),
        sa.Column('protein_g', sa.Float(), nullable=False),
        sa.Column('carbs_g', sa.Float(), nullable=False),
        sa.Column('fat_g', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_nutrition_entries_id', 'nutrition_entries', ['id'])

    # Create food_items table
    op.create_table(
        'food_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('serving_size', sa.String(), nullable=False),
        sa.Column('calories', sa.Integer(), nullable=False),
        sa.Column('protein_g', sa.Float(), nullable=False),
        sa.Column('carbs_g', sa.Float(), nullable=False),
        sa.Column('fat_g', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_food_items_id', 'food_items', ['id'])


def downgrade() -> None:
    op.drop_index('ix_food_items_id', table_name='food_items')
    op.drop_table('food_items')
    op.drop_index('ix_nutrition_entries_id', table_name='nutrition_entries')
    op.drop_table('nutrition_entries')
    op.drop_index('ix_user_settings_id', table_name='user_settings')
    op.drop_table('user_settings')
