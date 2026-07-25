from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

try:
    import models, schemas
    from dependencies import get_current_user, get_db
except ModuleNotFoundError:
    from .. import models, schemas
    from ..dependencies import get_current_user, get_db

router = APIRouter()


@router.get("/users/me/settings", response_model=schemas.UserSettings)
def get_user_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == current_user.id).first()

    if not settings:
        settings = models.UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.put("/users/me/settings", response_model=schemas.UserSettings)
def update_user_settings(
    settings_update: schemas.UserSettingsCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == current_user.id).first()

    if not settings:
        settings = models.UserSettings(user_id=current_user.id, **settings_update.model_dump())
    else:
        for key, value in settings_update.model_dump().items():
            setattr(settings, key, value)

    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings
