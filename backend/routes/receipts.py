import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from backend.database import db
from backend.models.receipt import Receipt
from backend.models.transaction import Transaction
from backend.routes.auth import token_required
from backend.ocr.receipt_parser import parse_receipt_image

receipts_bp = Blueprint('receipts', __name__, url_prefix='/api/receipts')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'tiff', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@receipts_bp.route('/upload', methods=['POST'])
@token_required
def upload_receipt(current_user):
    if 'file' not in request.files:
        return jsonify({'error': 'No file attached to the request.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file format. Please upload an image (PNG, JPG, JPEG, WEBP).'}), 400

    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
    saved_filename = f"{timestamp}{filename}"
    upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], saved_filename)
    
    os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
    file.save(upload_path)

    # Perform OCR
    ocr_result = parse_receipt_image(upload_path)

    if not ocr_result.get('success'):
        return jsonify(ocr_result), 400

    extracted_date = None
    if ocr_result.get('extracted_date'):
        try:
            extracted_date = datetime.strptime(ocr_result['extracted_date'], '%Y-%m-%d').date()
        except ValueError:
            pass

    receipt = Receipt(
        user_id=current_user.id,
        filename=saved_filename,
        merchant_name=ocr_result.get('merchant_name', 'Retail Store'),
        extracted_amount=ocr_result.get('extracted_amount', 0.0),
        extracted_category=ocr_result.get('extracted_category', 'Others'),
        extracted_date=extracted_date,
        raw_text=ocr_result.get('raw_text', ''),
        status='pending'
    )

    db.session.add(receipt)
    db.session.commit()

    res = receipt.to_dict()
    res['payment_mode'] = ocr_result.get('payment_mode', 'Card')
    return jsonify({
        'message': 'Receipt uploaded and scanned successfully!',
        'receipt': res
    }), 200


@receipts_bp.route('/confirm', methods=['POST'])
@token_required
def confirm_receipt(current_user):
    data = request.get_json() or {}
    receipt_id = data.get('receipt_id')

    date_str = data.get('date')
    amount = data.get('amount')
    category = data.get('category', 'Others')
    merchant = data.get('merchant_name', 'Retail Store')
    payment_mode = data.get('payment_mode', 'Card')
    notes = data.get('notes', f"Scanned Receipt: {merchant}")

    if not date_str or amount is None:
        return jsonify({'error': 'Date and amount are required.'}), 400

    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d').date()
        amt_val = float(amount)
        if amt_val <= 0:
            return jsonify({'error': 'Amount must be positive.'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid date or amount format.'}), 400

    # Update receipt status if receipt_id provided
    if receipt_id:
        r = Receipt.query.filter_by(id=receipt_id, user_id=current_user.id).first()
        if r:
            r.status = 'confirmed'

    # Save transaction to PostgreSQL
    tx = Transaction(
        user_id=current_user.id,
        date=dt,
        transaction_type='Expense',
        category=category.strip().title(),
        amount=amt_val,
        payment_mode=payment_mode.strip(),
        location=merchant.strip(),
        notes=notes.strip()
    )

    db.session.add(tx)
    db.session.commit()

    return jsonify({
        'message': 'Transaction confirmed and saved to database!',
        'transaction': tx.to_dict()
    }), 201


@receipts_bp.route('', methods=['GET'])
@token_required
def get_receipts(current_user):
    receipts = Receipt.query.filter_by(user_id=current_user.id).order_by(Receipt.created_at.desc()).all()
    return jsonify({'receipts': [r.to_dict() for r in receipts]}), 200
