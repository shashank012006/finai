import pandas as pd
import numpy as np
from datetime import datetime
from backend.services.anomaly_service import detect_transaction_anomalies

def calculate_user_analytics(transactions_list):
    """
    Computes summary metrics, trends, breakdowns, and dynamic insights from user transactions.
    """
    if not transactions_list:
        return {
            'summary': {
                'total_income': 0.0,
                'total_expense': 0.0,
                'net_savings': 0.0,
                'savings_rate': 0.0,
                'transaction_count': 0,
                'avg_monthly_expense': 0.0
            },
            'monthly_trend': [],
            'category_breakdown': [],
            'payment_mode_breakdown': [],
            'top_categories': [],
            'insights': ["No transactions logged yet. Add transactions to generate analytics."],
            'anomalies': []
        }

    df = pd.DataFrame(transactions_list)
    df['date_dt'] = pd.to_datetime(df['date'])

    # Overall Summary Calculations
    incomes_df = df[df['transaction_type'] == 'Income']
    expenses_df = df[df['transaction_type'] == 'Expense']

    total_income = float(incomes_df['amount'].sum())
    total_expense = float(expenses_df['amount'].sum())
    net_savings = total_income - total_expense
    savings_rate = round((net_savings / total_income * 100), 2) if total_income > 0 else 0.0
    tx_count = len(df)

    # Monthly Grouping
    df['year_month'] = df['date_dt'].dt.to_period('M').astype(str)
    months_count = max(df['year_month'].nunique(), 1)
    avg_monthly_expense = round(total_expense / months_count, 2)

    # Monthly Trend (Income vs Expense)
    monthly_inc = incomes_df.groupby(df['date_dt'].dt.to_period('M').astype(str))['amount'].sum().to_dict()
    monthly_exp = expenses_df.groupby(df['date_dt'].dt.to_period('M').astype(str))['amount'].sum().to_dict()

    all_months = sorted(list(set(list(monthly_inc.keys()) + list(monthly_exp.keys()))))
    monthly_trend = []
    for m in all_months:
        inc = float(monthly_inc.get(m, 0.0))
        exp = float(monthly_exp.get(m, 0.0))
        sav = inc - exp
        monthly_trend.append({
            'month': m,
            'income': round(inc, 2),
            'expense': round(exp, 2),
            'savings': round(sav, 2)
        })

    # Category Breakdown
    cat_summary = expenses_df.groupby('category')['amount'].agg(['sum', 'count']).reset_index()
    cat_summary.columns = ['category', 'total', 'count']
    cat_summary['percentage'] = round((cat_summary['total'] / max(total_expense, 1)) * 100, 2)
    cat_summary = cat_summary.sort_values('total', ascending=False)
    category_breakdown = cat_summary.to_dict(orient='records')

    top_categories = category_breakdown[:5]

    # Payment Mode Breakdown
    pay_summary = df.groupby('payment_mode')['amount'].agg(['sum', 'count']).reset_index()
    pay_summary.columns = ['payment_mode', 'total', 'count']
    pay_summary['percentage'] = round((pay_summary['total'] / max(total_income + total_expense, 1)) * 100, 2)
    payment_mode_breakdown = pay_summary.to_dict(orient='records')

    # Calculate Dynamic Insights
    insights = []

    # Insight 1: Month-over-Month Expenditure Trend
    if len(monthly_trend) >= 2:
        prev_m = monthly_trend[-2]
        curr_m = monthly_trend[-1]
        diff = curr_m['expense'] - prev_m['expense']
        if diff > 0:
            pct = round((diff / max(prev_m['expense'], 1)) * 100, 1)
            insights.append(f"Monthly spending increased by {pct}% (₹{diff:.2f}) in {curr_m['month']} compared to {prev_m['month']}.")
        elif diff < 0:
            pct = round((abs(diff) / max(prev_m['expense'], 1)) * 100, 1)
            insights.append(f"Great job! Monthly spending decreased by {pct}% (₹{abs(diff):.2f}) in {curr_m['month']}.")

    # Insight 2: Highest Spending Category
    if category_breakdown:
        top_cat = category_breakdown[0]
        insights.append(f"Your highest spending category is {top_cat['category']} taking up {top_cat['percentage']}% (₹{top_cat['total']:.2f}) of total expenses.")

    # Insight 3: Savings Rate Evaluation
    if savings_rate >= 20:
        insights.append(f"Healthy savings rate of {savings_rate}%. You are exceeding the recommended 20% financial goal.")
    elif savings_rate > 0:
        insights.append(f"Your current savings rate is {savings_rate}%. Consider reducing spending in top categories to reach a 20% target.")
    else:
        insights.append(f"Caution: Total expenses exceed total income, creating a negative savings deficit of ₹{abs(net_savings):.2f}.")

    # Insight 4: Largest Single Expense
    if not expenses_df.empty:
        max_row = expenses_df.loc[expenses_df['amount'].idxmax()]
        insights.append(f"Largest single transaction was ₹{max_row['amount']:.2f} spent on {max_row['category']} on {max_row['date']}.")

    # Anomaly Detection
    anomalies = detect_transaction_anomalies(transactions_list)
    if anomalies:
        insights.append(f"Detected {len(anomalies)} unusual/anomalous transactions using Isolation Forest analysis.")

    return {
        'summary': {
            'total_income': round(total_income, 2),
            'total_expense': round(total_expense, 2),
            'net_savings': round(net_savings, 2),
            'savings_rate': savings_rate,
            'transaction_count': tx_count,
            'avg_monthly_expense': avg_monthly_expense
        },
        'monthly_trend': monthly_trend,
        'category_breakdown': category_breakdown,
        'payment_mode_breakdown': payment_mode_breakdown,
        'top_categories': top_categories,
        'insights': insights,
        'anomalies': anomalies
    }
