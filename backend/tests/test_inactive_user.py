"""
Tests for inactive-user rejection in the auth dependency chain.

These exercise `get_current_user` / `get_current_user_optional` directly through
a minimal app rather than through main.py, so they stay valid regardless of how
routers are wired up. The contract under test:

  active user           -> 200, request proceeds
  is_active = 0/False   -> 400 "Inactive user"
  is_active = NULL      -> 400 "Inactive user"  (falsy, defensive)
  no / bad token        -> 401 "Could not validate credentials"
  optional dependency   -> inactive user is downgraded to anonymous (None)
  POST /token           -> inactive user cannot obtain a token at all
"""

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import Base
from dependencies import (
    create_access_token,
    get_current_user,
    get_current_user_optional,
    get_db,
)

# --------------------------------------------------------------------------
# In-memory database
# --------------------------------------------------------------------------

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # one shared connection => one shared in-memory DB
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------------------------------
# Minimal app exposing both dependencies
# --------------------------------------------------------------------------

app = FastAPI()


@app.get("/protected")
def protected_route(current_user: models.User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username}


@app.get("/optional")
def optional_route(current_user=Depends(get_current_user_optional)):
    if current_user is None:
        return {"anonymous": True, "username": None}
    return {"anonymous": False, "username": current_user.username}


# Mount the real auth router so POST /token is covered too.
try:
    import auth

    app.include_router(auth.router)
    AUTH_ROUTER_MOUNTED = True
except Exception:  # pragma: no cover - bcrypt/schemas unavailable in this env
    AUTH_ROUTER_MOUNTED = False

app.dependency_overrides[get_db] = _override_get_db


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def fresh_schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def make_user(db_session, username, *, is_active=1, password="correct-horse"):
    """Create a persisted user. `is_active` accepts 1 / 0 / True / False / None."""
    try:
        from auth import get_password_hash

        hashed = get_password_hash(password)
    except Exception:  # pragma: no cover
        hashed = "not-a-real-hash"

    user = models.User(
        username=username,
        email=f"{username}@example.com",
        hashed_password=hashed,
        is_active=is_active,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def bearer(user):
    token = create_access_token(data={"sub": user.username, "id": user.id})
    return {"Authorization": f"Bearer {token}"}


# --------------------------------------------------------------------------
# get_current_user
# --------------------------------------------------------------------------


def test_active_user_can_access_protected_route(client, db_session):
    user = make_user(db_session, "active_alice", is_active=1)

    response = client.get("/protected", headers=bearer(user))

    assert response.status_code == 200
    assert response.json()["username"] == "active_alice"


@pytest.mark.parametrize("inactive_value", [0, False, None])
def test_inactive_user_is_rejected(client, db_session, inactive_value):
    """0, False and NULL are all falsy and must all be refused."""
    user = make_user(db_session, "inactive_ian", is_active=inactive_value)

    response = client.get("/protected", headers=bearer(user))

    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "Inactive user"


def test_inactive_user_rejected_even_with_freshly_minted_token(client, db_session):
    """Token signature/expiry is valid - the rejection must come from is_active."""
    user = make_user(db_session, "just_banned", is_active=1)
    headers = bearer(user)

    assert client.get("/protected", headers=headers).status_code == 200

    # Deactivate mid-session; the already-issued token must stop working.
    db_session.query(models.User).filter(models.User.id == user.id).update(
        {"is_active": 0}
    )
    db_session.commit()

    response = client.get("/protected", headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Inactive user"


def test_missing_token_still_returns_401(client):
    response = client.get("/protected")
    assert response.status_code == 401


def test_malformed_token_still_returns_401(client):
    response = client.get("/protected", headers={"Authorization": "Bearer nonsense"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_token_for_deleted_user_returns_401(client, db_session):
    user = make_user(db_session, "ghost", is_active=1)
    headers = bearer(user)
    db_session.delete(user)
    db_session.commit()

    response = client.get("/protected", headers=headers)
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


# --------------------------------------------------------------------------
# get_current_user_optional
# --------------------------------------------------------------------------


def test_optional_dependency_allows_anonymous(client):
    response = client.get("/optional")
    assert response.status_code == 200
    assert response.json() == {"anonymous": True, "username": None}


def test_optional_dependency_resolves_active_user(client, db_session):
    user = make_user(db_session, "active_opt", is_active=1)

    response = client.get("/optional", headers=bearer(user))

    assert response.status_code == 200
    assert response.json() == {"anonymous": False, "username": "active_opt"}


@pytest.mark.parametrize("inactive_value", [0, False, None])
def test_optional_dependency_downgrades_inactive_user_to_anonymous(
    client, db_session, inactive_value
):
    """Public feeds must not 400 for an inactive caller - they treat them as
    logged out, so the endpoint still renders its public slice."""
    user = make_user(db_session, "inactive_opt", is_active=inactive_value)

    response = client.get("/optional", headers=bearer(user))

    assert response.status_code == 200
    assert response.json() == {"anonymous": True, "username": None}


def test_optional_dependency_ignores_garbage_token(client):
    response = client.get("/optional", headers={"Authorization": "Bearer nonsense"})
    assert response.status_code == 200
    assert response.json()["anonymous"] is True


# --------------------------------------------------------------------------
# POST /token
# --------------------------------------------------------------------------


@pytest.mark.skipif(not AUTH_ROUTER_MOUNTED, reason="auth router not importable")
def test_inactive_user_cannot_obtain_token(client, db_session):
    make_user(db_session, "banned_bob", is_active=0, password="s3cret-pw")

    response = client.post(
        "/token",
        data={"username": "banned_bob", "password": "s3cret-pw"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Inactive user"


@pytest.mark.skipif(not AUTH_ROUTER_MOUNTED, reason="auth router not importable")
def test_inactive_user_with_wrong_password_gets_credentials_error(client, db_session):
    """Ordering check: the credential failure must mask account state so the
    endpoint cannot be used to enumerate which accounts are deactivated."""
    make_user(db_session, "banned_bob2", is_active=0, password="s3cret-pw")

    response = client.post(
        "/token",
        data={"username": "banned_bob2", "password": "wrong-pw"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect username or password"


@pytest.mark.skipif(not AUTH_ROUTER_MOUNTED, reason="auth router not importable")
def test_registered_user_is_active_by_default(client, db_session):
    response = client.post(
        "/register",
        json={
            "username": "newcomer",
            "email": "newcomer@example.com",
            "password": "s3cret-pw",
        },
    )
    assert response.status_code == 200

    user = (
        db_session.query(models.User)
        .filter(models.User.username == "newcomer")
        .first()
    )
    assert user is not None
    assert bool(user.is_active) is True