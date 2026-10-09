from datetime import datetime
from backend.database import db

class ModelResult(db.Model):
    __tablename__ = 'model_results'

    id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(50), nullable=False)
    mae = db.Column(db.Float, nullable=False)
    rmse = db.Column(db.Float, nullable=False)
    r2 = db.Column(db.Float, nullable=False)
    is_best = db.Column(db.Boolean, default=False)
    details = db.Column(db.JSON, default={})
    trained_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'model_name': self.model_name,
            'mae': round(self.mae, 2),
            'rmse': round(self.rmse, 2),
            'r2': round(self.r2, 4),
            'is_best': self.is_best,
            'details': self.details,
            'trained_at': self.trained_at.isoformat() if self.trained_at else None
        }


class Forecast(db.Model):
    __tablename__ = 'forecasts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    model_name = db.Column(db.String(50), nullable=False)
    horizon_months = db.Column(db.Integer, default=6)
    predictions = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'model_name': self.model_name,
            'horizon_months': self.horizon_months,
            'predictions': self.predictions,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
