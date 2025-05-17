import os, re, json, unicodedata
from litellm import acompletion, completion

from lyrical.models import User, LLM, LLMProvider


def extract_json(text):
    """
    Attempt to extract the first JSON object from text.
    """
    try:
        # Extract the first {...} block
        match = re.search(r'\{[\s\S]*\}', text)

        # If a match is found, parse it as JSON
        return json.loads(match.group(0)) if match else None

    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")

    return None


def normalize_to_ascii(text):
    """
    Convert Unicode characters to closest ASCII equivalent.
    """
    # Convert unicode characters to ASCII using NFKD normalization
    # and ignore characters that cannot be represented in ASCII
    if isinstance(text, str):
        return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")

    # Recursively normalize lists and dictionaries    
    elif isinstance(text, list):
        return [normalize_to_ascii(item) for item in text]    
    elif isinstance(text, dict):
        return {normalize_to_ascii(k): normalize_to_ascii(v) for k, v in text.items()}
    
    # If it's neither, return the value as is
    return text


def invoke_json(user_message, temperature=0.2, max_tokens=1000):
    
    system_prompt = """You are a helpful assistant that returns information in JSON format.
                       Always respond with valid JSON that can be parsed by json.loads().
                       Do not include any explanations or text outside of the JSON structure."""

    response = completion(
        model="anthropic/claude-3-5-sonnet-latest",  # Use Claude 3.5 Sonnet
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        temperature=0.2,  # Lower temperature for more consistent outputs
        max_tokens=1000,
        response_format={"type": "json_object"}  # Request JSON format
    )

    json_response = response.choices[0].message.content

    raw_json_data = extract_json(json_response)
    json_data = normalize_to_ascii(raw_json_data)

    return json_data


