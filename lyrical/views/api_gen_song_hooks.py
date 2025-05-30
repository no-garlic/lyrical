import logging
import json
from typing import Dict, Any, Optional
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from ..services.llm_generator import LLMGenerator
from ..services.utils.text import normalize_to_ascii
from .. import models
from ..logging_config import get_logger


logger = get_logger('apis')


class SongHooksGenerator(LLMGenerator):
    def extract_parameters(self) -> Dict[str, Any]:
        return {
            'prompt_name': self.request.GET.get("prompt", "").strip(),
            'song_id': int(self.request.GET.get("song_id", "")),
            'rhyme': self.request.GET.get("rhyme", "").strip(),
            'vocalisation_terms': self.request.GET.get("vocalisation_terms", "").strip(),
            'vocalisation_level': int(self.request.GET.get("vocalisation_level", 0)),
            'lines': int(self.request.GET.get("lines", 1)),
            'count': int(self.request.GET.get("count", 5)),
            'syllables': int(self.request.GET.get("syllables", 8)),
            'custom_prompt': self.request.GET.get("custom_prompt", "").strip(),
        }
    

    def query_database_data(self) -> Dict[str, Any]:
        # get the song ID from the request parameters
        song_id = self.extracted_params.get('song_id')

        # validate the song ID
        if not song_id:
            logger.error("Song ID is required for generating hooks")
            return {}
        
        try:
            # fetch the song from the database
            song = models.Song.objects.get(id=song_id, user=self.request.user)
        except models.Song.DoesNotExist:
            logger.error(f"Song with ID {song_id} does not exist for user '{self.request.user.username}'")
            return {}
        except Exception as e:
            logger.error(f"Error fetching song with ID {song_id} for user '{self.request.user.username}': {str(e)}")
            return {}

        try:
            include_themes = models.SongMetadata.objects.get(song=song, key='include_themes').value
        except Exception:
            include_themes = self.request.user.song_name_theme_inc

        try:
            exclude_themes = models.SongMetadata.objects.get(song=song, key='exclude_themes').value
        except Exception:
            exclude_themes = self.request.user.song_name_theme_exc

        return {
            'song_name': song.name,
            'theme': song.theme,
            'narrative': song.narrative,
            'mood': song.mood,
            'include_themes': include_themes,
            'exclude_themes': exclude_themes,
        }    

    def get_prompt_name(self) -> str:
        return self.extracted_params['prompt_name']
    
    def get_message_type(self) -> str:
        return 'hook'
    
    def get_song_id(self) -> int:
        return self.extracted_params['song_id']

    def build_user_prompt_params(self) -> Dict[str, Any]:


        params = {
            'song_name': self.extracted_params['song_name'],
            'theme': self.extracted_params['theme'],
            'narrative': self.extracted_params['narrative'],
            'mood': self.extracted_params['mood'],
            'custom_prompt': self.extracted_params['custom_prompt'],
            'rhyme': self.extracted_params['rhyme'],
            'include_themes': self.extracted_params['include_themes'],
            'exclude_themes': self.extracted_params['exclude_themes'],
            'lines': self.extracted_params['lines'],
            'count': self.extracted_params['count'],
            'syllables': self.extracted_params['syllables'],
        }

        # handle vocalisation level and terms
        level = int(self.extracted_params['vocalisation_level'])
        if level > 0:
            names = [None, 'low', 'medium', 'high']
            index = max(min(level, 3), 1) # clamp index to 1-3
            params['vocalisation_level'] = names[index]

            vocalisation_terms = self.extracted_params['vocalisation_terms'].strip()
            if vocalisation_terms and len(vocalisation_terms) > 0:
                params['vocalisation_terms'] = vocalisation_terms

        return params
    
    
    def log_generation_params(self) -> None:
        params = self.extracted_params
        logger.debug(f"Generating song hooks with parameters: {params}")
            
    
    def preprocess_ndjson(self, ndjson_line: str) -> str:
        data = json.loads(ndjson_line)
        
        if data.get("hook"):
            # normalize the theme text to ASCII
            data["hook"] = normalize_to_ascii(data["hook"])
            section = models.Section.objects.create(
                song_id=self.extracted_params.get("song_id"),
                type='hook',
                text=data["hook"]
            )
            data['id'] = section.id
            logger.debug(f"Added hook: {data['hook']} to song ID {self.extracted_params.get('song_id')}")

        # add the new song ID to the data
        logger.debug(f"Preprocessed NDJSON line: {data}")
        return json.dumps(data)
        

@login_required
@require_http_methods(["GET"])
def api_gen_song_hooks(request):
    generator = SongHooksGenerator(request)
    return generator.generate()
