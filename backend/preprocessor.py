"""
Text preprocessing utilities for cleaning chat logs extracted from images/PDFs
"""
import re
import nltk
from typing import List, Dict

# Download required NLTK data at import time
for resource in ['punkt', 'vader_lexicon', 'stopwords']:
    try:
        nltk.data.find(f'tokenizers/{resource}' if resource == 'punkt' else resource)
    except LookupError:
        nltk.download(resource, quiet=True)

from nltk.sentiment import SentimentIntensityAnalyzer


class TextPreprocessor:
    """Handles text cleaning and preprocessing for chat logs"""

    def __init__(self):
        self.sentiment_analyzer = SentimentIntensityAnalyzer()

        # Ordered patterns to strip from raw OCR/chat text
        self.patterns = [
            (r'\[\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\]', ''),   # [HH:MM] or [HH:MM:SS]
            (r'\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4},?\s*\d{1,2}:\d{2}\s*(?:AM|PM)?', ''),  # date+time combos
            (r'\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}', ''),            # standalone dates
            (r'\[.*?\]', ''),                                         # anything in brackets
            (r'<.*?>', ''),                                           # HTML/XML tags
            (r'https?://\S+', ''),                                    # URLs
            (r'@\w+', ''),                                            # mentions
            (r'[\U00010000-\U0010ffff]', ''),                        # emoji (surrogate range)
            (r'[^\x00-\x7F]+', ' '),                                 # non-ASCII leftovers
        ]

    def clean_text(self, text: str) -> str:
        """Clean and normalise chat log text"""
        for pattern, replacement in self.patterns:
            text = re.sub(pattern, replacement, text)

        # Remove speaker prefixes like "John:" or "Jane>"
        text = re.sub(r'^\w[\w\s]{0,30}[:>]\s*', '', text, flags=re.MULTILINE)

        # Collapse excessive whitespace / blank lines
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'[ \t]{2,}', ' ', text)
        return text.strip()

    def extract_speakers(self, text: str) -> Dict[str, List[str]]:
        """Return dict mapping speaker name → list of their messages"""
        speakers: Dict[str, List[str]] = {}
        pattern = r'^([A-Za-z0-9_ ]{1,30})[:>]\s*(.*?)(?=\n[A-Za-z0-9_ ]{1,30}[:>]|\Z)'
        for speaker, message in re.findall(pattern, text, re.MULTILINE | re.DOTALL):
            speaker = speaker.strip()
            msg = message.strip()
            if speaker and msg:
                speakers.setdefault(speaker, []).append(msg)
        return speakers

    def analyze_sentiment(self, text: str) -> str:
        scores = self.sentiment_analyzer.polarity_scores(text)
        if scores['compound'] >= 0.05:
            return 'positive'
        elif scores['compound'] <= -0.05:
            return 'negative'
        return 'neutral'

    def segment_sentences(self, text: str) -> List[str]:
        return nltk.sent_tokenize(text)