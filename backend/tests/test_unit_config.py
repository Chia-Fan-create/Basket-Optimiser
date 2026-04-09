"""Unit tests for config — verify env vars are loaded."""
import config


class TestConfig:
    def test_db_host_is_set(self):
        assert config.DB_HOST == "167.71.90.83"

    def test_db_port_is_int(self):
        assert isinstance(config.DB_PORT, int)
        assert config.DB_PORT == 3306

    def test_db_name(self):
        assert config.DB_NAME == "smartcart"

    def test_flask_port_is_int(self):
        assert isinstance(config.FLASK_PORT, int)

    def test_jwt_secret_is_set(self):
        assert len(config.JWT_SECRET) > 0
