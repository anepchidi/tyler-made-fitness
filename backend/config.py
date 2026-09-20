import os

from dotenv import load_dotenv

load_dotenv()


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {name}. "
            f"Copy .env.example to .env and set {name} before starting the server."
        )
    return value


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        raise RuntimeError(
            f"Environment variable {name} must be an integer, got: {raw!r}"
        )


# --- JWT / Auth ---
SECRET_KEY = _require_env("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = _int_env("ACCESS_TOKEN_EXPIRE_MINUTES", 30)

# --- CORS ---
_raw_origins = _require_env("ALLOWED_ORIGINS")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in _raw_origins.split(",") if origin.strip()
]
if not ALLOWED_ORIGINS:
    raise RuntimeError(
    )

# --- File Upload ---
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "static/exercises")
MAX_UPLOAD_SIZE_MB = _int_env("MAX_UPLOAD_SIZE_MB", 5)