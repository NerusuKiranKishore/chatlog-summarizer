"""
OCR and file extraction utilities.
Supports: images (PNG, JPG, WEBP) and PDF files.
"""
import io
import re
from pathlib import Path
from typing import Optional

from PIL import Image, ImageFilter, ImageEnhance
import pytesseract
import fitz  # PyMuPDF


def _preprocess_image(img: Image.Image) -> Image.Image:
    """Enhance image for better OCR accuracy."""
    # Convert to greyscale
    img = img.convert('L')
    # Sharpen
    img = img.filter(ImageFilter.SHARPEN)
    # Increase contrast
    img = ImageEnhance.Contrast(img).enhance(2.0)
    return img


def extract_text_from_image(image_bytes: bytes, filename: str = '') -> str:
    """
    Run Tesseract OCR on an image and return cleaned text.
    Works with PNG, JPG, JPEG, WEBP, BMP, TIFF.
    """
    img = Image.open(io.BytesIO(image_bytes))
    img = _preprocess_image(img)
    config = r'--oem 3 --psm 6'          # LSTM engine, assume uniform block
    text = pytesseract.image_to_string(img, config=config)
    return _post_clean(text)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text from a PDF.
    Strategy:
      1. Try native text extraction (fast, accurate for digital PDFs).
      2. Fall back to per-page rasterise + OCR for scanned PDFs.
    """
    doc = fitz.open(stream=pdf_bytes, filetype='pdf')
    pages_text = []

    for page in doc:
        native_text = page.get_text('text').strip()
        if len(native_text) > 50:              # decent amount of selectable text
            pages_text.append(native_text)
        else:
            # Scanned page — rasterise and OCR
            mat = fitz.Matrix(2, 2)            # 2× zoom → ~144 dpi
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes('png')
            ocr_text = extract_text_from_image(img_bytes)
            pages_text.append(ocr_text)

    doc.close()
    combined = '\n\n'.join(pages_text)
    return _post_clean(combined)


def extract_text(file_bytes: bytes, filename: str) -> str:
    """
    Unified entry point.  Dispatches based on file extension.
    Raises ValueError for unsupported formats.
    """
    ext = Path(filename).suffix.lower()

    if ext == '.pdf':
        return extract_text_from_pdf(file_bytes)
    elif ext in {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif'}:
        return extract_text_from_image(file_bytes, filename)
    elif ext == '.txt':
        return file_bytes.decode('utf-8', errors='replace')
    else:
        raise ValueError(f'Unsupported file type: {ext}. Accepted: PDF, PNG, JPG, WEBP, TXT')


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _post_clean(text: str) -> str:
    """Remove common OCR artefacts."""
    # Drop lone punctuation lines
    text = re.sub(r'^\s*[^\w\n]{1,3}\s*$', '', text, flags=re.MULTILINE)
    # Collapse 3+ blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()