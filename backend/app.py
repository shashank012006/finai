import os
import sys

# Ensure root project directory is in python path regardless of execution CWD
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from backend.config import Config
from backend.database import db, init_db

# Import Blueprints
from backend.routes.auth import auth_bp
from backend.routes.transactions import transactions_bp
from backend.routes.receipts import receipts_bp
from backend.routes.analytics import analytics_bp
from backend.routes.forecast import forecast_bp
from backend.routes.rag import rag_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for local dev
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize Database
    init_db(app)

    # Create upload directory if not exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['MODEL_DIR'], exist_ok=True)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(receipts_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(forecast_bp)
    app.register_blueprint(rag_bp)

    # Serve uploaded receipt files
    @app.route('/uploads/<filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Requested API endpoint not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'FinAI Backend Engine'}), 200

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5001, debug=True)
