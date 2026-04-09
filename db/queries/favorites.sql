-- ============================================================
-- User Favorites Queries
-- ============================================================

-- name: get_by_user
SELECT product_id
FROM user_favorites
WHERE user_id = %s;

-- name: delete_all_by_user
DELETE FROM user_favorites WHERE user_id = %s;

-- name: insert_one
INSERT INTO user_favorites (user_id, product_id)
VALUES (%s, %s);
