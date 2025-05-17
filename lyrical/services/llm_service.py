import os
import re
import json
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
    if llm.provider.internal_name == "ollama" and "OLLAMA_API_BASE" not in os.environ:
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
        if user_api_key and user_api_key.api_key:
            kwargs["api_key"] = user_api_key.api_key
        
        # Add response_format for models that support it (e.g., OpenAI)
        # Each model has a flag in the database to indicate if it supports JSON response format
        # so there is no need to check the provider here.
        if llm.json_response_format:
            kwargs["response_format"] = {"type": "json_object"}

        # Make the call to LiteLLM
        response = completion(**kwargs)

        # Extract content from response
        # LiteLLM's response structure can vary slightly, but typically content is in choices[0].message.content
        if response.choices and response.choices[0].message and response.choices[0].message.content:
            content = response.choices[0].message.content
        else:
            # Handle cases where the expected content is not found
            # This could be due to an error returned by the API or an unexpected response structure
            # For now, we'll assume 'response.text' might contain error details or non-standard success messages
            # It's better to inspect the raw 'response' object if 'content' is not where expected.
            # If 'response' itself is a string (e.g. from an error), use it directly.
            if isinstance(response, str):
                 content = response
            elif hasattr(response, 'text'): # some error objects might have a text attribute
                 content = response.text
            else: # Fallback if content cannot be determined
                 content = str(response) # Convert the whole response object to string

        # Try to parse the content as JSON
        parsed_json = extract_json_from_text(content)
        
        if parsed_json is None:
            # If JSON extraction fails, return a dictionary with the raw content and an error message
            # This helps in debugging what the LLM actually returned.
            error_message = "Failed to extract JSON from LLM response."
            # Log the problematic content if possible
            print(f"LLM_SERVICE_ERROR: {error_message} Raw content: {content[:500]}...") # Log first 500 chars
            return {"error": error_message, "raw_content": content}

        return normalize_to_ascii(parsed_json)
        
    except Exception as e:
        # Log the exception details
        print(f"LLM_SERVICE_EXCEPTION: An error occurred during the LLM call: {e}")
        # Return a dictionary with error information
        # This allows the caller to handle the error gracefully
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}
