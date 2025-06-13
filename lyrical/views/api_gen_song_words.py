import logging
import json
import random
from typing import Dict, Any, Optional
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from ..services.llm_generator import LLMGenerator
from ..services.utils.text import normalize_to_ascii
from .. import models
from ..logging_config import get_logger


logger = get_logger('apis')


class SongWordsGenerator(LLMGenerator):
    def extract_parameters(self) -> Dict[str, Any]:
        return {
            'prompt_name': self.request.GET.get("prompt", "").strip(),
            'song_id': int(self.request.GET.get("song_id", "")),
            'rhyme_with': self.request.GET.get("rhyme_with", "").strip(),
            'word_line': self.request.GET.get("word_line", -1),
            'word_index': self.request.GET.get("word_index", -1),
            'song_section': self.request.GET.get("song_section", "").strip(),
            'section_type': self.request.GET.get("section_type", "").strip(),
            'exclude_list': self.request.GET.get("exclude_list", "").strip(),
            'count': int(self.request.GET.get("count", 10)),
            'custom_request': self.request.GET.get("custom_request", "").strip(),
        }
    

    def uses_conversation_history(self) -> bool:
        return False
    

    def query_database_data(self) -> Dict[str, Any]:
        # get the song ID from the request parameters
        song_id = self.extracted_params.get('song_id')
    
        # validate the song ID
        if not song_id:
            logger.error("Song ID is required for generating words")
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
            'mood': song.mood
        }    

    def get_prompt_name(self) -> str:
        return self.extracted_params['prompt_name']
    

    def get_message_type(self) -> str:
        return ''
    
    
    def get_song_id(self) -> int:
        return self.extracted_params['song_id']
    

    def build_user_prompt_params(self) -> Dict[str, Any]:
        return {
            'song_name': self.extracted_params['song_name'],
            'include_themes': self.extracted_params['include_themes'],
            'exclude_themes': self.extracted_params['exclude_themes'],
            'theme': self.extracted_params['theme'],
            'narrative': self.extracted_params['narrative'],
            'mood': self.extracted_params['mood'],
            'rhyme_with': self.extracted_params['rhyme_with'],
            'exclude_list': self.extracted_params['exclude_list'].replace(',', ', '),
            'song_section': self.extracted_params['song_section'],
            'section_type': self.extracted_params['section_type'],
            'count': self.extracted_params['count'],
            'custom_request': self.extracted_params['custom_request'],
        }
    
    
    def log_generation_params(self) -> None:
        params = self.extracted_params
        logger.debug(f"Generating song words with parameters: {params}")
            
    
    def preprocess_ndjson(self, ndjson_line: str) -> str:
        data = json.loads(ndjson_line)
        
        new_data = {}

        for index, word in data.items():
            word = normalize_to_ascii(word)
            new_data['word'] = word
            new_data['line'] = self.extracted_params['word_line']
            new_data['index'] = self.extracted_params['word_index']

        # add the new song ID to the data
        logger.debug(f"Preprocessed NDJSON line: {new_data}")
        return json.dumps(new_data)
        

@login_required
@require_http_methods(["GET"])
def api_gen_song_words(request):
    generator = SongWordsGenerator(request)
    return generator.generate()
