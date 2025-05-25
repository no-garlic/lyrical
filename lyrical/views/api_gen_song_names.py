import logging
from typing import Dict, Any, Optional
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from ..services.llm_generator import LLMGenerator
from .. import models


logger = logging.getLogger(__name__)


class SongNamesGenerator(LLMGenerator):
    """
    generates song names using llm based on user parameters and themes.
    """
    
    def extract_parameters(self) -> Dict[str, Any]:
        """
        extract parameters from GET request.
        """
        # extract basic parameters
        prompt_name = self.request.GET.get("prompt", "").strip()
        
        # extract numeric parameters with defaults
        try:
            count = int(self.request.GET.get("count", 1))
            min_words = int(self.request.GET.get("min_words", 1))
            max_words = int(self.request.GET.get("max_words", 5))
        except ValueError:
            count = min_words = max_words = None  # will be caught in validation
        
        # extract theme parameters
        include_themes_raw = self.request.GET.get("include_themes", "").strip()
        exclude_themes_raw = self.request.GET.get("exclude_themes", "").strip()
        exclude_words_raw = self.request.GET.get("exclude_words", "").strip()
        
        # format theme parameters safely
        include_themes = f"[{include_themes_raw}]" if include_themes_raw else "[]"
        exclude_themes = f"[{exclude_themes_raw}]" if exclude_themes_raw else "[]"
        exclude_words = f"[{exclude_words_raw}]" if exclude_words_raw else "[]"
        
        return {
            'prompt_name': prompt_name,
            'count': count,
            'min_words': min_words,
            'max_words': max_words,
            'include_themes': include_themes,
            'exclude_themes': exclude_themes,
            'exclude_words': exclude_words
        }
    

    def validate_parameters(self, params: Dict[str, Any]) -> Optional[str]:
        """
        validate extracted parameters.
        """
        # validate prompt name
        if not params['prompt_name']:
            return "prompt name is required to generate song names"
        
        # validate prompt name format to prevent injection attacks
        if not params['prompt_name'].replace('_', '').replace('-', '').isalnum():
            return "prompt name can only contain letters, numbers, hyphens, and underscores"
        
        # validate numeric parameters
        if any(x is None for x in [params['count'], params['min_words'], params['max_words']]):
            return "count, min_words, and max_words must be valid numbers"
        
        # validate parameter ranges
        if params['count'] < 1 or params['count'] > 50:
            return "count must be between 1 and 50"
        
        if params['min_words'] < 1 or params['min_words'] > 20:
            return "min_words must be between 1 and 20"
        
        if params['max_words'] < params['min_words'] or params['max_words'] > 20:
            return "max_words must be between min_words and 20"
        
        # validate theme parameter lengths to prevent excessively long inputs
        for theme_param in ['include_themes', 'exclude_themes', 'exclude_words']:
            if len(params[theme_param]) > 1000:
                return f"{theme_param} parameter is too long (max 1000 characters)"
        
        return None
    

    def query_database_data(self) -> Dict[str, Any]:
        """
        get excluded song names from database.
        """
        # get excluded song names from database
        all_songs = models.Song.objects.values('name')
        exclude_song_names = [item['name'] for item in all_songs]
        
        logger.debug(f"excluding {len(exclude_song_names)} existing song names from generation")
        
        return {
            'exclude_song_names': exclude_song_names
        }
    

    def get_prompt_name(self) -> str:
        """
        get the prompt name from extracted parameters.
        """
        return self.extracted_params['prompt_name']
    

    def build_user_prompt_params(self) -> Dict[str, Any]:
        """
        build parameters for the user prompt.
        """
        return {
            'count': self.extracted_params['count'],
            'min_words': self.extracted_params['min_words'],
            'max_words': self.extracted_params['max_words'],
            'include_themes': self.extracted_params['include_themes'],
            'exclude_themes': self.extracted_params['exclude_themes'],
            'exclude_words': self.extracted_params['exclude_words'],
            'exclude_song_names': self.extracted_params['exclude_song_names']
        }
    
    
    def log_generation_params(self) -> None:
        """
        log generation parameters for debugging.
        """
        params = self.extracted_params
        logger.debug(f"generation parameters: count={params['count']}, "
                    f"min_words={params['min_words']}, max_words={params['max_words']}")


@login_required
@require_http_methods(["GET"])
def api_gen_song_names(request):
    """
    generate song names using llm based on user parameters and themes.
    
    args:
        request: django http request object with query parameters
        
    returns:
        streaminghttpresponse: llm generated song names or json error response
    """
    generator = SongNamesGenerator(request)
    return generator.generate()
