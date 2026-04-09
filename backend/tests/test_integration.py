"""
Integration tests — hit real DB through Flask test client.
These tests use the test client (no live server needed) but DO connect to the real database.
Run with: pytest tests/test_integration.py -v
"""
import pytest


# ──────────────────────────────────────────────
# Public Endpoints
# ──────────────────────────────────────────────

class TestRetailers:
    def test_returns_three_retailers(self, client):
        resp = client.get("/api/retailers")
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) == 3
        names = {r["name"] for r in data}
        assert names == {"Amazon", "Target", "Walmart"}

    def test_retailer_has_color(self, client):
        data = client.get("/api/retailers").get_json()
        for r in data:
            assert r["color"].startswith("#")


class TestProducts:
    def test_returns_products(self, client):
        resp = client.get("/api/products")
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) >= 17

    def test_product_has_required_fields(self, client):
        data = client.get("/api/products").get_json()
        for p in data:
            assert "id" in p
            assert "name" in p
            assert "icon" in p
            assert "category" in p

    def test_product_id_is_integer(self, client):
        data = client.get("/api/products").get_json()
        for p in data:
            assert isinstance(p["id"], int)


class TestCompare:
    def test_compare_returns_ranked_list(self, client):
        resp = client.get("/api/compare/1")
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) <= 5
        assert data[0]["rank"] == 1

    def test_compare_sorted_by_unit_price(self, client):
        data = client.get("/api/compare/1").get_json()
        prices = [r["unitPrice"] for r in data]
        assert prices == sorted(prices)

    def test_compare_has_required_fields(self, client):
        data = client.get("/api/compare/1").get_json()
        required = {"rank", "product", "store", "storeColor", "unitPrice", "unit", "totalPrice", "originalPack", "url"}
        for item in data:
            assert required.issubset(item.keys())

    def test_compare_not_found(self, client):
        resp = client.get("/api/compare/99999")
        assert resp.status_code == 404

    def test_compare_summary(self, client):
        resp = client.post("/api/compare/summary", json={"product_ids": [1, 2]})
        assert resp.status_code == 200
        data = resp.get_json()
        assert "1" in data or 1 in data

    def test_compare_summary_empty(self, client):
        resp = client.post("/api/compare/summary", json={"product_ids": []})
        assert resp.status_code == 400


class TestTrends:
    def test_trends_returns_data(self, client):
        resp = client.get("/api/trends/1")
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data) >= 1

    def test_trends_has_month_and_retailers(self, client):
        data = client.get("/api/trends/1").get_json()
        for entry in data:
            assert "month" in entry
            assert "retailers" in entry
            assert "predicted" in entry

    def test_trends_not_found(self, client):
        resp = client.get("/api/trends/99999")
        assert resp.status_code == 404


# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────

class TestAuth:
    def test_login_success(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "alex.lee@example.com",
            "password": "password123",
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert "token" in data
        assert data["user"]["email"] == "alex.lee@example.com"

    def test_login_wrong_password(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "alex.lee@example.com",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        resp = client.post("/api/auth/login", json={"email": "a@b.com"})
        assert resp.status_code == 400

    def test_register_and_cleanup(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "pytest_user@example.com",
            "password": "test123",
            "display_name": "PyTest",
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["success"] is True
        assert "token" in data

        # Cleanup
        from db import get_connection
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE email = 'pytest_user@example.com'")
        conn.close()

    def test_register_duplicate(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "alex.lee@example.com",
            "password": "x",
            "display_name": "Dup",
        })
        assert resp.status_code == 400


# ──────────────────────────────────────────────
# Protected: Favorites
# ──────────────────────────────────────────────

class TestFavorites:
    def test_get_favorites(self, client, auth_header):
        resp = client.get("/api/user/favorites", headers=auth_header)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "product_ids" in data
        assert isinstance(data["product_ids"], list)

    def test_put_favorites(self, client, auth_header):
        # Save originals
        orig = client.get("/api/user/favorites", headers=auth_header).get_json()["product_ids"]

        resp = client.put("/api/user/favorites", headers=auth_header,
                          json={"product_ids": [1, 5, 10]})
        assert resp.status_code == 200
        assert resp.get_json()["product_ids"] == [1, 5, 10]

        # Restore
        client.put("/api/user/favorites", headers=auth_header,
                   json={"product_ids": orig})


# ──────────────────────────────────────────────
# Protected: Shopping Lists
# ──────────────────────────────────────────────

class TestLists:
    def test_get_lists(self, client, auth_header):
        resp = client.get("/api/lists", headers=auth_header)
        assert resp.status_code == 200
        assert isinstance(resp.get_json(), list)

    def test_get_list_detail(self, client, auth_header):
        resp = client.get("/api/lists/1", headers=auth_header)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "items" in data
        assert "store_totals" in data
        assert "cheapest_store" in data
        assert "savings_vs_expensive" in data

    def test_get_list_not_owned(self, client, auth_header):
        # List 5 belongs to user 3, not user 1
        resp = client.get("/api/lists/5", headers=auth_header)
        assert resp.status_code == 404

    def test_create_and_add_item_transaction(self, client, auth_header):
        """Tests the TRANSACTION: create list → add item → verify estimated_total."""
        # Create list
        resp = client.post("/api/lists", headers=auth_header, json={"name": "PyTest List"})
        assert resp.status_code == 201
        list_id = resp.get_json()["list_id"]

        # Add item (TRANSACTION: insert + update estimated_total)
        resp = client.post(f"/api/lists/{list_id}/items", headers=auth_header,
                           json={"variant_id": 1, "quantity": 1})
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["estimated_total"] > 0

        # Cleanup
        from db import get_connection
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM list_items WHERE list_id = %s", (list_id,))
            cur.execute("DELETE FROM shopping_lists WHERE list_id = %s", (list_id,))
        conn.close()


# ──────────────────────────────────────────────
# Protected: Inventory
# ──────────────────────────────────────────────

class TestInventory:
    def test_get_inventory(self, client, auth_header):
        resp = client.get("/api/inventory", headers=auth_header)
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)
        if data:
            item = data[0]
            assert "days_left" in item
            assert "status" in item
            assert item["status"] in ("low", "ok")

    def test_post_and_dismiss(self, client, auth_header):
        resp = client.post("/api/inventory", headers=auth_header, json={
            "product_id": 5, "quantity": 3.0, "consumption_days": 14,
        })
        assert resp.status_code == 201
        inv_id = resp.get_json()["inventory_id"]

        resp = client.patch(f"/api/inventory/{inv_id}/dismiss", headers=auth_header)
        assert resp.status_code == 200
        assert resp.get_json()["dismissed"] is True


# ──────────────────────────────────────────────
# Protected: Alerts
# ──────────────────────────────────────────────

class TestAlerts:
    def test_get_alerts(self, client, auth_header):
        resp = client.get("/api/alerts", headers=auth_header)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "user_alerts" in data
        assert "smart_alerts" in data

    def test_create_and_delete_alert(self, client, auth_header):
        resp = client.post("/api/alerts", headers=auth_header, json={
            "product_id": 2, "target_price": 1.50,
        })
        assert resp.status_code == 201
        alert_id = resp.get_json()["alert_id"]

        resp = client.delete(f"/api/alerts/{alert_id}", headers=auth_header)
        assert resp.status_code == 200
        assert resp.get_json()["deleted"] is True

    def test_delete_nonexistent_alert(self, client, auth_header):
        resp = client.delete("/api/alerts/99999", headers=auth_header)
        assert resp.status_code == 404


# ──────────────────────────────────────────────
# Protected: Insight
# ──────────────────────────────────────────────

class TestInsight:
    def test_monthly(self, client, auth_header):
        resp = client.get("/api/insight/monthly", headers=auth_header)
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)
        if data:
            assert "month" in data[0]
            assert "year" in data[0]
            assert "amount" in data[0]

    def test_categories(self, client, auth_header):
        resp = client.get("/api/insight/categories", headers=auth_header)
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)
        if data:
            assert "category" in data[0]
            assert "percentage" in data[0]

    def test_summary(self, client, auth_header):
        resp = client.get("/api/insight/summary", headers=auth_header)
        assert resp.status_code == 200
        data = resp.get_json()
        assert "total_6_months" in data
        assert "monthly_average" in data
        assert "insights" in data
