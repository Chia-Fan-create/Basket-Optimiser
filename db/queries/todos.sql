-- ============================================================
-- Todos Queries
-- ============================================================

-- name: mark_done
UPDATE todos
SET is_done = TRUE, completed_at = NOW()
WHERE todo_id = %s AND user_id = %s;

-- name: delete_todo
DELETE FROM todos
WHERE todo_id = %s AND user_id = %s;
