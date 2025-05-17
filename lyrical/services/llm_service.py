import os
import re
import json
import yaml
import unicodedata
from typing import Dict, Any, Optional, Union
from litellm import completion
from lyrical.models import User, LLM, LLMProvider, UserAPIKey


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


def extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
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


def llm_call(user_message: str, user: User, llm: Optional[LLM] = None, system_prompt: Optional[str] = None): # -> Generator[str, None, None]
    """
    Call an LLM model and stream the response.
    Yields chunks of text content from the LLM.
    Handles errors by yielding an error JSON string.
    """
    if llm is None:
        llm = user.default_model

    model_name = f"{llm.provider.internal_name}/{llm.internal_name}"
    temperature = llm.temperature
    max_tokens = llm.max_tokens
    user_api_key = UserAPIKey.objects.filter(user=user, provider=llm.provider).first()

    if llm.provider.internal_name == "ollama" and "OLLAMA_API_BASE" not in os.environ:
        os.environ["OLLAMA_API_BASE"] = "http://localhost:11434"

    if system_prompt is None:
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            prompts_path = os.path.join(current_dir, "..", "..", "prompts.yaml")
            with open(prompts_path, "r") as f:
                prompts = yaml.safe_load(f)
            system_prompt = prompts.get("system_prompt")
        except Exception as e:
            print(f"LLM_SERVICE_ERROR: Could not load system_prompt from prompts.yaml: {e}")
            yield json.dumps({"error": f"Failed to load system prompt: {e}", "raw_content": "", "status": "error"}) + '\n'
            return

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]

    try:
        kwargs = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }

        if user_api_key and user_api_key.api_key:
            kwargs["api_key"] = user_api_key.api_key
        
        response_stream = completion(**kwargs)

        accumulated_line = ""
        for chunk in response_stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                content_piece = normalize_to_ascii(chunk.choices[0].delta.content)
                accumulated_line += content_piece

                while '\n' in accumulated_line:
                    line_part, rest = accumulated_line.split('\n', 1)
                    stripped_line = line_part.strip() # Strip whitespace for checking

                    if stripped_line == "```json" or stripped_line == "```":
                        # Ignore markdown fence lines
                        pass
                    elif stripped_line: # If not a fence and not empty
                        try:
                            json.loads(stripped_line) # Validate the stripped line
                            yield stripped_line + '\n' # Yield the stripped line (which is a valid JSON object)
                        except json.JSONDecodeError as e:
                            print(f"LLM_SERVICE_NDJSON_PARSE_ERROR: Malformed JSON line: {stripped_line}, Error: {e}")
                            error_payload = {"error": "Malformed JSON line from LLM", "raw_content": stripped_line, "details": str(e)}
                            yield json.dumps(error_payload) + '\n'
                    accumulated_line = rest
        
        # After loop, process any remaining data in accumulated_line (if it doesn't end with \n)
        if accumulated_line.strip():
            stripped_final_line = accumulated_line.strip()
            if stripped_final_line == "```json" or stripped_final_line == "```":
                # Ignore markdown fence lines
                pass
            elif stripped_final_line: # If not a fence and not empty
                try:
                    json.loads(stripped_final_line) # Validate the stripped final line
                    yield stripped_final_line + '\n' # Yield the stripped final line
                except json.JSONDecodeError as e:
                    print(f"LLM_SERVICE_NDJSON_PARSE_ERROR: Malformed JSON line (final): {stripped_final_line}, Error: {e}")
                    error_payload = {"error": "Malformed JSON line from LLM (final)", "raw_content": stripped_final_line, "details": str(e)}
                    yield json.dumps(error_payload) + '\n'
        
    except Exception as e:
        print(f"LLM_SERVICE_EXCEPTION: An error occurred during the LLM stream: {e}")
        import traceback
        yield json.dumps({"error": str(e), "traceback": traceback.format_exc(), "status": "error"})
