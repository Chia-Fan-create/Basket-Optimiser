"""Unit tests for Flask app setup — no DB calls."""


class TestAppSetup:
    def test_app_exists(self, app):
        assert app is not None

    def test_app_is_testing(self, app):
        assert app.config["TESTING"] is True

    def test_404_returns_json(self, client):
        resp = client.get("/api/nonexistent-route")
        assert resp.status_code == 404
        data = resp.get_json()
        assert data["error"] is True
        assert "Not found" in data["message"]

    def test_cors_headers(self, client):
        resp = client.options("/api/retailers", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        })
        # flask-cors should allow the origin
        assert resp.status_code in (200, 204)


class TestProtectedEndpointsRequireAuth:
    """All protected endpoints must return 401 without a token."""

    PROTECTED = [
        ("GET", "/api/user/favorites"),
        ("PUT", "/api/user/favorites"),
        ("GET", "/api/lists"),
        ("GET", "/api/lists/1"),
        ("POST", "/api/lists"),
        ("POST", "/api/lists/1/items"),
        ("PATCH", "/api/lists/1/items/1"),
        ("GET", "/api/inventory"),
        ("POST", "/api/inventory"),
        ("PATCH", "/api/inventory/1/dismiss"),
        ("GET", "/api/alerts"),
        ("POST", "/api/alerts"),
        ("DELETE", "/api/alerts/1"),
        ("GET", "/api/insight/monthly"),
        ("GET", "/api/insight/categories"),
        ("GET", "/api/insight/summary"),
    ]

    def test_no_token_returns_401(self, client):
        for method, path in self.PROTECTED:
            resp = getattr(client, method.lower())(path)
            assert resp.status_code == 401, f"{method} {path} should be 401, got {resp.status_code}"
