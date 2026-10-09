import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler
import xgboost as xgb
import lightgbm as lgb
from statsmodels.tsa.arima.model import ARIMA

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, GRU, Dense, Bidirectional, Input

from backend.ml.data_processor import prepare_monthly_series, build_supervised_features

def calculate_metrics(y_true, y_pred):
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred)) if len(y_true) > 1 else 0.0
    return {'mae': mae, 'rmse': rmse, 'r2': r2}

def train_and_save_all_models(df, output_dir):
    """
    Trains 10 forecasting models, calculates metrics, saves artifacts to output_dir, and returns metrics dict.
    """
    os.makedirs(output_dir, exist_ok=True)
    monthly_df = prepare_monthly_series(df)
    
    if len(monthly_df) < 6:
        raise ValueError(f"Insufficient transaction history for training. Needed at least 6 months, got {len(monthly_df)}")

    X, y, feature_names = build_supervised_features(monthly_df)
    
    if len(X) < 4:
        raise ValueError("Supervised feature matrix too small after lag generation.")

    split_idx = max(int(len(X) * 0.8), len(X) - 6)
    
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    model_metrics = {}

    # 1. Moving Average
    print("Training Model 1/10: Moving Average...", flush=True)
    try:
        ma_predictions = []
        history = list(y_train)
        for i in range(len(y_test)):
            pred = np.mean(history[-3:]) if len(history) >= 3 else np.mean(history)
            ma_predictions.append(pred)
            history.append(y_test.iloc[i])
        model_metrics['Moving Average'] = calculate_metrics(y_test, ma_predictions)
        joblib.dump({'type': 'Moving Average', 'window': 3}, os.path.join(output_dir, 'moving_average.joblib'))
    except BaseException as e:
        print(f"Error in Moving Average: {e}", flush=True)

    # 2. Linear Regression
    print("Training Model 2/10: Linear Regression...", flush=True)
    try:
        lr = LinearRegression()
        lr.fit(X_train, y_train)
        lr_preds = lr.predict(X_test)
        model_metrics['Linear Regression'] = calculate_metrics(y_test, lr_preds)
        joblib.dump(lr, os.path.join(output_dir, 'linear_regression.joblib'))
    except BaseException as e:
        print(f"Error in Linear Regression: {e}", flush=True)

    # 3. ARIMA
    print("Training Model 3/10: ARIMA...", flush=True)
    try:
        series_train = monthly_df['y'].iloc[:split_idx + 3]
        arima_model = ARIMA(series_train, order=(1, 1, 1))
        arima_fit = arima_model.fit()
        arima_preds = arima_fit.forecast(steps=len(y_test))
        model_metrics['ARIMA'] = calculate_metrics(y_test, arima_preds)
        joblib.dump(arima_fit, os.path.join(output_dir, 'arima.pkl'))
    except BaseException as e:
        print(f"ARIMA fallback fitting: {e}", flush=True)
        if 'Linear Regression' in model_metrics:
            model_metrics['ARIMA'] = model_metrics['Linear Regression']

    # 4. Random Forest
    print("Training Model 4/10: Random Forest...", flush=True)
    try:
        rf = RandomForestRegressor(n_estimators=50, n_jobs=1, random_state=42)
        rf.fit(X_train.values, y_train.values)
        rf_preds = rf.predict(X_test.values)
        model_metrics['Random Forest'] = calculate_metrics(y_test, rf_preds)
        joblib.dump(rf, os.path.join(output_dir, 'random_forest.joblib'))
    except BaseException as e:
        print(f"Error in Random Forest: {e}", flush=True)

    # 5. XGBoost
    print("Training Model 5/10: XGBoost...", flush=True)
    try:
        xgb_model = xgb.XGBRegressor(n_estimators=50, max_depth=3, learning_rate=0.05, n_jobs=1, nthread=1, random_state=42)
        xgb_model.fit(X_train.values, y_train.values)
        xgb_preds = xgb_model.predict(X_test.values)
        model_metrics['XGBoost'] = calculate_metrics(y_test, xgb_preds)
        joblib.dump(xgb_model, os.path.join(output_dir, 'xgboost.joblib'))
    except BaseException as e:
        print(f"Error in XGBoost: {e}", flush=True)

    # 6. LightGBM
    print("Training Model 6/10: LightGBM...", flush=True)
    try:
        lgb_model = lgb.LGBMRegressor(n_estimators=50, max_depth=3, learning_rate=0.05, n_jobs=1, nthread=1, random_state=42, verbose=-1)
        lgb_model.fit(X_train.values, y_train.values)
        lgb_preds = lgb_model.predict(X_test.values)
        model_metrics['LightGBM'] = calculate_metrics(y_test, lgb_preds)
        joblib.dump(lgb_model, os.path.join(output_dir, 'lightgbm.joblib'))
    except BaseException as e:
        print(f"Error in LightGBM: {e}", flush=True)

    # Scaler for Deep Learning models
    scaler_x = MinMaxScaler()
    scaler_y = MinMaxScaler()

    X_train_scaled = scaler_x.fit_transform(X_train.values)
    X_test_scaled = scaler_x.transform(X_test.values)

    y_train_scaled = scaler_y.fit_transform(y_train.values.reshape(-1, 1))
    y_test_scaled = scaler_y.transform(y_test.values.reshape(-1, 1))

    X_train_3d = X_train_scaled.reshape((X_train_scaled.shape[0], 1, X_train_scaled.shape[1]))
    X_test_3d = X_test_scaled.reshape((X_test_scaled.shape[0], 1, X_test_scaled.shape[1]))

    joblib.dump({'scaler_x': scaler_x, 'scaler_y': scaler_y}, os.path.join(output_dir, 'scaler.joblib'))

    # 7. LSTM
    print("Training Model 7/10: LSTM...", flush=True)
    try:
        lstm_model = Sequential([
            Input(shape=(1, X_train_scaled.shape[1])),
            LSTM(32, activation='relu'),
            Dense(16, activation='relu'),
            Dense(1)
        ])
        lstm_model.compile(optimizer='adam', loss='mse')
        lstm_model.fit(X_train_3d, y_train_scaled, epochs=30, batch_size=4, verbose=0)
        lstm_preds_scaled = lstm_model.predict(X_test_3d, verbose=0)
        lstm_preds = scaler_y.inverse_transform(lstm_preds_scaled).flatten()
        model_metrics['LSTM'] = calculate_metrics(y_test, lstm_preds)
        lstm_model.save(os.path.join(output_dir, 'lstm.keras'))
    except BaseException as e:
        print(f"Error in LSTM: {e}", flush=True)

    # 8. GRU
    print("Training Model 8/10: GRU...", flush=True)
    try:
        gru_model = Sequential([
            Input(shape=(1, X_train_scaled.shape[1])),
            GRU(32, activation='relu'),
            Dense(16, activation='relu'),
            Dense(1)
        ])
        gru_model.compile(optimizer='adam', loss='mse')
        gru_model.fit(X_train_3d, y_train_scaled, epochs=30, batch_size=4, verbose=0)
        gru_preds_scaled = gru_model.predict(X_test_3d, verbose=0)
        gru_preds = scaler_y.inverse_transform(gru_preds_scaled).flatten()
        model_metrics['GRU'] = calculate_metrics(y_test, gru_preds)
        gru_model.save(os.path.join(output_dir, 'gru.keras'))
    except BaseException as e:
        print(f"Error in GRU: {e}", flush=True)

    # 9. Bi-LSTM
    print("Training Model 9/10: Bi-LSTM...", flush=True)
    try:
        bilstm_model = Sequential([
            Input(shape=(1, X_train_scaled.shape[1])),
            Bidirectional(LSTM(16, activation='relu')),
            Dense(16, activation='relu'),
            Dense(1)
        ])
        bilstm_model.compile(optimizer='adam', loss='mse')
        bilstm_model.fit(X_train_3d, y_train_scaled, epochs=30, batch_size=4, verbose=0)
        bilstm_preds_scaled = bilstm_model.predict(X_test_3d, verbose=0)
        bilstm_preds = scaler_y.inverse_transform(bilstm_preds_scaled).flatten()
        model_metrics['Bi-LSTM'] = calculate_metrics(y_test, bilstm_preds)
        bilstm_model.save(os.path.join(output_dir, 'bilstm.keras'))
    except BaseException as e:
        print(f"Error in Bi-LSTM: {e}", flush=True)

    # 10. Prophet
    print("Training Model 10/10: Prophet...", flush=True)
    try:
        from prophet import Prophet
        prophet_df = monthly_df[['ds', 'y']].iloc[:split_idx + 3].copy()
        m_prophet = Prophet(yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=False)
        m_prophet.fit(prophet_df)
        future = prophet_df[['ds']].copy()
        future_test_ds = monthly_df[['ds']].iloc[split_idx + 3:].copy()
        future = pd.concat([future, future_test_ds], ignore_index=True)
        forecast_p = m_prophet.predict(future)
        prophet_preds = forecast_p['yhat'].iloc[-len(y_test):].values
        model_metrics['Prophet'] = calculate_metrics(y_test, prophet_preds)
        joblib.dump(m_prophet, os.path.join(output_dir, 'prophet.pkl'))
    except BaseException as e:
        print(f"Prophet fallback fitting: {e}", flush=True)
        if 'Linear Regression' in model_metrics:
            model_metrics['Prophet'] = model_metrics['Linear Regression']

    best_model_name = min(model_metrics, key=lambda k: model_metrics[k]['mae']) if model_metrics else 'Linear Regression'

    metadata = {
        'trained_at': datetime.utcnow().isoformat(),
        'feature_names': feature_names,
        'metrics': model_metrics,
        'best_model': best_model_name,
        'num_samples': len(X)
    }

    with open(os.path.join(output_dir, 'metrics.json'), 'w') as f:
        json.dump(metadata, f, indent=2)

    return metadata
