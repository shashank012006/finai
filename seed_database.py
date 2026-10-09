import os
import sys
import re
import pandas as pd
from datetime import datetime
from dateutil import parser as date_parser

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import create_app
from backend.database import db
from backend.models.user import User
from backend.models.transaction import Transaction

def clean_amount(val):
    if pd.isna(val):
        return None
    val_str = str(val).strip()
    # Remove currency symbols and commas
    cleaned = re.sub(r'[^\d.]', '', val_str)
    if not cleaned:
        return None
    try:
        amt = float(cleaned)
        # Filter extreme un-realistic dataset outliers (e.g. 999999999)
        if amt <= 0 or amt > 1000000:
            return None
        return amt
    except ValueError:
        return None

def parse_flexible_date(val):
    if pd.isna(val):
        return None
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ['n/a', 'none', 'null', '']:
        return None
    
    # Try exact formats first to avoid m/d vs d/m ambiguities where possible
    formats = [
        '%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%d-%m-%Y',
        '%d-%m-%y', '%m/%d/%y', '%Y/%m/%d', '%Y-%m-%d %H:%M:%S'
    ]
    for fmt in formats:
        try:
            return datetime.strptime(val_str, fmt).date()
        except ValueError:
            pass
            
    # Fallback to dateutil parser
    try:
        return date_parser.parse(val_str, dayfirst=False).date()
    except Exception:
        try:
            return date_parser.parse(val_str, dayfirst=True).date()
        except Exception:
            return None

def normalize_category(cat):
    if pd.isna(cat):
        return 'Others'
    c = str(cat).strip().lower()
    if any(k in c for k in ['food', 'fod', 'restaurant', 'dinner', 'grocery']):
        return 'Food'
    if any(k in c for k in ['rent']):
        return 'Rent'
    if any(k in c for k in ['util', 'electricity', 'water', 'bill']):
        return 'Utilities'
    if any(k in c for k in ['edu', 'school', 'book']):
        return 'Education'
    if any(k in c for k in ['enter', 'movie', 'game']):
        return 'Entertainment'
    if any(k in c for k in ['free', 'freelance']):
        return 'Freelance'
    if any(k in c for k in ['sal', 'salary']):
        return 'Salary'
    if any(k in c for k in ['shop', 'cloth']):
        return 'Shopping'
    if any(k in c for k in ['health', 'med', 'gym']):
        return 'Healthcare'
    if any(k in c for k in ['trans', 'travel', 'cab', 'uber', 'fuel']):
        return 'Transportation'
    if any(k in c for k in ['invest', 'stock']):
        return 'Investment'
    return 'Others'

def normalize_payment_mode(mode):
    if pd.isna(mode):
        return 'Others'
    m = str(mode).strip().lower()
    if any(k in m for k in ['csh', 'cash']):
        return 'Cash'
    if any(k in m for k in ['crd', 'card', 'credit', 'debit']):
        return 'Card'
    if any(k in m for k in ['upi']):
        return 'UPI'
    if any(k in m for k in ['bank', 'transfer', 'neft', 'imps']):
        return 'Bank Transfer'
    return 'Others'

def seed():
    app = create_app()
    with app.app_context():
        print("Creating PostgreSQL tables if they don't exist...")
        db.create_all()

        # 1. Create Default Demo Users
        users_data = [
            {'name': 'Demo User', 'email': 'demo@finai.com', 'password': 'Password123!'},
            {'name': 'Alex Johnson', 'email': 'user1@finai.com', 'password': 'Password123!'},
            {'name': 'Sam Smith', 'email': 'user2@finai.com', 'password': 'Password123!'}
        ]

        created_users = {}
        for u_info in users_data:
            user = User.query.filter_by(email=u_info['email']).first()
            if not user:
                user = User(name=u_info['name'], email=u_info['email'])
                user.set_password(u_info['password'])
                db.session.add(user)
                db.session.commit()
                print(f"Created user: {user.email} (ID: {user.id})")
            else:
                print(f"User already exists: {user.email} (ID: {user.id})")
            created_users[u_info['email']] = user

        primary_user = created_users['demo@finai.com']
        secondary_user = created_users['user1@finai.com']

        # 2. Inspect CSV Dataset
        csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'budgetwise_finance_dataset.csv')
        if not os.path.exists(csv_path):
            print(f"ERROR: Dataset not found at {csv_path}")
            return

        print(f"Reading dataset from {csv_path}...")
        df = pd.read_csv(csv_path)
        total_rows = len(df)
        print(f"Total raw rows in CSV: {total_rows}")
        print("Sample columns:", df.columns.tolist())

        inserted_count = 0
        skipped_count = 0
        error_count = 0

        # Create a set of existing transactions to avoid duplicates
        existing_txs = set()
        for t in Transaction.query.all():
            existing_txs.add((t.user_id, t.date.strftime('%Y-%m-%d'), round(t.amount, 2), t.category))

        batch = []
        raw_user_map = {}

        for idx, row in df.iterrows():
            # Validate amount
            amt = clean_amount(row.get('amount'))
            if amt is None:
                error_count += 1
                continue

            # Validate date
            dt = parse_flexible_date(row.get('date'))
            if dt is None:
                error_count += 1
                continue

            raw_uid = str(row.get('user_id', '')).strip()
            # Map raw user IDs consistently (first 80% to demo user, rest to user1 for multi-user isolation demo)
            if raw_uid not in raw_user_map:
                if len(raw_user_map) % 5 == 0:
                    raw_user_map[raw_uid] = secondary_user.id
                else:
                    raw_user_map[raw_uid] = primary_user.id
            
            target_user_id = raw_user_map[raw_uid]

            tx_type = str(row.get('transaction_type', 'Expense')).strip().capitalize()
            if tx_type not in ['Income', 'Expense']:
                tx_type = 'Expense'

            cat = normalize_category(row.get('category'))
            p_mode = normalize_payment_mode(row.get('payment_mode'))
            loc = str(row.get('location', '')).strip()
            if loc.lower() in ['n/a', 'nan', 'none']:
                loc = ''

            notes = str(row.get('notes', '')).strip()
            if notes.lower() in ['n/a', 'nan', 'none', 'asdfgh', 'xyz123']:
                notes = ''

            date_str = dt.strftime('%Y-%m-%d')
            tx_key = (target_user_id, date_str, round(amt, 2), cat)

            if tx_key in existing_txs:
                skipped_count += 1
                continue

            existing_txs.add(tx_key)

            tx = Transaction(
                user_id=target_user_id,
                date=dt,
                transaction_type=tx_type,
                category=cat,
                amount=amt,
                payment_mode=p_mode,
                location=loc,
                notes=notes
            )
            batch.append(tx)
            inserted_count += 1

            if len(batch) >= 1000:
                db.session.bulk_save_objects(batch)
                db.session.commit()
                batch = []

        if batch:
            db.session.bulk_save_objects(batch)
            db.session.commit()

        print("\n================ SEEDING COMPLETE ================")
        print(f"Total Rows Processed : {total_rows}")
        print(f"Successfully Inserted: {inserted_count}")
        print(f"Skipped Duplicates   : {skipped_count}")
        print(f"Error/Filtered Rows  : {error_count}")
        print("==================================================\n")

if __name__ == '__main__':
    seed()
