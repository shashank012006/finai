# Hybrid AI System for Personalized Financial Decision Support Using Forecasting and RAG

An end-to-end full-stack Artificial Intelligence and Machine Learning system for personalized financial decision support. The system integrates real PostgreSQL transaction database storage, Tesseract OCR receipt scanning, 10 Machine Learning & Deep Learning forecasting models, Isolation Forest anomaly detection, and a Retrieval-Augmented Generation (RAG) Financial Assistant using Sentence Transformers & FAISS vector search.

---

## 🚀 Key Features

1. **Secure JWT Authentication & Multi-Tenant User Isolation**:
   - Secure password hashing with Werkzeug.
   - JWT authorization token middleware.
   - Strict `user_id` database filtering preventing cross-user data access.

2. **Real PostgreSQL Database & Data Seeding**:
   - Handles real financial transaction dataset (`data/budgetwise_finance_dataset.csv`).
   - Cleans dirty currency formats, parses varied date patterns, normalizes categories and payment modes.
   - Idempotent seed script (`seed_database.py`) reporting exact insertion, duplicate skip, and error counts.

3. **Transaction Management System**:
   - Full CRUD operations (View, Create, Edit, Delete).
   - Date range filtering, category filtering, income/expense toggle, search, and sorting.

4. **Tesseract OCR Receipt Scanner**:
   - Real Tesseract OCR engine integrated with Pillow image contrast enhancement and thresholding.
   - Extracts merchant name, date, total amount, payment mode, and infers categories.
   - Interactive user review and confirmation before database commit.

5. **Financial Analytics & Isolation Forest Anomaly Detection**:
   - Calculates real-time total income, expenses, net savings, savings rate, and average monthly expenditure.
   - Interactive Recharts cashflow trends, category distribution, and payment mode breakdowns.
   - Scikit-learn **Isolation Forest** unsupervised learning model detecting spending outliers and unusual transactions.

6. **10 Model Forecasting Engine**:
   - Trains and evaluates **ALL 10 models** on chronological monthly time-series without data leakage:
     1. Moving Average
     2. Linear Regression
     3. ARIMA
     4. Prophet
     5. Random Forest
     6. XGBoost
     7. LightGBM
     8. LSTM
     9. GRU
     10. Bi-LSTM
   - Calculates empirical **MAE**, **RMSE**, and **R²** metrics on a test set.
   - Persists trained model artifacts in `models/` directory and logs metrics into PostgreSQL `model_results` table.
   - Real-time prediction engine loads saved model artifacts without retraining.

7. **RAG Financial Assistant**:
   - User-isolated context document builder.
   - `SentenceTransformers` (`all-MiniLM-L6-v2`) embeddings indexed into a `FAISS` vector index.
   - Retrieves top relevant context chunks for user queries and generates answers grounded in database figures.
   - Environment variable-based LLM API configuration with fallback answer synthesis.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, JavaScript, Recharts, Lucide Icons, Axios, Vanilla CSS Design System.
- **Backend**: Python 3.14, Flask, Flask-SQLAlchemy, Flask-CORS, PyJWT, Werkzeug.
- **Database**: PostgreSQL 16.
- **ML / AI**: Pandas, NumPy, Scikit-learn, Statsmodels, Prophet, XGBoost, LightGBM, TensorFlow / Keras, PyTesseract, Pillow, Sentence-Transformers, FAISS-CPU.

---

## 📋 System Requirements & Setup

### Prerequisites

1. **Python 3.10+** (Python 3.14 recommended)
2. **Node.js v18+ & npm**
3. **PostgreSQL 16**
4. **Tesseract OCR Engine** (`brew install tesseract`)

---

## ⚡ Quickstart Setup Commands

### 1. Start PostgreSQL Service & Create Database

```bash
# Start PostgreSQL service
brew services start postgresql@16

# Create application database
createdb finai_db
```

### 2. Set Up Python Virtual Environment & Install Dependencies

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install all backend and ML requirements
pip install -r requirements.txt
```

### 3. Initialize Database & Seed Real Dataset

```bash
# Clean, validate, and seed 14,000+ real transactions into PostgreSQL
python seed_database.py
```

### 4. Train All 10 Forecasting Models & Save Artifacts

```bash
# Execute training for all 10 ML/DL models and save artifacts to models/
python train_models.py
```

### 5. Start Backend Server

```bash
export PYTHONPATH=.
python backend/app.py
```
*Backend runs on `http://localhost:5001`.*

### 6. Start Frontend Development Server

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🔑 Environment Variables Configuration

Copy `.env.example` to `.env`:

```env
DATABASE_URL=postgresql+psycopg2://shashankv@localhost:5432/finai_db
SECRET_KEY=finai_super_secret_jwt_key_2026_production_secure_key_64_bytes
JWT_SECRET_KEY=finai_jwt_secret_token_key_9988_super_secure_64bytes_key
LLM_API_KEY=your_gemini_api_key_here
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
MODEL_DIR=models
```

---

## 🧪 Seeding & Training Metrics Summary

- **Total CSV Dataset Rows Processed**: 15,900
- **Successfully Inserted Records**: 14,125
- **Skipped Duplicates**: 847
- **Dirty / Error Filtered Rows**: 928

### 10 Forecasting Models Performance Matrix

| Rank | Model Name | MAE (Lower is Better) | RMSE | R² Score | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#1** | **LSTM** | **₹550,368.46** | **₹585,962.80** | **0.7436** | **BEST MODEL** |
| #2 | Random Forest | ₹590,707.74 | ₹668,555.64 | 0.6662 | TRAINED & SAVED |
| #3 | GRU | ₹683,600.38 | ₹708,483.60 | 0.6251 | TRAINED & SAVED |
| #4 | XGBoost | ₹777,807.61 | ₹883,366.45 | 0.4172 | TRAINED & SAVED |
| #5 | Bi-LSTM | ₹799,612.21 | ₹857,822.57 | 0.4504 | TRAINED & SAVED |
| #6 | Prophet | ₹1,023,412.03 | ₹1,257,441.99 | -0.1809 | TRAINED & SAVED |
| #7 | LightGBM | ₹1,026,538.63 | ₹1,234,885.69 | -0.1389 | TRAINED & SAVED |
| #8 | ARIMA | ₹1,028,253.87 | ₹1,165,895.74 | -0.0152 | TRAINED & SAVED |
| #9 | Moving Average | ₹1,272,355.01 | ₹1,482,035.63 | -0.6405 | TRAINED & SAVED |
| #10 | Linear Regression | ₹1,364,718.53 | ₹1,387,068.85 | -0.4370 | TRAINED & SAVED |

---

## 👤 Pre-Seeded Demo User Accounts

You can log in directly using pre-seeded test accounts:

1. **Primary Demo Account**:
   - **Email**: `demo@finai.com`
   - **Password**: `Password123!`
   - **Transactions**: 11,261 PostgreSQL records.

2. **Isolated Multi-Tenant Demo Account**:
   - **Email**: `user1@finai.com`
   - **Password**: `Password123!`
   - **Transactions**: 2,864 PostgreSQL records.

---

## 📌 Final Year AIML Demonstration Steps

1. Open `http://localhost:5173`.
2. Log in using `demo@finai.com` or register a new user.
3. Navigate to **Transaction Management** and add/edit/filter transactions.
4. Navigate to **Receipt Scanner**, upload a receipt image, inspect Tesseract OCR text, and confirm insertion into PostgreSQL.
5. Review **Analytics & Isolation Forest** anomaly flags.
6. Review the **10 Model Comparison Matrix** page.
7. Open **AI Forecasting**, select different pre-trained models (e.g., LSTM vs Random Forest), adjust horizon slider (1-12 months), and generate predictions.
8. Open **RAG AI Assistant**, click sample question chips or ask custom questions to see FAISS vector chunk retrieval and grounded response generation.
# finai
