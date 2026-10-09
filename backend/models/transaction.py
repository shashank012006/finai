from datetime import datetime
from backend.database import db

class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    transaction_type = db.Column(db.String(20), nullable=False)  # Expense or Income
    category = db.Column(db.String(50), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    payment_mode = db.Column(db.String(50), default='Cash')
    location = db.Column(db.String(100), default='')
    notes = db.Column(db.String(255), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date': self.date.strftime('%Y-%m-%d') if self.date else None,
            'transaction_type': self.transaction_type,
            'category': self.category,
            'amount': round(self.amount, 2),
            'payment_mode': self.payment_mode,
            'location': self.location,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
