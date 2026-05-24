"""
AI summarization engine using HuggingFace Transformers.
Model is loaded once at startup and reused for all requests.
"""
import re
import asyncio
from functools import lru_cache
from typing import List

from transformers import pipeline

from utils import chunk_text


# ---------------------------------------------------------------------------
# Model loader  (singleton via lru_cache)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _load_summarizer():
    """Load facebook/bart-large-cnn once. Cached for the process lifetime."""
    return pipeline(
        'summarization',
        model='facebook/bart-large-cnn',
        tokenizer='facebook/bart-large-cnn',
        device=-1,           # CPU; set to 0 for CUDA GPU
    )


@lru_cache(maxsize=1)
def _load_classifier():
    """Zero-shot classifier for action-item / key-point detection."""
    return pipeline(
        'zero-shot-classification',
        model='facebook/bart-large-mnli',
        device=-1,
    )


# ---------------------------------------------------------------------------
# Length presets - UPDATED with more distinct differences
# ---------------------------------------------------------------------------

LENGTH_PARAMS = {
    'short':  {
        'max_length': 50, 
        'min_length': 20,
        'max_new_tokens': 60,
        'length_penalty': 1.0
    },
    'medium': {
        'max_length': 120, 
        'min_length': 50,
        'max_new_tokens': 150,
        'length_penalty': 1.5
    },
    'long':   {
        'max_length': 200, 
        'min_length': 80,
        'max_new_tokens': 250,
        'length_penalty': 2.0
    },
}


# ---------------------------------------------------------------------------
# Summarizer class
# ---------------------------------------------------------------------------

class Summarizer:
    """Wraps transformer pipelines and exposes async-friendly methods."""

    async def generate_summary(self, text: str, length: str = 'medium') -> str:
        """
        Summarise text.
        Handles long inputs by chunk-and-merge strategy.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_summarize, text, length)

    def _sync_summarize(self, text: str, length: str) -> str:
        summarizer = _load_summarizer()
        params = LENGTH_PARAMS.get(length, LENGTH_PARAMS['medium'])

        # Chunk at ~900 words to stay within BART's 1024-token limit
        chunks = chunk_text(text, max_chunk_size=900)

        chunk_summaries = []
        for chunk in chunks:
            if len(chunk.split()) < 30:          # skip trivially short chunks
                chunk_summaries.append(chunk)
                continue
            try:
                # UPDATED: Better summarization parameters for length control
                result = summarizer(
                    chunk,
                    max_length=params['max_length'],
                    min_length=params['min_length'],
                    max_new_tokens=params.get('max_new_tokens', params['max_length']),
                    do_sample=False,
                    truncation=True,
                    no_repeat_ngram_size=3,
                    early_stopping=True,
                    length_penalty=params.get('length_penalty', 1.0),
                    num_beams=4
                )
                chunk_summaries.append(result[0]['summary_text'])
            except Exception as e:
                print(f"Summarization error for chunk: {e}")
                # Fallback: return first few sentences
                sentences = re.split(r'[.!?\n]', chunk)[:3]
                chunk_summaries.append(' '.join(sentences))

        merged = ' '.join(chunk_summaries)

        # Second-pass summary if we had multiple chunks
        if len(chunks) > 1 and len(merged.split()) > params['max_length']:
            try:
                result = summarizer(
                    merged,
                    max_length=params['max_length'],
                    min_length=params['min_length'],
                    max_new_tokens=params.get('max_new_tokens', params['max_length']),
                    do_sample=False,
                    truncation=True,
                    no_repeat_ngram_size=3,
                    early_stopping=True,
                    length_penalty=params.get('length_penalty', 1.0),
                    num_beams=4
                )
                return result[0]['summary_text']
            except Exception:
                pass

        return merged

    async def extract_key_points(self, text: str) -> List[str]:
        """Extract key informational points as bullet strings."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_key_points, text)

    def _sync_key_points(self, text: str) -> List[str]:
        sentences = [s.strip() for s in re.split(r'[.!?\n]', text) if len(s.strip()) > 20]
        if not sentences:
            return []

        classifier = _load_classifier()
        candidate_labels = ['important information', 'key decision', 'main topic', 'irrelevant small talk']

        key_points = []
        for sent in sentences[:40]:              # cap at 40 sentences for speed
            try:
                res = classifier(sent, candidate_labels, multi_label=False)
                top_label = res['labels'][0]
                top_score = res['scores'][0]
                if top_label != 'irrelevant small talk' and top_score > 0.55:
                    key_points.append(sent)
            except Exception:
                continue

        # Deduplicate (keep order)
        seen = set()
        unique = []
        for kp in key_points:
            norm = kp.lower()
            if norm not in seen:
                seen.add(norm)
                unique.append(kp)

        return unique[:7]

    async def extract_action_items(self, text: str) -> List[str]:
        """Detect sentences that represent tasks / action items."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_action_items, text)

    def _sync_action_items(self, text: str) -> List[str]:
        # Heuristic first pass: look for imperative / task language
        action_patterns = [
            r'\b(please|pls|kindly)\b.{5,80}',
            r'\b(send|share|review|update|check|confirm|complete|submit|schedule|call|meet|remind|follow.up|prepare|fix|resolve)\b.{5,80}',
            r'\b(need to|needs to|have to|has to|must|should|will|going to)\b.{5,80}',
            r'\b(todo|to-do|action item|task)\b.{0,80}',
        ]

        sentences = [s.strip() for s in re.split(r'[.!?\n]', text) if len(s.strip()) > 10]
        candidates = []
        for sent in sentences:
            for pat in action_patterns:
                if re.search(pat, sent, re.IGNORECASE):
                    candidates.append(sent)
                    break

        if not candidates:
            return []

        # Refine with zero-shot classifier
        classifier = _load_classifier()
        action_items = []
        for cand in candidates[:20]:
            try:
                res = classifier(cand, ['action item or task', 'general statement'], multi_label=False)
                if res['labels'][0] == 'action item or task' and res['scores'][0] > 0.60:
                    action_items.append(cand)
            except Exception:
                action_items.append(cand)   # include on error

        return action_items[:6]