import yaml
import os
from pathlib import Path
from jinja2 import Template
from ...models import LLM

DEFAULT_PROMPT_FILE = "defaults.yaml"
PROMPTS_FILE_PATH = Path(__file__).parent.parent.parent / "prompts" 

_default_prompts = None
_model_prompts = {}


def apply_prompt_args(prompt: str, **kwargs) -> str:
    if prompt is None:
        return None

    template = Template(prompt)
    rendered = template.render(**kwargs)

    return rendered


def get_system_prompt(prompt_name: str, llm: LLM = None) -> str:
    custom_system_prompt_name = f"{prompt_name}.system_prompt"

    custom_system_prompt = _get_prompt(custom_system_prompt_name, llm)
    if custom_system_prompt:
        print(f"Custom system prompt '{custom_system_prompt_name}' found.")
        return custom_system_prompt
    
    print(f"Custom system prompt '{custom_system_prompt_name}' not found. Using default.")
    system_prompt = _get_prompt("system_prompt", llm)
    return system_prompt


def get_user_prompt(prompt_name: str, llm: LLM = None, **kwargs) -> str:
    prompt = _get_prompt(prompt_name, llm)
    rendered_prompt = apply_prompt_args(prompt, **kwargs)
    return rendered_prompt


def _get_prompt(prompt_name: str, llm: LLM = None) -> str:
    # Keep track of loaded prompts    
    global _default_prompts
    global _model_prompts

    # Check if the prompt name is provided
    if not prompt_name:
        return None

    # Check if the default prompts have been loaded
    if _default_prompts is None:
        try:
            print(f"Loading default prompts from {PROMPTS_FILE_PATH / DEFAULT_PROMPT_FILE}")
            with open(PROMPTS_FILE_PATH / DEFAULT_PROMPT_FILE, "r") as f:
                _default_prompts = yaml.safe_load(f)
        except FileNotFoundError:
            print(f"Error: default prompts not found at {PROMPTS_FILE_PATH / DEFAULT_PROMPT_FILE}")
            return None
        except yaml.YAMLError:
            print(f"Error: Could not parse default prompts at {PROMPTS_FILE_PATH / DEFAULT_PROMPT_FILE}")

    # Check if a model is provided, if so then get the model name
    model_name = llm.internal_name if llm else None
    model_prompts = None

    # If there is a model name, check if there is already a loaded file for that model
    if model_name:
        if model_name in _model_prompts:
            model_prompts = _model_prompts[model_name]
        else:
            if os.path.exists(PROMPTS_FILE_PATH / f"{model_name}.yaml"):
                try:
                    print(f"Loading model-specific prompts from {PROMPTS_FILE_PATH / f'{model_name}.yaml'}")
                    with open(PROMPTS_FILE_PATH / f"{model_name}.yaml", "r") as f:
                        model_prompts = yaml.safe_load(f)
                        _model_prompts[model_name] = model_prompts
                except FileNotFoundError:
                    _model_prompts[model_name] = None
                    print(f"Model-specific prompts not found at {PROMPTS_FILE_PATH / f'{model_name}.yaml'}")
                except yaml.YAMLError:
                    _model_prompts[model_name] = None
                    print(f"Error: Could not parse model-specific prompts at {PROMPTS_FILE_PATH / f'{model_name}.yaml'}")
            else:
                _model_prompts[model_name] = None
                print(f"No model-specific prompts exist for model: {model_name}")

    # Check if the prompt name exists in the model-specific prompts
    if model_prompts:
        print(f"(Using model-specific prompts for {model_name})")
        if prompt_name in model_prompts:
            print(f"Prompt '{prompt_name}' found in model-specific prompts.")
            return model_prompts.get(prompt_name)
    
    # If the prompt is not found in the model-specific prompts, check the default prompts
    if prompt_name in _default_prompts:
        print(f"Prompt '{prompt_name}' found in default prompts.")
        return _default_prompts.get(prompt_name)
    
    print(f"Error: Prompt '{prompt_name}' not found in any prompt yaml file.")
    return None