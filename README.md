# ChatLog Summarizer 🤖

> AI-powered tool that converts chat logs (images, PDFs, or plain text) into structured summaries with key points, action items, and sentiment analysis.

---

## Features

- **Multi-format input** — PNG, JPG, WEBP (screenshot), PDF, TXT
- **OCR** for images and scanned PDFs (Tesseract + PyMuPDF)
- **AI summarization** via `facebook/bart-large-cnn`
- **Key point extraction** via zero-shot classification
- **Action item detection** — heuristic + zero-shot refinement
- **Sentiment analysis** (VADER)
- **Speaker-wise summaries** for structured chats
- **Dark mode**, download report, copy-to-clipboard
- Adjustable summary length (short / medium / long)

---

## Project Structure

```
chatlog-summarizer/
├── backend/
│   ├── app.py              # FastAPI server & endpoints
│   ├── summarizer.py       # AI summarization engine
│   ├── preprocessor.py     # Text cleaning & sentiment
│   ├── ocr_extractor.py    # Image/PDF → text via OCR
│   └── utils.py            # Shared helpers
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   ├── index.css
│   │   └── components/
│   │       ├── Header.js
│   │       ├── InputPanel.js
│   │       ├── OutputPanel.js
│   │       └── LoadingSpinner.js
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
├── requirements.txt
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- **Tesseract OCR** installed on your system:
  - Ubuntu/Debian: `sudo apt install tesseract-ocr`
  - macOS: `brew install tesseract`
  - Windows: Download installer from https://github.com/UB-Mannheim/tesseract/wiki
- **poppler** (for pdf2image):
  - Ubuntu/Debian: `sudo apt install poppler-utils`
  - macOS: `brew install poppler`

### Backend

```bash
cd chatlog-summarizer

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Start server
cd backend
python app.py
# → Running at http://localhost:8000
```

### Frontend

```bash
cd chatlog-summarizer/frontend

# Install packages
npm install

# Start dev server
npm start
# → Running at http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/summarize` | Summarise plain text (JSON body) |
| POST | `/summarize-file` | Upload image / PDF / txt (multipart form) |

### POST `/summarize`
```json
{ "text": "...", "summary_length": "medium" }
```

### POST `/summarize-file`
Form fields: `file` (binary), `summary_length` (short/medium/long)

### Response
```json
{
  "summary": "...",
  "key_points": ["...", "..."],
  "action_items": ["...", "..."],
  "sentiment": "positive",
  "speaker_summary": { "Alice": "...", "Bob": "..." },
  "word_count": 423,
  "reading_time": 2.1,
  "input_type": "image"
}
```

---

## How It Works

```
User Input (image / PDF / text)
        │
        ▼
   ocr_extractor.py  ──── Tesseract OCR / PyMuPDF
        │
        ▼
   preprocessor.py   ──── Clean text, detect speakers, sentiment
        │
        ▼
   summarizer.py     ──── BART summarization + zero-shot classification
        │
        ▼
   app.py (FastAPI)  ──── JSON response
        │
        ▼
   React Frontend    ──── Display results + download report
```

---

## Tips for Best Results

- For WhatsApp exports, use the `.txt` export from "Export Chat"
- For screenshots, ensure text is legible (avoid blurry/low-res images)
- Scanned PDFs may take longer due to per-page OCR

---

## Deployment

| Service | What |
|---------|------|
| **Render** | Backend (FastAPI) |
| **Vercel** | Frontend (React) |

Set `REACT_APP_API_URL` env variable in Vercel to point to your Render backend URL.