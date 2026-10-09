import os
import re
import requests
import json
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
import faiss

# Global cache for sentence transformer model
_EMBEDDING_MODEL = None

CATEGORIES_LIST = [
    'food', 'rent', 'utilities', 'education', 'entertainment',
    'shopping', 'healthcare', 'transportation', 'salary', 'freelance', 'investment', 'others'
]

def get_embedding_model():
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        _EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
    return _EMBEDDING_MODEL

def generate_user_financial_documents(user, transactions, analytics_summary, forecast_data=None):
    """
    Constructs user-isolated financial context chunks from authenticated user records.
    """
    docs = []

    # 1. Profile & Executive Summary Chunk
    summary_text = (
        f"User Profile: Name: {user.name}, Email: {user.email}. "
        f"Financial Summary: Total Income: ₹{analytics_summary['summary']['total_income']:,.2f}, "
        f"Total Expenses: ₹{analytics_summary['summary']['total_expense']:,.2f}, "
        f"Net Savings: ₹{analytics_summary['summary']['net_savings']:,.2f}, "
        f"Savings Rate: {analytics_summary['summary']['savings_rate']}%, "
        f"Average Monthly Expenditure: ₹{analytics_summary['summary']['avg_monthly_expense']:,.2f}."
    )
    docs.append(summary_text)

    # 2. Category Breakdown Chunk
    if analytics_summary.get('category_breakdown'):
        cat_texts = []
        for cat in analytics_summary['category_breakdown']:
            cat_texts.append(f"Category {cat['category']}: Total ₹{cat['total']:,.2f} across {cat['count']} transactions ({cat['percentage']}% of expenses).")
        docs.append("Category Spending Breakdown: " + " ".join(cat_texts))

    # 3. Monthly Financial Trends Chunk
    if analytics_summary.get('monthly_trend'):
        trend_texts = []
        for m in analytics_summary['monthly_trend']:
            trend_texts.append(f"Month {m['month']}: Income ₹{m['income']:,.2f}, Expense ₹{m['expense']:,.2f}, Savings ₹{m['savings']:,.2f}.")
        docs.append("Monthly Financial Trends: " + " ".join(trend_texts))

    # 4. Dynamic Insights & Anomalies Chunk
    if analytics_summary.get('insights'):
        docs.append("Dynamic Insights: " + " ".join(analytics_summary['insights']))

    # 5. Forecast Predictions Chunk
    if forecast_data and not forecast_data.get('insufficient_data') and forecast_data.get('predictions'):
        preds_text = ", ".join([f"{p['month']}: ₹{p['amount']:,.2f}" for p in forecast_data['predictions']])
        docs.append(f"Forecast Predictions ({forecast_data.get('model_name', 'Best Model')}): Projected expenditure for upcoming months: {preds_text}.")

    # 6. Detailed Transactions List Chunk
    if transactions:
        tx_lines = []
        for t in transactions[:30]:
            tx_lines.append(f"TX #{t['id']} on {t['date']}: {t['transaction_type']} ₹{t['amount']:,.2f} for '{t['category']}' via {t['payment_mode']} at '{t['location']}'. Notes: {t['notes']}")
        docs.append("Recent Transactions List:\n" + "\n".join(tx_lines))

    return docs

def build_faiss_index(docs):
    if not docs:
        return None, []
    model = get_embedding_model()
    embeddings = model.encode(docs)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(embeddings).astype('float32'))
    return index, docs

def detect_and_answer_financial_intent(query_text, user, transactions, analytics_summary, forecast_data):
    """
    Answers exact numerical questions using direct PostgreSQL/analytics calculations.
    Returns string answer if intent matches, or None if generative reasoning is required.
    """
    q = query_text.lower().strip()
    
    df = pd.DataFrame(transactions) if transactions else pd.DataFrame()
    if not df.empty and 'date' in df.columns:
        df['date_dt'] = pd.to_datetime(df['date'])
        df['year_month'] = df['date_dt'].dt.to_period('M')

    latest_period = df['year_month'].max() if not df.empty else None
    last_month_period = (latest_period - 1) if latest_period is not None else None

    # 1. Specific Category Spending (e.g., "What did I spend on food last month?")
    cat_match = None
    for cat in CATEGORIES_LIST:
        if re.search(r'\b' + cat + r'\b', q):
            cat_match = cat
            break

    if cat_match and any(kw in q for kw in ['spend', 'spent', 'cost', 'pay', 'paid', 'expense', 'much']):
        cat_title = cat_match.capitalize()
        if not df.empty:
            exp_df = df[(df['transaction_type'] == 'Expense') & (df['category'].str.lower() == cat_match)]
            
            if any(kw in q for kw in ['last month', 'previous month', 'past month']):
                if last_month_period is not None:
                    period_df = exp_df[exp_df['year_month'] == last_month_period]
                    month_name = last_month_period.strftime('%B %Y')
                    total_amt = float(period_df['amount'].sum())
                    tx_count = len(period_df)
                    if total_amt > 0:
                        return f"You spent ₹{total_amt:,.2f} on {cat_title} last month ({month_name}) across {tx_count} transaction(s)."
                    else:
                        return f"You spent ₹0.00 on {cat_title} last month ({month_name})."
            
            total_amt = float(exp_df['amount'].sum())
            tx_count = len(exp_df)
            return f"You have spent a total of ₹{total_amt:,.2f} on {cat_title} across {tx_count} transaction(s)."
        else:
            return f"No recorded transactions for {cat_title}."

    # 2. Highest Spending Category ("Which category do I spend the most on?")
    if any(kw in q for kw in ['most', 'highest category', 'top category', 'spend the most']):
        cat_bd = analytics_summary.get('category_breakdown', [])
        if cat_bd:
            top = cat_bd[0]
            return f"{top['category']} is your highest spending category at ₹{top['total']:,.2f}, representing {top['percentage']}% of your total expenses."
        return "No category spending records available."

    # 3. Highest Single Expense ("What was my highest expense transaction?")
    if any(kw in q for kw in ['highest expense', 'largest expense', 'biggest expense', 'largest transaction', 'biggest transaction']):
        if not df.empty:
            exp_df = df[df['transaction_type'] == 'Expense']
            if not exp_df.empty:
                max_tx = exp_df.loc[exp_df['amount'].idxmax()]
                notes_str = f" ({max_tx['notes']})" if max_tx.get('notes') and max_tx['notes'].lower() not in ['n/a', 'none', ''] else ""
                return f"Your highest single expense transaction was ₹{max_tx['amount']:,.2f} spent on {max_tx['category']} on {max_tx['date']}{notes_str}."
        return "No expense transactions recorded."

    # 4. Savings Rate & Savings ("What is my current savings rate?", "What is my current savings?")
    if any(kw in q for kw in ['savings rate', 'savings percentage', 'savings deficit', 'current savings', 'how much savings']):
        savings_val = analytics_summary['summary']['net_savings']
        rate_val = analytics_summary['summary']['savings_rate']
        return f"Your current savings rate is {rate_val}% with net savings of ₹{savings_val:,.2f}."

    # 5. Total Expenditure ("What is my total expenditure?")
    if any(kw in q for kw in ['total expenditure', 'total expense', 'total spent', 'all expenses']):
        tot_exp = analytics_summary['summary']['total_expense']
        tot_inc = analytics_summary['summary']['total_income']
        return f"Your total expenditure across all transactions is ₹{tot_exp:,.2f} (against total income of ₹{tot_inc:,.2f})."

    # 6. Predicted Expenditure ("What is my predicted expenditure for next month?")
    if any(kw in q for kw in ['predicted', 'forecast', 'future expense', 'next month expense', 'projected']):
        if forecast_data and not forecast_data.get('insufficient_data') and forecast_data.get('predictions'):
            next_p = forecast_data['predictions'][0]
            model_used = forecast_data.get('model_name', 'selected')
            month_label = next_p.get('month') or next_p.get('date')
            amt_val = next_p.get('predicted') or next_p.get('amount') or 0
            return f"Your predicted expenditure for next month ({month_label}) is approximately ₹{amt_val:,.2f} using the {model_used} forecasting model."
        return "Insufficient monthly transaction history for personalized forecasting. Please add transactions across multiple months."

    return None

def query_rag_assistant(user, query_text, transactions, analytics_summary, forecast_data=None, api_key='', provider='gemini'):
    """
    RAG Assistant Handler:
    1. Checks deterministic intent first (exact DB calculation).
    2. Uses FAISS retrieval + LLM synthesis for reasoning questions.
    3. Handles LLM missing key gracefully.
    """
    if not query_text or not query_text.strip():
        return {'answer': 'Please enter a valid financial question.', 'retrieved_context': []}

    # 1. Intent Detection for Exact Calculations
    direct_answer = detect_and_answer_financial_intent(query_text, user, transactions, analytics_summary, forecast_data)
    
    docs = generate_user_financial_documents(user, transactions, analytics_summary, forecast_data)
    index, indexed_docs = build_faiss_index(docs)
    
    retrieved_chunks = []
    if index and indexed_docs:
        model = get_embedding_model()
        query_emb = model.encode([query_text]).astype('float32')
        k = min(3, len(indexed_docs))
        distances, indices = index.search(query_emb, k)
        retrieved_chunks = [indexed_docs[i] for i in indices[0] if i < len(indexed_docs)]

    if direct_answer:
        return {
            'answer': direct_answer,
            'retrieved_context': retrieved_chunks
        }

    # 2. Reasoning Questions (FAISS Context + LLM Call)
    context_str = "\n\n".join(retrieved_chunks) if retrieved_chunks else "No relevant context found."
    answer = call_llm_api(query_text, context_str, user.name, analytics_summary, api_key, provider)

    return {
        'answer': answer,
        'retrieved_context': retrieved_chunks
    }

def call_llm_api(query, context, user_name, analytics_summary, api_key, provider):
    """
    Calls Gemini API if valid key is set. If API key is not configured or fails,
    synthesizes a clean deterministic answer from financial insights.
    """
    system_prompt = (
        f"You are a personalized AI Financial Assistant for {user_name}.\n"
        f"Base your answer STRICTLY on the retrieved financial context below.\n"
        f"Be concise, clear, and professional. Mention specific categories, dates, or numbers in ₹ when relevant.\n"
        f"Do NOT invent numbers outside the context.\n\n"
        f"RETRIEVED FINANCIAL CONTEXT:\n{context}\n\n"
        f"USER QUESTION:\n{query}"
    )

    if api_key and len(api_key) > 20 and provider.lower() == 'gemini':
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            headers = {'Content-Type': 'application/json'}
            payload = {
                "contents": [{"parts": [{"text": system_prompt}]}]
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                res_data = resp.json()
                if 'candidates' in res_data and res_data['candidates']:
                    return res_data['candidates'][0]['content']['parts'][0]['text'].strip()
        except Exception as e:
            print(f"LLM API Call Error: {e}")

    # Fallback for reasoning queries when LLM API Key is absent or invalid
    insights = analytics_summary.get('insights', [])
    monthly_trend = analytics_summary.get('monthly_trend', [])

    if 'why' in query.lower() or 'increase' in query.lower() or 'change' in query.lower():
        if len(monthly_trend) >= 2:
            m1, m2 = monthly_trend[-2], monthly_trend[-1]
            diff = m2['expense'] - m1['expense']
            if diff > 0:
                return f"Your monthly spending increased in {m2['month']} compared with {m1['month']} by ₹{diff:,.2f} ({round(diff/max(m1['expense'],1)*100, 1)}%), primarily driven by higher category expenditures. (Set a valid LLM_API_KEY in .env for generative conversational AI reasoning)."
            elif diff < 0:
                return f"Your monthly spending actually decreased in {m2['month']} compared with {m1['month']} by ₹{abs(diff):,.2f}. Great job managing your budget!"
        
        if insights:
            return f"Financial Analysis: {insights[0]} (Set a valid LLM_API_KEY in .env for conversational reasoning)."

    return "LLM service is not configured. Please add a valid LLM_API_KEY in .env to enable conversational financial analysis."
