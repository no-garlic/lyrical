import re
import json
import unicodedata
from typing import Dict, Any, Optional


def collapse_blank_lines(text):
    # Step 1: Strip leading/trailing whitespace from each line
    lines = [line.strip() for line in text.splitlines()]
    
    # Step 2: Rejoin lines with newline characters
    stripped_text = "\n".join(lines)
    
    # Step 3: Collapse multiple blank lines to a single blank line
    cleaned_text = re.sub(r'\n{2,}', '\n\n', stripped_text)
    return cleaned_text 


def process_line(line: str, generator=None):
    """
    Processes a single line of text, validates if it's JSON, and yields it.
    Handles errors by yielding an error JSON string.
    
    Args:
        line: The line of text to process
        generator: Optional LLMGenerator instance for preprocessing NDJSON
    """
    stripped_line = line.strip()
    if stripped_line == "```json" or stripped_line == "```":
        # Ignore markdown fence lines
        return
    elif stripped_line:  # If not a fence and not empty
        try:
            json.loads(stripped_line)  # Validate the stripped line
            
            # Apply preprocessing if generator is provided
            processed_line = stripped_line
            if generator and hasattr(generator, 'preprocess_ndjson'):
                processed_line = generator.preprocess_ndjson(stripped_line)
                # Validate that the processed line is still valid JSON
                json.loads(processed_line)
            
            yield processed_line + '\n'  # Yield the processed line
        except json.JSONDecodeError as e:
            print(f"LLM_SERVICE_NDJSON_PARSE_ERROR: Malformed JSON line: {stripped_line}, Error: {e}")
            error_payload = {"error": "Malformed JSON line from LLM", "raw_content": stripped_line, "details": str(e)}
            yield json.dumps(error_payload) + '\n'
        except Exception as e:
            print(f"LLM_SERVICE_NDJSON_PROCESS_ERROR: Error processing line: {stripped_line}, Error: {e}")
            error_payload = {"error": "Error processing line from LLM", "raw_content": stripped_line, "details": str(e)}
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
