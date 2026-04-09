"""Unit tests for auth module — no DB or server needed."""
import pytest
from auth import hash_password, check_password, generate_token, require_auth
import jwt
from config import JWT_SECRET


class TestPasswordHashing:
    def test_hash_returns_bcrypt_string(self):
        h = hash_password("hello")
        assert h.startswith("$2b$")

    def test_hash_is_different_each_time(self):
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2  # different salts

    def test_check_correct_password(self):
        h = hash_password("secret123")
        assert check_password("secret123", h) is True

    def test_check_wrong_password(self):
        h = hash_password("secret123")
        assert check_password("wrong", h) is False

    def test_check_empty_password(self):
        h = hash_password("")
        assert check_password("", h) is True
        assert check_password("notempty", h) is False


class TestJWT:
    def test_generate_token_is_string(self):
        token = generate_token(1, "test@example.com")
        assert isinstance(token, str)

    def test_token_contains_user_id(self):
        token = generate_token(42, "u@e.com")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        assert payload["user_id"] == 42
        assert payload["email"] == "u@e.com"

    def test_token_contains_exp(self):
        token = generate_token(1, "u@e.com")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        assert "exp" in payload

    def test_token_invalid_secret_fails(self):
        token = generate_token(1, "u@e.com")
        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(token, "wrong-secret", algorithms=["HS256"])
