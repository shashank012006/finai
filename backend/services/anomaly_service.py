import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

def detect_transaction_anomalies(transactions_list):
    """
    Applies Isolation Forest to detect anomalous/unusual spending transactions for the authenticated user.
    Features: transaction amount, day of month, month number.
    Returns list of transaction dicts with 'is_anomaly' (boolean) and 'anomaly_score' (float).
    """
    if not transactions_list or len(transactions_list) < 4:
        return []

    df = pd.DataFrame(transactions_list)
    expense_df = df[df['transaction_type'] == 'Expense'].copy()

    if len(expense_df) < 4:
        return []

    expense_df['date_dt'] = pd.to_datetime(expense_df['date'])
    expense_df['day_of_month'] = expense_df['date_dt'].dt.day
    expense_df['month'] = expense_df['date_dt'].dt.month

    X = expense_df[['amount', 'day_of_month', 'month']]

    # Fit Isolation Forest model
    model = IsolationForest(contamination=0.1, random_state=42)
    expense_df['anomaly_code'] = model.fit_predict(X)
    expense_df['anomaly_score'] = model.decision_function(X)

    # -1 indicates anomaly, 1 indicates normal
    anomalies = expense_df[expense_df['anomaly_code'] == -1].sort_values('amount', ascending=False)

    anomaly_results = []
    for idx, row in anomalies.iterrows():
        anomaly_results.append({
            'id': int(row['id']),
            'date': row['date'],
            'amount': round(float(row['amount']), 2),
            'category': row['category'],
            'location': row.get('location', ''),
            'notes': row.get('notes', ''),
            'anomaly_score': round(float(row['anomaly_score']), 4),
            'reason': f"Unusual amount structure (₹{row['amount']}) relative to historical pattern."
        })

    return anomaly_results
