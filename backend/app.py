from flask import Flask, jsonify
from flask_cors import CORS

from routes.retailers import retailers_bp
from routes.products import products_bp
from routes.compare import compare_bp
from routes.trends import trends_bp
from routes.auth_routes import auth_bp
from routes.favorites import favorites_bp
from routes.lists import lists_bp
from routes.inventory import inventory_bp
from routes.alerts import alerts_bp
from routes.insight import insight_bp

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(retailers_bp)
app.register_blueprint(products_bp)
app.register_blueprint(compare_bp)
app.register_blueprint(trends_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(favorites_bp)
app.register_blueprint(lists_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(insight_bp)


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": True, "message": "Not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": True, "message": "Internal server error"}), 500


if __name__ == "__main__":
    import sys
    from config import FLASK_PORT
    port = int(sys.argv[1]) if len(sys.argv) > 1 else FLASK_PORT
    app.run(port=port, debug=True)
