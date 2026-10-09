import pandas as pd
import numpy as np

def prepare_monthly_series(df):
    """
    Transforms user transaction DataFrame into a continuous, chronological monthly expenditure time-series.
    Fills missing months between min_date and max_date with 0 expense/income.
    """
    if df is None or (isinstance(df, pd.DataFrame) and df.empty) or (isinstance(df, list) and len(df) == 0):
        return pd.DataFrame()

    if isinstance(df, list):
        df = pd.DataFrame(df)

    if 'date' not in df.columns or 'transaction_type' not in df.columns or 'amount' not in df.columns:
        return pd.DataFrame()

    df = df.copy()
    df['date'] = pd.to_datetime(df['date'])
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)

    # Filter Expenses and Income
    expenses = df[df['transaction_type'] == 'Expense'].copy()
    income = df[df['transaction_type'] == 'Income'].copy()

    if expenses.empty:
        return pd.DataFrame()

    min_period = df['date'].dt.to_period('M').min()
    max_period = df['date'].dt.to_period('M').max()

    all_periods = pd.period_range(start=min_period, end=max_period, freq='M')

    exp_monthly = expenses.groupby(expenses['date'].dt.to_period('M')).agg(
        total_expense=('amount', 'sum'),
        avg_expense=('amount', 'mean'),
        transaction_count=('amount', 'count')
    ).reindex(all_periods, fill_value=0).reset_index()
    exp_monthly.rename(columns={'index': 'year_month'}, inplace=True)

    inc_monthly = income.groupby(income['date'].dt.to_period('M')).agg(
        total_income=('amount', 'sum')
    ).reindex(all_periods, fill_value=0).reset_index()
    inc_monthly.rename(columns={'index': 'year_month'}, inplace=True)

    monthly = pd.merge(exp_monthly, inc_monthly, on='year_month', how='left')
    monthly['total_expense'] = monthly['total_expense'].fillna(0)
    monthly['total_income'] = monthly['total_income'].fillna(0)

    monthly['ds'] = monthly['year_month'].dt.to_timestamp()
    monthly['month'] = monthly['year_month'].astype(str)
    monthly['y'] = monthly['total_expense']
    monthly['actual'] = monthly['total_expense']

    monthly['savings_rate'] = (monthly['total_income'] - monthly['total_expense']) / monthly['total_income'].replace(0, np.nan)
    monthly['savings_rate'] = monthly['savings_rate'].fillna(0).clip(lower=-1.0, upper=1.0)
    monthly['month_number'] = monthly['ds'].dt.month

    monthly['lag_1'] = monthly['y'].shift(1)
    monthly['lag_2'] = monthly['y'].shift(2)
    monthly['lag_3'] = monthly['y'].shift(3)
    monthly['rolling_mean_3'] = monthly['y'].shift(1).rolling(window=3, min_periods=1).mean()

    return monthly.sort_values('ds').reset_index(drop=True)

def build_supervised_features(monthly_df):
    """
    Prepares feature matrix (X, y) for model training.
    """
    if monthly_df.empty or len(monthly_df) < 4:
        return pd.DataFrame(), pd.Series(), []

    features = ['lag_1', 'lag_2', 'lag_3', 'rolling_mean_3', 'total_income', 'savings_rate', 'transaction_count', 'month_number']
    clean_df = monthly_df.dropna(subset=['lag_1', 'lag_2', 'lag_3']).copy()
    
    if clean_df.empty:
        return pd.DataFrame(), pd.Series(), []

    X = clean_df[features]
    y = clean_df['y']

    return X, y, features
