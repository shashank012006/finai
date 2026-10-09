import os
import sys
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import create_app
from backend.database import db
from backend.models.transaction import Transaction
from backend.models.model_result import ModelResult
from backend.ml.train_all_models import train_and_save_all_models

def run_training():
    print("Initializing Flask context for database access...", flush=True)
    app = create_app()
    with app.app_context():
        txs = Transaction.query.all()
        if txs:
            print(f"Loading {len(txs)} transactions from PostgreSQL database for training...", flush=True)
            data = [t.to_dict() for t in txs]
            df = pd.DataFrame(data)
        else:
            csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'budgetwise_finance_dataset.csv')
            print(f"No database records found. Reading raw dataset from {csv_path}...", flush=True)
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
            else:
                print("ERROR: No data available for training.", flush=True)
                return

        model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
        print(f"Training all 10 models and saving artifacts to '{model_dir}'...", flush=True)

        try:
            metadata = train_and_save_all_models(df, model_dir)
            print("\n================ TRAINING SUCCESSFUL ================", flush=True)
            print(f"Trained At : {metadata['trained_at']}", flush=True)
            print(f"Samples    : {metadata['num_samples']}", flush=True)
            print(f"Best Model : {metadata['best_model']}", flush=True)
            print("\nModel Metrics Summary:", flush=True)
            print(f"{'Model':<20} | {'MAE':<10} | {'RMSE':<10} | {'R2':<10}", flush=True)
            print("-" * 60, flush=True)
            
            ModelResult.query.delete()
            
            for m_name, m_val in metadata['metrics'].items():
                is_best = (m_name == metadata['best_model'])
                print(f"{m_name:<20} | {m_val['mae']:<10.2f} | {m_val['rmse']:<10.2f} | {m_val['r2']:<10.4f}", flush=True)
                
                res = ModelResult(
                    model_name=m_name,
                    mae=m_val['mae'],
                    rmse=m_val['rmse'],
                    r2=m_val['r2'],
                    is_best=is_best,
                    details={'features': metadata['feature_names']}
                )
                db.session.add(res)
            
            db.session.commit()
            print("=====================================================\n", flush=True)

        except Exception as e:
            print(f"ERROR during model training: {e}", flush=True)
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    run_training()
