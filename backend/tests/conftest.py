"""Shared fixtures for all tests."""
import sys
import os
import pytest

# Ensure backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import app as flask_app  # noqa: E402


@pytest.fixture
def app():
    """Create Flask app for testing."""
    flask_app.config["TESTING"] = True
    return flask_app


@pytest.fixture
def client(app):
    """Flask test client — no real server needed."""
    return app.test_client()


@pytest.fixture
def auth_header(client):
    """Login as demo user and return Authorization header dict."""
    resp = client.post("/api/auth/login", json={
        "email": "alex.lee@example.com",
        "password": "password123",
    })
    token = resp.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}
