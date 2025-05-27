import logging
import json
import random
from typing import Dict, Any, Optional
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from ..services.llm_generator import LLMGenerator
from ..services.utils.text import normalize_to_ascii
from .. import models


logger = logging.getLogger(__name__)


class SongGenerator(LLMGenerator):
    def extract_parameters(self) -> Dict[str, Any]:
        return {
            'prompt_name': self.request.GET.get("prompt", "").strip(),
        }
    

    def query_database_data(self) -> Dict[str, Any]:
        return {}
    

    def get_prompt_name(self) -> str:
        return self.extracted_params['prompt_name']
    

    def build_user_prompt_params(self) -> Dict[str, Any]:
        return {}
    
    
    def log_generation_params(self) -> None:
        params = self.extracted_params
        logger.debug(f"Generating song names with parameters: {params}")
    
    
    def preprocess_ndjson(self, ndjson_line: str) -> str:
        data = json.loads(ndjson_line)
    
        return json.dumps(data)
        

@login_required
@require_http_methods(["GET"])
def api_gen_song(request):
    generator = SongGenerator(request)
    return generator.generate()
