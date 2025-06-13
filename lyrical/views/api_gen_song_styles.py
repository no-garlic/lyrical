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


class SongStylesGenerator(LLMGenerator):
    def extract_parameters(self) -> Dict[str, Any]:
        return {
            'prompt_name': self.request.GET.get("prompt", "").strip(),
            'song_id': int(self.request.GET.get("song_id", "")),
            'custom_request': self.request.GET.get("custom_request", "").strip(),
            'style_filter': self.request.GET.get("style_filter", "").strip(),
        }

    
    def uses_conversation_history(self) -> bool:
        return False


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
        }    


    def get_prompt_name(self) -> str:
        return self.extracted_params['prompt_name']


    def get_message_type(self) -> str:
        return ''


    def get_song_id(self) -> int:
        return self.extracted_params['song_id']


    def build_user_prompt_params(self) -> Dict[str, Any]:
        params = {
            'song_name': self.extracted_params['song_name'],
            'custom_request': self.extracted_params['custom_request'],
            'include_themes': self.extracted_params['include_themes'],
            'exclude_themes': self.extracted_params['exclude_themes'],
        }

        theme = self.extracted_params['style_filter'] == '' or self.extracted_params['style_filter'] == 'THEME'
        narrative = self.extracted_params['style_filter'] == '' or self.extracted_params['style_filter'] == 'NARRATIVE'
        mood = self.extracted_params['style_filter'] == '' or self.extracted_params['style_filter'] == 'MOOD'
        
        params['theme'] = theme
        params['narrative'] = narrative
        params['mood'] = mood

        return params
    
    
    def log_generation_params(self) -> None:
        params = self.extracted_params
        logger.debug(f"Generating song styles with parameters: {params}")
            
    
    def preprocess_ndjson(self, ndjson_line: str) -> str:
        data = json.loads(ndjson_line)
        
        if data.get("theme"):
            # normalize the theme text to ASCII
            data["theme"] = normalize_to_ascii(data["theme"])
            section = models.Section.objects.create(
                song_id=self.extracted_params.get("song_id"),
                type='theme',
                text=data["theme"]
            )
            data['id'] = section.id
            logger.debug(f"Added theme: {data['theme']} to song ID {self.extracted_params.get('song_id')}")

        if data.get("narrative"):
            # normalize the narrative text to ASCII
            data["narrative"] = normalize_to_ascii(data["narrative"])
            section = models.Section.objects.create(
                song_id=self.extracted_params.get("song_id"),
                type='narrative',
                text=data["narrative"]
            )
            data['id'] = section.id
            logger.debug(f"Added narrative: {data['narrative']} to song ID {self.extracted_params.get('song_id')}")

        if data.get("mood"):
            # normalize the mood text to ASCII
            data["mood"] = normalize_to_ascii(data["mood"])
            section = models.Section.objects.create(
                song_id=self.extracted_params.get("song_id"),
                type='mood',
                text=data["mood"]
            )
            data['id'] = section.id
            logger.debug(f"Added mood: {data['mood']} to song ID {self.extracted_params.get('song_id')}")

        # add the new song ID to the data
        logger.debug(f"Preprocessed NDJSON line: {data}")
        return json.dumps(data)
        

@login_required
@require_http_methods(["GET"])
def api_gen_song_styles(request):
    generator = SongStylesGenerator(request)
    return generator.generate()
