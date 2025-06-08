import yaml
import os
from pathlib import Path
from jinja2 import Template
from ...models import LLM
from .text import collapse_blank_lines
from ...logging_config import get_logger


logger = get_logger('services')


DEFAULT_PROMPT_FILE = "defaults.yaml"
INTERNAL_PROMPT_FILE = "internal.yaml"
PROMPTS_FILE_PATH = Path(__file__).parent.parent.parent / "prompts" 

_default_prompts = None
_internal_prompts = None
_model_prompts = {}

# Timestamp tracking for file changes
_default_prompts_timestamp = None
_internal_prompts_timestamp = None
_model_prompts_timestamps = {}


def apply_prompt_args(prompt: str, **kwargs) -> str:
    if prompt is None:
        return None

    template = Template(prompt)
    rendered = template.render(**kwargs)

    return rendered


def _get_file_timestamp(file_path: Path) -> float:
    """Get the modification timestamp of a file, or 0 if the file doesn't exist."""
    try:
        return os.path.getmtime(file_path)
    except OSError:
        return 0


def _check_and_invalidate_if_changed():
    """Check if any prompt files have changed and invalidate cached data if needed."""
    global _default_prompts, _internal_prompts, _model_prompts
    global _default_prompts_timestamp, _internal_prompts_timestamp, _model_prompts_timestamps
    
    # Check default prompts file
    default_file_path = PROMPTS_FILE_PATH / DEFAULT_PROMPT_FILE
    current_default_timestamp = _get_file_timestamp(default_file_path)
    if _default_prompts_timestamp is not None and current_default_timestamp > _default_prompts_timestamp:
        logger.debug(f"Default prompts file changed, invalidating cache")
        _default_prompts = None
        _default_prompts_timestamp = None
    
    # Check internal prompts file
    internal_file_path = PROMPTS_FILE_PATH / INTERNAL_PROMPT_FILE
    current_internal_timestamp = _get_file_timestamp(internal_file_path)
    if _internal_prompts_timestamp is not None and current_internal_timestamp > _internal_prompts_timestamp:
        logger.debug(f"Internal prompts file changed, invalidating cache")
        _internal_prompts = None
        _internal_prompts_timestamp = None
    
    # Check model-specific prompts files
    for model_name in list(_model_prompts_timestamps.keys()):
        model_file_path = PROMPTS_FILE_PATH / f"{model_name}.yaml"
        current_model_timestamp = _get_file_timestamp(model_file_path)
        stored_timestamp = _model_prompts_timestamps.get(model_name, 0)
        if stored_timestamp > 0 and current_model_timestamp > stored_timestamp:
            logger.debug(f"Model prompts file for {model_name} changed, invalidating cache")
            _model_prompts[model_name] = None
            del _model_prompts_timestamps[model_name]


def get_system_prompt(prompt_name: str, llm: LLM = None) -> str:
    custom_system_prompt_name = f"{prompt_name}.system_prompt"

    custom_system_prompt = _get_prompt(custom_system_prompt_name, llm)
    if custom_system_prompt:
        logger.debug(f"Custom system prompt '{custom_system_prompt_name}' found")
        return collapse_blank_lines(custom_system_prompt)
    
    logger.debug(f"Custom system prompt '{custom_system_prompt_name}' not found. Using default")
    system_prompt = _get_prompt("system_prompt", llm)
    return collapse_blank_lines(system_prompt)


def get_user_prompt(prompt_name: str, llm: LLM = None, **kwargs) -> str:
    prompt = _get_prompt(prompt_name, llm)
    rendered_prompt = apply_prompt_args(prompt, **kwargs)
    return collapse_blank_lines(rendered_prompt)


def _get_default_prompts() -> dict:
    global _default_prompts, _default_prompts_timestamp
    
    # Check if file has changed and invalidate cache if needed
    default_file_path = PROMPTS_FILE_PATH / DEFAULT_PROMPT_FILE
    current_timestamp = _get_file_timestamp(default_file_path)
    
    if (_default_prompts_timestamp is not None and 
        current_timestamp > _default_prompts_timestamp):
        logger.debug(f"Default prompts file changed, reloading")
        _default_prompts = None
        _default_prompts_timestamp = None
    
    if _default_prompts is None:
        try:
            logger.info(f"Loading default prompts from {default_file_path}")
            with open(default_file_path, "r") as f:
                _default_prompts = yaml.safe_load(f)
            _default_prompts_timestamp = current_timestamp
        except FileNotFoundError:
            logger.error(f"Default prompts not found at {default_file_path}")
            _default_prompts = {}
            _default_prompts_timestamp = 0
        except yaml.YAMLError as e:
            logger.error(f"Could not parse default prompts at {default_file_path}: {e}")
            _default_prompts = {}
            _default_prompts_timestamp = 0
    return _default_prompts


def _get_internal_prompts() -> dict:
    global _internal_prompts, _internal_prompts_timestamp
    
    # Check if file has changed and invalidate cache if needed
    internal_file_path = PROMPTS_FILE_PATH / INTERNAL_PROMPT_FILE
    current_timestamp = _get_file_timestamp(internal_file_path)
    
    if (_internal_prompts_timestamp is not None and 
        current_timestamp > _internal_prompts_timestamp):
        logger.debug(f"Internal prompts file changed, reloading")
        _internal_prompts = None
        _internal_prompts_timestamp = None
    
    if _internal_prompts is None:
        try:
            logger.info(f"Loading internal prompts from {internal_file_path}")
            with open(internal_file_path, "r") as f:
                _internal_prompts = yaml.safe_load(f)
            _internal_prompts_timestamp = current_timestamp
        except FileNotFoundError:
            logger.debug(f"Internal prompts not found at {internal_file_path}")
            _internal_prompts = {}
            _internal_prompts_timestamp = 0
        except yaml.YAMLError as e:
            logger.error(f"Could not parse internal prompts at {internal_file_path}: {e}")
            _internal_prompts = {}
            _internal_prompts_timestamp = 0
    return _internal_prompts


def _get_model_prompts(model_name: str) -> dict:
    global _model_prompts, _model_prompts_timestamps
    
    # Check if file has changed and invalidate cache if needed
    model_file_path = PROMPTS_FILE_PATH / f"{model_name}.yaml"
    current_timestamp = _get_file_timestamp(model_file_path)
    stored_timestamp = _model_prompts_timestamps.get(model_name, 0)
    
    if (stored_timestamp > 0 and current_timestamp > stored_timestamp):
        logger.debug(f"Model prompts file for {model_name} changed, reloading")
        _model_prompts[model_name] = None
        del _model_prompts_timestamps[model_name]
    
    if model_name not in _model_prompts:
        try:
            if os.path.exists(model_file_path):
                logger.info(f"Loading model-specific prompts from {model_file_path}")
                with open(model_file_path, "r") as f:
                    _model_prompts[model_name] = yaml.safe_load(f)
                _model_prompts_timestamps[model_name] = current_timestamp
            else:
                logger.debug(f"Model-specific prompts not found at {model_file_path}")
                _model_prompts[model_name] = None
                _model_prompts_timestamps[model_name] = 0
        except yaml.YAMLError as e:
            logger.error(f"Could not parse model-specific prompts at {model_file_path}: {e}")
            _model_prompts[model_name] = None
            _model_prompts_timestamps[model_name] = 0
    return _model_prompts.get(model_name, {})




def _get_prompt(prompt_name: str, llm: LLM = None) -> str:
    # Keep track of loaded prompts    
    global _default_prompts
    global _internal_prompts
    global _model_prompts

    # Check if the prompt name is provided
    if not prompt_name:
        return None

    # Get the default and internal prompts if they haven't been loaded yet
    default_prompts = _get_default_prompts()
    internal_prompts = _get_internal_prompts()

    # Check if a model is provided, if so then get the model prompts
    model_name = llm.internal_name if llm else None
    model_prompts = _get_model_prompts(model_name) if model_name else None
   
    # Check if the prompt name exists in the model-specific prompts
    if model_prompts:
        logger.debug(f"Using model-specific prompts for {model_name}")
        if prompt_name in model_prompts:
            logger.debug(f"Prompt '{prompt_name}' found in model-specific prompts")
            return model_prompts.get(prompt_name)
    
    # Check internal prompts (for system operations like summarization)
    if internal_prompts and prompt_name in internal_prompts:
        logger.debug(f"Prompt '{prompt_name}' found in internal prompts")
        return internal_prompts.get(prompt_name)
    
    # If the prompt is not found in the model-specific or internal prompts, check the default prompts
    if default_prompts and prompt_name in default_prompts:
        logger.debug(f"Prompt '{prompt_name}' found in default prompts")
        return default_prompts.get(prompt_name)
    
    logger.debug(f"Prompt '{prompt_name}' not found in any prompt yaml file")
    return None