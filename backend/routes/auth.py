import jwt
from functools import wraps
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app

from backend.database import db
from backend.models.user import User

from datetime import datetime, timedelta, timezone

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            parts = auth_header.split(' ')
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
                
        if not token:
            return jsonify({'error': 'Authentication token is missing!'}), 401
            
        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            user_id = int(payload['sub'])
            current_user = User.query.get(user_id)
            if not current_user:
                return jsonify({'error': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired! Please login again.'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': f'Invalid authentication token! ({str(e)})'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = str(data.get('name', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', '')).strip()

    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password are required fields.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email address already exists.'}), 409

    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {'sub': str(user.id), 'iat': now, 'exp': now + timedelta(days=7)},
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )

    return jsonify({
        'message': 'User registered successfully!',
        'token': token,
        'user': user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', '')).strip()

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password.'}), 401

    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {'sub': str(user.id), 'iat': now, 'exp': now + timedelta(days=7)},
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )

    return jsonify({
        'message': 'Login successful!',
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Logged out successfully.'}), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    return jsonify({'user': current_user.to_dict()}), 200
