import re
from datetime import datetime
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import os

def preprocess_image(image_path):
    """
    Applies image preprocessing using Pillow to improve OCR accuracy.
    Converts to grayscale, increases contrast, and applies mild sharpening.
    """
    img = Image.open(image_path)
    # Convert to grayscale
    img = img.convert('L')
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)
    # Apply thresholding
    img = img.point(lambda p: 255 if p > 130 else 0)
    return img

def extract_merchant(text_lines):
    """
    Extracts probable merchant name (usually in top 3 non-empty lines).
    """
    for line in text_lines[:5]:
        cleaned = line.strip()
        if len(cleaned) > 2 and not any(kw in cleaned.lower() for kw in ['receipt', 'tax', 'invoice', 'date', 'total', 'welcome', 'thank']):
            return cleaned.title()
    return 'Retail Store'

def extract_amount(raw_text):
    """
    Finds maximum dollar/rupee value associated with Total / Amount.
    """
    patterns = [
        r'(?:total|amount|amt|net|paid|balance)[\s:$]*[₹$Rs.]*[\s]*([\d]+[.,]\d{2})',
        r'[₹$Rs.]\s*([\d]+[.,]\d{2})',
        r'\b([\d]+[.,]\d{2})\b'
    ]
    amounts = []
    for pat in patterns:
        matches = re.findall(pat, raw_text, re.IGNORECASE)
        for m in matches:
            try:
                amt = float(m.replace(',', ''))
                if 0.1 <= amt <= 100000:
                    amounts.append(amt)
            except ValueError:
                pass
    return max(amounts) if amounts else 0.0

def extract_date(raw_text):
    """
    Parses dates matching standard invoice patterns.
    """
    date_patterns = [
        r'\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b',
        r'\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b',
        r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b'
    ]
    for pat in date_patterns:
        match = re.search(pat, raw_text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%d %b %Y']:
                try:
                    return datetime.strptime(date_str, fmt).date()
                except ValueError:
                    pass
    return datetime.today().date()

def infer_category(raw_text):
    t = raw_text.lower()
    if any(k in t for k in ['restaurant', 'cafe', 'food', 'burger', 'pizza', 'coffee', 'supermarket', 'mart', 'grocery', 'dining']):
        return 'Food'
    if any(k in t for k in ['utility', 'electric', 'water', 'internet', 'broadband']):
        return 'Utilities'
    if any(k in t for k in ['fuel', 'petrol', 'gas', 'uber', 'taxi', 'ride']):
        return 'Transportation'
    if any(k in t for k in ['apparel', 'fashion', 'clothing', 'store', 'mall', 'shoes']):
        return 'Shopping'
    if any(k in t for k in ['pharmacy', 'hospital', 'clinic', 'medicine', 'lab']):
        return 'Healthcare'
    if any(k in t for k in ['cinema', 'movie', 'game', 'theater']):
        return 'Entertainment'
    return 'Others'

def parse_receipt_image(image_path):
    """
    Executes OCR and structured transaction parsing.
    Returns dictionary with raw text, merchant, amount, category, date.
    """
    if not os.path.exists(image_path):
        return {'error': 'File not found on server', 'success': False}

    try:
        # Check if tesseract binary is accessible
        pytesseract.get_tesseract_version()
    except Exception as e:
        return {
            'error': f'Tesseract OCR engine is not configured or installed. Please install tesseract (e.g. `brew install tesseract`). Details: {str(e)}',
            'success': False,
            'missing_tesseract': True
        }

    try:
        processed_img = preprocess_image(image_path)
        raw_text = pytesseract.image_to_string(processed_img)
        
        if not raw_text.strip():
            # Retry on original un-thresholded image if thresholded was too aggressive
            raw_text = pytesseract.image_to_string(Image.open(image_path))

        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        
        merchant = extract_merchant(lines)
        amount = extract_amount(raw_text)
        dt = extract_date(raw_text)
        category = infer_category(raw_text)

        return {
            'success': True,
            'raw_text': raw_text,
            'merchant_name': merchant,
            'extracted_amount': amount,
            'extracted_category': category,
            'extracted_date': dt.strftime('%Y-%m-%d'),
            'payment_mode': 'Card'
        }
    except Exception as e:
        return {
            'error': f'Failed to process receipt image: {str(e)}',
            'success': False
        }
