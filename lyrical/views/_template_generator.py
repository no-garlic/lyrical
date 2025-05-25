"""
Template for creating new LLM generation APIs.

Copy this file and customize the SampleGenerator class for your specific use case.
"""

import logging
from typing import Dict, Any, Optional
from django.views.decorators.http import require_http_methods
from ..services.base_llm_generator import BaseLLMGenerator
from .. import models


logger = logging.getLogger(__name__)


class SampleGenerator(BaseLLMGenerator):
    """
    sample generator - customize this for your specific use case.
    """
    
    def extract_parameters(self) -> Dict[str, Any]:
        """
        extract parameters from request.
        customize this method to extract your specific parameters.
        """
        # example: extract from GET parameters
        prompt_name = self.request.GET.get("prompt", "").strip()
        theme = self.request.GET.get("theme", "").strip()
        
        # example: extract from POST data
        # data = json.loads(self.request.body.decode('utf-8'))
        # prompt_name = data.get("prompt", "").strip()
        
        return {
            'prompt_name': prompt_name,
            'theme': theme
        }
    
    def validate_parameters(self, params: Dict[str, Any]) -> Optional[str]:
        """
        validate extracted parameters.
        return error message string if validation fails, None if successful.
        """
        if not params['prompt_name']:
            return "prompt name is required"
        
        if not params['theme']:
            return "theme is required"
        
        # add your specific validation logic here
        
        return None
    
    def query_database_data(self) -> Dict[str, Any]:
        """
        query database for additional data needed for prompts.
        return empty dict if no database queries needed.
        """
        # example: get some data from database
        # user_songs = models.Song.objects.filter(user=self.user).values_list('name', flat=True)
        
        return {
            # 'user_songs': list(user_songs)
        }
    
    def get_prompt_name(self) -> str:
        """
        get the prompt name to use for generation.
        """
        return self.extracted_params['prompt_name']
    
    def build_user_prompt_params(self) -> Dict[str, Any]:
        """
        build parameters for the user prompt.
        these will be passed to get_user_prompt(**params).
        """
        return {
            'theme': self.extracted_params['theme'],
            # add other parameters that your prompt template expects
        }
    
    def get_llm_model_name(self) -> str:
        """
        override to use a different model.
        """
        return "gemini-2.0-flash"  # or return a different model name
    
    def get_fallback_username(self) -> Optional[str]:
        """
        override to change fallback user or disable fallback.
        """
        return "mpetrou"  # or return None to disable fallback
    
    def log_generation_params(self) -> None:
        """
        log generation parameters for debugging.
        """
        params = self.extracted_params
        logger.debug(f"generation parameters: theme={params['theme']}")


@require_http_methods(["GET"])  # or ["POST"] depending on your needs
def api_sample_generator(request):
    """
    sample api endpoint using the generator pattern.
    
    args:
        request: django http request object
        
    returns:
        streaminghttpresponse: llm generated content or json error response
    """
    generator = SampleGenerator(request)
    return generator.generate()