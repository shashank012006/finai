import os
import json
from flask import Blueprint, request, jsonify, current_app
from backend.database import db
from backend.models.transaction import Transaction
from backend.models.model_result import ModelResult, Forecast
from backend.routes.auth import token_required
from backend.ml.predictors import predict_user_forecast

forecast_bp = Blueprint('forecast', __name__, url_prefix='/api')

AVAILABLE_MODELS = [
    'Moving Average',
    'Linear Regression',
    'ARIMA',
    'Prophet',
    'Random Forest',
    'XGBoost',
    'LightGBM',
    'LSTM',
    'GRU',
    'Bi-LSTM'
]

@forecast_bp.route('/models', methods=['GET'])
def get_models():
    return jsonify({'models': AVAILABLE_MODELS}), 200


@forecast_bp.route('/models/metrics', methods=['GET'])
def get_model_metrics():
    results = ModelResult.query.order_by(ModelResult.mae.asc()).all()
    if results:
        res_list = [r.to_dict() for r in results]
        best_model = next((r['model_name'] for r in res_list if r['is_best']), res_list[0]['model_name'])
        return jsonify({
            'metrics': res_list,
            'best_model': best_model,
            'trained_at': results[0].trained_at.isoformat() if results[0].trained_at else None
        }), 200

    # Fallback to reading metrics.json file if db record not present yet
    metrics_path = os.path.join(current_app.config['MODEL_DIR'], 'metrics.json')
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, 'r') as f:
                data = json.load(f)
            formatted = []
            for m_name, m_val in data.get('metrics', {}).items():
                formatted.append({
                    'model_name': m_name,
                    'mae': m_val['mae'],
                    'rmse': m_val['rmse'],
                    'r2': m_val['r2'],
                    'is_best': (m_name == data.get('best_model'))
                })
            return jsonify({
                'metrics': sorted(formatted, key=lambda x: x['mae']),
                'best_model': data.get('best_model'),
                'trained_at': data.get('trained_at')
            }), 200
        except Exception as e:
            return jsonify({'error': f'Failed to load metrics: {str(e)}'}), 500

    return jsonify({'metrics': [], 'best_model': None, 'message': 'No trained model metrics found. Run python train_models.py first.'}), 200


@forecast_bp.route('/forecast', methods=['POST'])
@token_required
def generate_forecast(current_user):
    data = request.get_json() or {}
    model_name = data.get('model_name', 'Linear Regression')
    horizon_months = int(data.get('horizon_months', 6))

    if horizon_months < 1 or horizon_months > 24:
        return jsonify({'error': 'Horizon months must be between 1 and 24.'}), 400

    # Fetch authenticated user's transactions from PostgreSQL
    txs = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.asc()).all()
    tx_list = [t.to_dict() for t in txs]

    forecast_result = predict_user_forecast(
        user_transactions=tx_list,
        model_name=model_name,
        horizon_months=horizon_months,
        model_dir=current_app.config['MODEL_DIR'],
        user_id=current_user.id
    )

    if forecast_result.get('insufficient_data'):
        return jsonify({
            'error': forecast_result.get('error'),
            'insufficient_data': True,
            'historical': forecast_result.get('historical', []),
            'predictions': []
        }), 200

    if forecast_result.get('error'):
        return jsonify({'error': forecast_result.get('error')}), 400

    # Save generated forecast record in db
    fc_record = Forecast(
        user_id=current_user.id,
        model_name=model_name,
        horizon_months=horizon_months,
        predictions=forecast_result.get('predictions', [])
    )
    db.session.add(fc_record)
    db.session.commit()

    return jsonify({
        'message': 'Forecast generated successfully using saved model!',
        'forecast': forecast_result
    }), 200
