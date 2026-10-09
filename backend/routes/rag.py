from flask import Blueprint, request, jsonify, current_app
from backend.models.transaction import Transaction
from backend.routes.auth import token_required
from backend.services.analytics_service import calculate_user_analytics
from backend.ml.predictors import predict_user_forecast
from backend.rag.rag_engine import query_rag_assistant

rag_bp = Blueprint('rag', __name__, url_prefix='/api/rag')

@rag_bp.route('/query', methods=['POST'])
@token_required
def rag_query(current_user):
    data = request.get_json() or {}
    query_text = str(data.get('query', '')).strip()

    if not query_text:
        return jsonify({'error': 'Query text is required.'}), 400

    # 1. Fetch current user's transactions from PostgreSQL
    txs = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.desc()).all()
    tx_list = [t.to_dict() for t in txs]

    # 2. Fetch user analytics
    analytics_summary = calculate_user_analytics(tx_list)

    # 3. Fetch user forecast if available
    forecast_data = predict_user_forecast(
        user_transactions=tx_list,
        model_name='Linear Regression',
        horizon_months=6,
        model_dir=current_app.config['MODEL_DIR']
    )

    # 4. Query RAG system
    api_key = current_app.config.get('LLM_API_KEY', '')
    provider = current_app.config.get('LLM_PROVIDER', 'gemini')

    rag_response = query_rag_assistant(
        user=current_user,
        query_text=query_text,
        transactions=tx_list,
        analytics_summary=analytics_summary,
        forecast_data=forecast_data,
        api_key=api_key,
        provider=provider
    )

    return jsonify({
        'query': query_text,
        'answer': rag_response['answer'],
        'retrieved_context': rag_response['retrieved_context']
    }), 200
