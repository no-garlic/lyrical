import re, json, unicodedata
from langchain_ollama import OllamaLLM
from langchain_openai import OpenAI
from langchain_anthropic import Anthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
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


def invoke_json(llm_model, prompt, temperature=0.5, max_tokens=2000):
    llm = None
    if llm_model is None:
        return None
    
    if llm_model.provider.name == "OpenAI":
        llm = OpenAI(model=llm_model.model_name, temperature=temperature, max_tokens=max_tokens)
    elif llm_model.provider.name == "Anthropic":
        llm = Anthropic(model=llm_model.model_name, temperature=temperature, max_tokens=max_tokens)
    elif llm_model.provider.name == "Google":
        llm = ChatGoogleGenerativeAI(model=llm_model.model_name, temperature=temperature, max_tokens=max_tokens)
    elif llm_model.provider.name == "Ollama":
        llm = OllamaLLM(model=llm_model.model_name, temperature=temperature, max_tokens=max_tokens)
    
    if not llm:
        return None
        
    response = llm.invoke(prompt)

    raw_json_data = extract_json(response)
    json_data = normalize_to_ascii(raw_json_data)

    return json_data


def invoke_json_with_user(user, prompt, temperature=0.5, max_tokens=2000):
    return invoke_json(user.default_model, prompt, temperature, max_tokens)


