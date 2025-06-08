import os
import logging
from dotenv import dotenv_values
from lyrical.models import User, UserAPIKey, LLMProvider


logger = logging.getLogger('services')


# Load .env once (assumes it's in the project root)
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
env_path = os.path.join(base_dir, ".env")
env = dotenv_values(env_path)
logger.info(f"Loaded dotenv environment variables from {env_path}")


def get_user_api_key(user, provider):
    user_api_key = UserAPIKey.objects.filter(user=user, provider=provider).first()

    if user_api_key:
        logger.info(f"Using user API key (from the database) for provider {provider.internal_name} for user {user.username}")
        return user_api_key.api_key

    # Fallback to .env values
    system_apikey = None
    if provider.internal_name == "openai":
        system_apikey = env.get("OPENAI_API_KEY")
    elif provider.internal_name == "anthropic":
        system_apikey = env.get("ANTHROPIC_API_KEY")
    elif provider.internal_name == "gemini":
        system_apikey = env.get("GEMINI_API_KEY")

    if system_apikey:
        logger.info(f"Using system API key (from dotenv) for provider {provider.internal_name}")
        return system_apikey

    logger.warning(f"No API key found for provider {provider.internal_name} for user {user.username}")
    return None
