from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone
from pathlib import Path


_ROOT = Path(__file__).parent
_AUTH_DIR = _ROOT / "data" / "auth"
_USERS_FILE = _AUTH_DIR / "users.json"


def _ensure_store() -> None:
    _AUTH_DIR.mkdir(parents=True, exist_ok=True)
    if not _USERS_FILE.exists():
        _USERS_FILE.write_text("[]", encoding="utf-8")


def _read_users() -> list[dict[str, str]]:
    _ensure_store()
    try:
        data = json.loads(_USERS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        data = []
    return data if isinstance(data, list) else []


def _write_users(users: list[dict[str, str]]) -> None:
    _ensure_store()
    _USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    password_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        password_salt.encode("utf-8"),
        200_000,
    )
    return password_salt, digest.hex()


def create_user(name: str, email: str, password: str) -> tuple[bool, str]:
    cleaned_name = name.strip()
    cleaned_email = _normalize_email(email)

    if not cleaned_name:
        return False, "Please enter your name."
    if "@" not in cleaned_email or "." not in cleaned_email:
        return False, "Please enter a valid email address."
    if len(password) < 8:
        return False, "Password must be at least 8 characters."

    users = _read_users()
    if any(user["email"] == cleaned_email for user in users):
        return False, "An account with that email already exists."

    salt, password_hash = _hash_password(password)
    users.append(
        {
            "name": cleaned_name,
            "email": cleaned_email,
            "salt": salt,
            "password_hash": password_hash,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    _write_users(users)
    return True, "Account created."


def authenticate_user(email: str, password: str) -> tuple[bool, dict[str, str] | str]:
    cleaned_email = _normalize_email(email)
    users = _read_users()
    user = next((item for item in users if item["email"] == cleaned_email), None)
    if not user:
        return False, "No account found for that email."

    _, password_hash = _hash_password(password, salt=user["salt"])
    if not hmac.compare_digest(password_hash, user["password_hash"]):
        return False, "Incorrect password."

    return True, {"name": user["name"], "email": user["email"]}
