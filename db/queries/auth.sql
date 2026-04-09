-- ============================================================
-- Authentication Queries
-- ============================================================

-- name: check_email_exists
SELECT user_id FROM users WHERE email = %s;

-- name: insert_user
INSERT INTO users (email, password_hash, display_name)
VALUES (%s, %s, %s);

-- name: get_user_by_email
SELECT user_id, email, password_hash, display_name
FROM users
WHERE email = %s;
