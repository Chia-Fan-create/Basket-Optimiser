from flask import Blueprint, jsonify, g
from db import get_connection
from auth import require_auth
from sql_loader import get_query

todos_bp = Blueprint("todos", __name__)


@todos_bp.route("/api/todos/<int:todo_id>", methods=["PATCH"])
@require_auth
def mark_todo_done(todo_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(get_query("todos", "mark_done"), (todo_id, g.user_id))
            if cur.rowcount == 0:
                return jsonify({"error": True, "message": "Todo not found"}), 404
        return jsonify({"success": True, "todo_id": todo_id, "is_done": True})
    finally:
        conn.close()


@todos_bp.route("/api/todos/<int:todo_id>", methods=["DELETE"])
@require_auth
def delete_todo(todo_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(get_query("todos", "delete_todo"), (todo_id, g.user_id))
            if cur.rowcount == 0:
                return jsonify({"error": True, "message": "Todo not found"}), 404
        return jsonify({"success": True, "deleted": True})
    finally:
        conn.close()
