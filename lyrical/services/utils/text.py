import re
import json
import unicodedata
from typing import Dict, Any, Optional


def process_line(line: str):
    """
    Processes a single line of text, validates if it's JSON, and yields it.
    Handles errors by yielding an error JSON string.
    """
    stripped_line = line.strip()
    if stripped_line == "```json" or stripped_line == "```":
        # Ignore markdown fence lines
        return
    elif stripped_line:  # If not a fence and not empty
        try:
            json.loads(stripped_line)  # Validate the stripped line
            yield stripped_line + '\n'  # Yield the stripped line (which is a valid JSON object)
        except json.JSONDecodeError as e:
            print(f"LLM_SERVICE_NDJSON_PARSE_ERROR: Malformed JSON line: {stripped_line}, Error: {e}")
            error_payload = {"error": "Malformed JSON line from LLM", "raw_content": stripped_line, "details": str(e)}
            yield json.dumps(error_payload) + '\n'


def normalize_to_ascii(text):
    """
    Convert Unicode characters to closest ASCII equivalent.
    """
    # Convert unicode characters to ASCII using NFKD normalization
    if isinstance(text, str):
        return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    # Recursively normalize lists
    elif isinstance(text, list):
        return [normalize_to_ascii(item) for item in text]
    # Recursively normalize dictionaries    
    elif isinstance(text, dict):
        return {normalize_to_ascii(k): normalize_to_ascii(v) for k, v in text.items()}
    # If it's neither, return the value as is
    return text


def extract_json(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract JSON from text that might contain non-JSON content.
    Handles various formats including JSON wrapped in markdown code blocks.
    """
    # Try parsing the entire response first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try to extract JSON from code blocks or find standalone JSON objects
    json_patterns = [
        r'```(?:json)?\s*([\s\S]*?)\s*```',  # JSON in code blocks with or without language specifier
        r'({[\s\S]*?})(?:\s*$|\n\n)',        # JSON object possibly followed by newlines or end of string
        r'(\[[\s\S]*?\])(?:\s*$|\n\n)'       # JSON array possibly followed by newlines or end of string
    ]
    
    for pattern in json_patterns:
        matches = re.findall(pattern, text)
        for match_str in matches:
            # If the pattern captures multiple groups, re.findall might return tuples.
            # We are interested in the captured JSON string.
            actual_json_str = match_str if isinstance(match_str, str) else match_str[0]
            try:
                return json.loads(actual_json_str)
            except json.JSONDecodeError:
                continue # Try next match or pattern
    
    return None
