"""
FastAPI backend for ChatLog Summarizer.
Supports: plain text, image uploads (PNG/JPG/WEBP), and PDF uploads.
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List, Optional
import uvicorn

from summarizer import Summarizer
from preprocessor import TextPreprocessor
from ocr_extractor import extract_text
from utils import validate_text, chunk_text, word_count, reading_time_minutes

# ---------------------------------------------------------------------------
# App initialisation
# ---------------------------------------------------------------------------

app = FastAPI(title='ChatLog Summarizer API', version='2.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Load once at startup – avoids cold-start latency on first request
preprocessor = TextPreprocessor()
summarizer = Summarizer()

ALLOWED_EXTENSIONS = {'.txt', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif'}

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SummarizeRequest(BaseModel):
    text: str
    summary_length: Optional[str] = 'medium'

    @field_validator('summary_length')
    @classmethod
    def valid_length(cls, v):
        if v not in ('short', 'medium', 'long'):
            return 'medium'
        return v


class SummarizeResponse(BaseModel):
    summary: str
    key_points: List[str]
    action_items: List[str]
    sentiment: Optional[str] = None
    speaker_summary: Optional[dict] = None
    word_count: Optional[int] = None
    reading_time: Optional[float] = None
    input_type: Optional[str] = None   # 'text' | 'image' | 'pdf'


# ---------------------------------------------------------------------------
# Shared processing pipeline
# ---------------------------------------------------------------------------

async def _process(raw_text: str, summary_length: str, input_type: str) -> SummarizeResponse:
    """Clean → summarise → extract points / actions → return response."""

    if not validate_text(raw_text):
        raise HTTPException(status_code=400, detail='Extracted text is too short to summarise.')

    cleaned = preprocessor.clean_text(raw_text)

    if not validate_text(cleaned):
        raise HTTPException(
            status_code=422,
            detail='After cleaning, the text had no usable content. '
                   'Please check the input quality.'
        )

    # Run AI tasks concurrently
    import asyncio
    summary, key_points, action_items = await asyncio.gather(
        summarizer.generate_summary(cleaned, length=summary_length),
        summarizer.extract_key_points(cleaned),
        summarizer.extract_action_items(cleaned),
    )

    sentiment = preprocessor.analyze_sentiment(cleaned)

    # Speaker-wise summaries (optional, only for text with detectable speakers)
    speakers = preprocessor.extract_speakers(raw_text)
    speaker_summary: dict = {}
    for speaker, messages in speakers.items():
        merged = ' '.join(messages)
        if validate_text(merged):
            speaker_summary[speaker] = await summarizer.generate_summary(merged, length='short')

    return SummarizeResponse(
        summary=summary,
        key_points=key_points[:7],
        action_items=action_items[:6],
        sentiment=sentiment,
        speaker_summary=speaker_summary or None,
        word_count=word_count(cleaned),
        reading_time=reading_time_minutes(cleaned),
        input_type=input_type,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get('/')
async def root():
    return {'status': 'running', 'message': 'ChatLog Summarizer API v2'}


@app.post('/summarize', response_model=SummarizeResponse)
async def summarize_text(request: SummarizeRequest):
    """Summarise plain text pasted by the user."""
    return await _process(request.text, request.summary_length, 'text')


@app.post('/summarize-file', response_model=SummarizeResponse)
async def summarize_file(
    file: UploadFile = File(...),
    summary_length: str = Form('medium'),
):
    """
    Accept a file upload (TXT, PDF, PNG, JPG, WEBP) and return summarisation results.
    OCR is applied automatically to images and scanned PDFs.
    """
    import pathlib

    ext = pathlib.Path(file.filename or '').suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f'Unsupported file type "{ext}". '
                   f'Allowed: {", ".join(sorted(ALLOWED_EXTENSIONS))}',
        )

    content = await file.read()

    try:
        raw_text = extract_text(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'File extraction failed: {e}')

    input_type = 'pdf' if ext == '.pdf' else ('text' if ext == '.txt' else 'image')
    return await _process(raw_text, summary_length, input_type)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    uvicorn.run('app:app', host='0.0.0.0', port=8000, reload=True)