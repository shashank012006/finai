from datetime import datetime
from flask import Blueprint, request, jsonify
from backend.database import db
from backend.models.transaction import Transaction
from backend.routes.auth import token_required

transactions_bp = Blueprint('transactions', __name__, url_prefix='/api/transactions')

@transactions_bp.route('', methods=['GET'])
@token_required
def get_transactions(current_user):
    query = Transaction.query.filter_by(user_id=current_user.id)

    # Filters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category = request.args.get('category')
    tx_type = request.args.get('type')
    search = request.args.get('search')
    sort_by = request.args.get('sort_by', 'date')
    order = request.args.get('order', 'desc')

    if start_date:
        try:
            d_start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(Transaction.date >= d_start)
        except ValueError:
            pass

    if end_date:
        try:
            d_end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(Transaction.date <= d_end)
        except ValueError:
            pass

    if category and category.lower() != 'all':
        query = query.filter(Transaction.category.ilike(f'%{category}%'))

    if tx_type and tx_type.lower() != 'all':
        query = query.filter(Transaction.transaction_type.ilike(tx_type))

    if search:
        s = f"%{search}%"
        query = query.filter(
            (Transaction.category.ilike(s)) |
            (Transaction.location.ilike(s)) |
            (Transaction.notes.ilike(s)) |
            (Transaction.payment_mode.ilike(s))
        )

    # Sorting
    if sort_by == 'amount':
        col = Transaction.amount
    else:
        col = Transaction.date

    if order == 'asc':
        query = query.order_by(col.asc(), Transaction.id.asc())
    else:
        query = query.order_by(col.desc(), Transaction.id.desc())

    txs = query.all()
    return jsonify({'transactions': [t.to_dict() for t in txs], 'count': len(txs)}), 200


@transactions_bp.route('', methods=['POST'])
@token_required
def add_transaction(current_user):
    data = request.get_json() or {}

    date_str = data.get('date')
    tx_type = data.get('transaction_type', 'Expense')
    category = data.get('category')
    amount = data.get('amount')
    payment_mode = data.get('payment_mode', 'Cash')
    location = data.get('location', '')
    notes = data.get('notes', '')

    if not date_str or not category or amount is None:
        return jsonify({'error': 'Date, category, and amount are required.'}), 400

    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    try:
        amt_val = float(amount)
        if amt_val <= 0:
            return jsonify({'error': 'Amount must be greater than zero.'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount value.'}), 400

    tx = Transaction(
        user_id=current_user.id,
        date=dt,
        transaction_type=tx_type.capitalize(),
        category=category.strip().title(),
        amount=amt_val,
        payment_mode=payment_mode.strip(),
        location=location.strip(),
        notes=notes.strip()
    )

    db.session.add(tx)
    db.session.commit()

    return jsonify({'message': 'Transaction added successfully!', 'transaction': tx.to_dict()}), 201


@transactions_bp.route('/<int:tx_id>', methods=['PUT'])
@token_required
def update_transaction(current_user, tx_id):
    tx = Transaction.query.filter_by(id=tx_id, user_id=current_user.id).first()
    if not tx:
        return jsonify({'error': 'Transaction not found or unauthorized.'}), 404

    data = request.get_json() or {}

    if 'date' in data:
        try:
            tx.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format.'}), 400

    if 'transaction_type' in data:
        tx.transaction_type = str(data['transaction_type']).capitalize()

    if 'category' in data:
        tx.category = str(data['category']).strip().title()

    if 'amount' in data:
        try:
            amt_val = float(data['amount'])
            if amt_val <= 0:
                return jsonify({'error': 'Amount must be positive.'}), 400
            tx.amount = amt_val
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid amount value.'}), 400

    if 'payment_mode' in data:
        tx.payment_mode = str(data['payment_mode']).strip()

    if 'location' in data:
        tx.location = str(data['location']).strip()

    if 'notes' in data:
        tx.notes = str(data['notes']).strip()

    db.session.commit()
    return jsonify({'message': 'Transaction updated successfully!', 'transaction': tx.to_dict()}), 200


@transactions_bp.route('/<int:tx_id>', methods=['DELETE'])
@token_required
def delete_transaction(current_user, tx_id):
    tx = Transaction.query.filter_by(id=tx_id, user_id=current_user.id).first()
    if not tx:
        return jsonify({'error': 'Transaction not found or unauthorized.'}), 404

    db.session.delete(tx)
    db.session.commit()
    return jsonify({'message': 'Transaction deleted successfully!'}), 200
