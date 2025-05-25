import os
import json
from typing import Optional
from litellm import completion
from lyrical.models import User, LLM, UserAPIKey
from .utils import prompts
from .utils.text import normalize_to_ascii, process_line
from .utils.messages import MessageBuilder


def llm_call(prompt_messages: MessageBuilder, user: User, llm: Optional[LLM] = None, generator=None): # -> Generator[str, None, None]
    """
    Call an LLM model and stream the response.
    Yields chunks of text content from the LLM.
    Handles errors by yielding an error JSON string.
    
    Args:
        prompt_messages: MessageBuilder containing the conversation
        user: User making the request
        llm: Optional LLM model to use
        generator: Optional LLMGenerator instance for preprocessing NDJSON
    """
    if llm is None:
        llm = user.default_model

    model_name = f"{llm.provider.internal_name}/{llm.internal_name}"
    temperature = 0.2
    max_tokens = 1000
    user_api_key = UserAPIKey.objects.filter(user=user, provider=llm.provider).first()

    if llm.provider.internal_name == "ollama" and "OLLAMA_API_BASE" not in os.environ:
        os.environ["OLLAMA_API_BASE"] = "http://localhost:11434"

    try:
        kwargs = {
            "model": model_name,
            "messages": prompt_messages.get(),
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
                    yield from process_line(line_part, generator)
                    accumulated_line = rest
        
        # After loop, process any remaining data in accumulated_line (if it doesn't end with \n)
        if accumulated_line.strip():
            yield from process_line(accumulated_line, generator)
        
    except Exception as e:
        print(f"LLM_SERVICE_EXCEPTION: An error occurred during the LLM stream: {e}")
        import traceback
        yield json.dumps({"error": str(e), "traceback": traceback.format_exc(), "status": "error"})
