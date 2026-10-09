from datetime import datetime
from backend.database import db

class Receipt(db.Model):
    __tablename__ = 'receipts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    merchant_name = db.Column(db.String(100), default='Unknown Merchant')
    extracted_amount = db.Column(db.Float, default=0.0)
    extracted_category = db.Column(db.String(50), default='Others')
    extracted_date = db.Column(db.Date, nullable=True)
    raw_text = db.Column(db.Text, default='')
    status = db.Column(db.String(20), default='pending')  # pending, confirmed, discarded
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'filename': self.filename,
            'merchant_name': self.merchant_name,
            'extracted_amount': round(self.extracted_amount, 2),
            'extracted_category': self.extracted_category,
            'extracted_date': self.extracted_date.strftime('%Y-%m-%d') if self.extracted_date else None,
            'raw_text': self.raw_text,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
