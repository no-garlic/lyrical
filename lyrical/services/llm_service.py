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
            # Construct path relative to this file, assuming prompts.yaml is at project root
            # lyrical/services/llm_service.py -> lyrical_project_root/prompts.yaml
            current_dir = os.path.dirname(os.path.abspath(__file__))
            prompts_path = os.path.join(current_dir, "..", "..", "prompts.yaml")
            with open(prompts_path, "r") as f:
                prompts = yaml.safe_load(f)
            system_prompt = prompts.get("system_prompt")
        except Exception as e:
            print(f"LLM_SERVICE_ERROR: Could not load system_prompt from prompts.yaml: {e}")
            yield json.dumps({"error": f"Failed to load system prompt: {e}", "raw_content": "", "status": "error"})
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
            "stream": True  # Enable streaming
        }

        if user_api_key and user_api_key.api_key:
            kwargs["api_key"] = user_api_key.api_key
        
        if llm.json_response_format:
            kwargs["response_format"] = {"type": "json_object"}

        response_stream = completion(**kwargs)

        for chunk in response_stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                content_piece = chunk.choices[0].delta.content
                yield normalize_to_ascii(content_piece)
        
    except Exception as e:
        print(f"LLM_SERVICE_EXCEPTION: An error occurred during the LLM stream: {e}")
        import traceback
        yield json.dumps({"error": str(e), "traceback": traceback.format_exc(), "status": "error"})
