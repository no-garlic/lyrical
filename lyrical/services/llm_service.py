import os
import json
from typing import Optional
from litellm import completion
from lyrical.models import User, LLM, UserAPIKey
from .utils import prompts
from .utils.text import normalize_to_ascii


def _process_line(line: str):
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
        system_prompt = prompts.get("system_prompt", llm)

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
                    yield from _process_line(line_part)
                    accumulated_line = rest
        
        # After loop, process any remaining data in accumulated_line (if it doesn't end with \n)
        if accumulated_line.strip():
            yield from _process_line(accumulated_line)
        
    except Exception as e:
        print(f"LLM_SERVICE_EXCEPTION: An error occurred during the LLM stream: {e}")
        import traceback
        yield json.dumps({"error": str(e), "traceback": traceback.format_exc(), "status": "error"})
