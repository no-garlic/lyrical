import logging
import json
import random
from typing import Dict, Any, Optional
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from ..services.llm_generator import LLMGenerator
from ..services.utils.text import normalize_to_ascii
from .. import models


logger = logging.getLogger('apis')


class SongLyricsGenerator(LLMGenerator):
    def extract_parameters(self) -> Dict[str, Any]:
        return {
            'prompt_name': self.request.GET.get("prompt", "").strip(),
            'song_id': int(self.request.GET.get("song_id", "")),
            'filter': self.request.GET.get("filter", "").strip(),
        }
    
    def query_database_data(self) -> Dict[str, Any]:
        # get the song ID from the request parameters
        song_id = self.extracted_params.get('song_id')
    
        # validate the song ID
        if not song_id:
            logger.error("Song ID is required for generating styles")
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
            'include_themes': include_themes,
            'exclude_themes': exclude_themes,
            'theme': song.theme,
            'narrative': song.narrative,
            'mood': song.mood,
            'hook': song.hook,
            'custom_request': song.structure_custom_request,
            'vocalisation_level': song.structure_vocalisation_level,
            'vocalisation_terms': song.structure_vocalisation_terms,
            'syllables': song.structure_average_syllables,
            'verse_count': song.structure_verse_count,
            'verse_lines': song.structure_verse_lines,
            'pre_chorus_lines': song.structure_pre_chorus_lines,
            'chorus_lines': song.structure_chorus_lines,
            'bridge_lines': song.structure_bridge_lines,
            'intro_lines': song.structure_intro_lines,
            'outro_lines': song.structure_outro_lines,
            'vocalisation_lines': song.structure_vocalisation_lines,
        }    

    def uses_conversation_history(self) -> bool:
        return True

    def get_prompt_name(self) -> str:
        return self.extracted_params['prompt_name']
    
    def get_message_type(self) -> str:
        return 'lyrics'
    
    def get_song_id(self) -> int:
        return self.extracted_params['song_id']

    def build_user_prompt_params(self) -> Dict[str, Any]:
        return {}

    def log_generation_params(self) -> None:
        params = self.extracted_params
        logger.debug(f"Generating song lyrics with parameters: {params}")
    
    def preprocess_ndjson(self, ndjson_line: str) -> str:
        data = json.loads(ndjson_line)
    

        print(json.dumps(data, indent=2))


        return json.dumps(data)
        

@login_required
@require_http_methods(["GET"])
def api_gen_song_lyrics(request):
    generator = SongLyricsGenerator(request)
    return generator.generate()
