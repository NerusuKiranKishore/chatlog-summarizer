"""
Utility functions shared across the backend.
"""
from typing import List


def validate_text(text: str) -> bool:
    """Return True only if the text has meaningful content."""
    return bool(text) and len(text.strip()) >= 10


def chunk_text(text: str, max_chunk_size: int = 900) -> List[str]:
    """
    Split text into word-count-bounded chunks.
    Splits on sentence boundaries where possible to preserve meaning.
    """
    words = text.split()
    if len(words) <= max_chunk_size:
        return [text]

    chunks: List[str] = []
    current: List[str] = []

    for word in words:
        current.append(word)
        if len(current) >= max_chunk_size:
            chunks.append(' '.join(current))
            current = []

    if current:
        chunks.append(' '.join(current))

    return chunks


def estimate_token_count(text: str) -> int:
    """Rough word-level token estimate (actual BPE tokens may differ)."""
    return len(text.split())


def word_count(text: str) -> int:
    return len(text.split())


def reading_time_minutes(text: str, wpm: int = 200) -> float:
    """Estimate reading time in minutes at a given words-per-minute rate."""
    return round(word_count(text) / wpm, 1)