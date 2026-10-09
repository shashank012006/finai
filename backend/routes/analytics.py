from flask import Blueprint, jsonify
from backend.models.transaction import Transaction
from backend.routes.auth import token_required
from backend.services.analytics_service import calculate_user_analytics

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/summary', methods=['GET'])
@token_required
def get_analytics_summary(current_user):
    txs = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.asc()).all()
    tx_list = [t.to_dict() for t in txs]
    
    analytics_data = calculate_user_analytics(tx_list)
    return jsonify(analytics_data), 200

@analytics_bp.route('/monthly', methods=['GET'])
@token_required
def get_monthly_trends(current_user):
    txs = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.asc()).all()
    tx_list = [t.to_dict() for t in txs]
    analytics_data = calculate_user_analytics(tx_list)
    return jsonify({'monthly_trend': analytics_data['monthly_trend']}), 200

@analytics_bp.route('/categories', methods=['GET'])
@token_required
def get_category_breakdown(current_user):
    txs = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.asc()).all()
    tx_list = [t.to_dict() for t in txs]
    analytics_data = calculate_user_analytics(tx_list)
    return jsonify({'category_breakdown': analytics_data['category_breakdown']}), 200

@analytics_bp.route('/insights', methods=['GET'])
@token_required
def get_insights(current_user):
    txs = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.asc()).all()
    tx_list = [t.to_dict() for t in txs]
    analytics_data = calculate_user_analytics(tx_list)
    return jsonify({
        'insights': analytics_data['insights'],
        'anomalies': analytics_data['anomalies']
    }), 200
