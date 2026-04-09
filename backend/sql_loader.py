"""Load named SQL queries from .sql files in db/queries/."""
import os
import re

_BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "db", "queries")
_cache: dict[str, dict[str, str]] = {}


def _parse_file(filepath: str) -> dict[str, str]:
    """Parse a .sql file with `-- name: xxx` markers into a dict."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    queries = {}
    blocks = re.split(r"^-- name:\s*", content, flags=re.MULTILINE)
    for block in blocks[1:]:  # skip text before first marker
        lines = block.strip().split("\n")
        name = lines[0].strip()
        # Strip standalone comment lines (but keep inline SQL)
        sql_lines = [l for l in lines[1:] if not l.strip().startswith("--")]
        sql = "\n".join(sql_lines).strip().rstrip(";")
        if sql:
            queries[name] = sql
    return queries


def get_query(module: str, name: str) -> str:
    """Return a named SQL query from db/queries/{module}.sql."""
    if module not in _cache:
        filepath = os.path.join(_BASE_DIR, f"{module}.sql")
        _cache[module] = _parse_file(filepath)
    return _cache[module][name]
