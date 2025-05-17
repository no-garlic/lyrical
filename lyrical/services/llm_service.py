import os, re, json, unicodedata
from litellm import completion
from lyrical.models import User, LLM, LLMProvider, UserAPIKey

import os
import json
import re
import unicodedata
from typing import Dict, Any, Optional, Union
from litellm import completion

    

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
        for match in matches:
            if isinstance(match, tuple):  # Some regex patterns return tuples
                match = next((m for m in match if m), "")
            
            # Clean up the matched text
            # Remove common formatting issues that break JSON parsing
            cleaned_match = match.strip()
            
            try:
                return json.loads(cleaned_match)
            except json.JSONDecodeError:
                continue
    
    return None


def llm_call(user_message: str, user: User, llm: Optional[LLM] = None, system_prompt: Optional[str] = None) -> Dict[str, Any]:
    """
    Call an LLM model and return the response as a JSON object.
    
    Args:
        model_name: Name of the model (e.g., "anthropic/claude-3-5-sonnet-latest", "ollama/gemma3:12b")
        user_message: The user's message/request
        temperature: Temperature setting for response generation (0.0 to 1.0)
        max_tokens: Maximum number of tokens to generate
        system_prompt: Custom system prompt (uses default JSON prompt if None)
        
    Returns:
        Parsed JSON response as a dictionary with ASCII-normalized values
        
    Raises:
        ValueError: If JSON response couldn't be extracted or parsed
        Exception: For API or connection errors
    """
    # If no LLM is provided, use the user's default model
    if llm is None:
        llm = user.default_model

    # Get the values for model parameters
    model_name = f"{llm.provider.internal_name}/{llm.internal_name}"
    temperature = llm.temperature
    max_tokens = llm.max_tokens

    # Get the API key for the user
    user_api_key = UserAPIKey.objects.filter(user=user, provider=llm.provider).first()

    # Default Ollama API base if not set in environment
    if "OLLAMA_API_BASE" not in os.environ:
        os.environ["OLLAMA_API_BASE"] = "http://localhost:11434"

    if system_prompt is None:
        system_prompt = """You are a helpful assistant that returns information in JSON format.
                            Always respond with valid JSON that can be parsed by json.loads().
                            Do not include any explanations or text outside of the JSON structure."""

    # Prepare the messages for the model
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    try:
        # Configure response format parameter based on model provider
        kwargs = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        # Set API key if one is provided
        if user_api_key:
            kwargs["api_key"] = user_api_key.api_key
        
        # Add response_format parameter for models that support it
        # (OpenAI and Anthropic models)
        if llm.json_response_format:
            kwargs["response_format"] = {"type": "json_object"}
            
        # Call the LLM through litellm
        response = completion(**kwargs)
        
        # Extract content from response
        content = response.choices[0].message.content
        
        # Try to parse as JSON (with fallback extraction if needed)
        json_data = extract_json_from_text(content)
        
        if json_data is None:
            raise ValueError(f"Failed to extract valid JSON from the model response: {content[:200]}...")
        
        # Normalize Unicode characters to ASCII
        normalized_data = normalize_to_ascii(json_data)
        
        return normalized_data
        
    except Exception as e:
        # Handle model-specific errors
        if "ollama" in model_name.lower():
            raise Exception(f"Ollama error: {str(e)}. Ensure Ollama is running and model '{model_name.split('/')[1]}' is pulled.")
        else:
            raise Exception(f"Error calling model {model_name}: {str(e)}")
