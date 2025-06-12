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


class SongNamesGenerator(LLMGenerator):
    def extract_parameters(self) -> Dict[str, Any]:
        return {
            'prompt_name': self.request.GET.get("prompt", "").strip(),
            'include_themes': self.request.GET.get("include_themes", "").strip(),
            'exclude_themes': self.request.GET.get("exclude_themes", "").strip(),
            'include_words': self.request.GET.get("include_words", "").strip(),
            'exclude_words': self.request.GET.get("exclude_words", "").strip(),
            'starts_with': self.request.GET.get("starts_with", "").strip(),
            'ends_with': self.request.GET.get("ends_with", "").strip(),
            'count': int(self.request.GET.get("count", 1)),
            'min_words': int(self.request.GET.get("min_words", 1)),
            'max_words': int(self.request.GET.get("max_words", 5)),
            'custom_prompt': self.request.GET.get("custom_prompt", "").strip(),
        }
    

    def uses_conversation_history(self) -> bool:
        return False
    

    def query_database_data(self) -> Dict[str, Any]:
        # get excluded song names from database
        all_songs = models.Song.objects.values('name')
        exclude_song_names = [item['name'] for item in all_songs]
        
        logger.debug(f"excluding {len(exclude_song_names)} existing song names from generation")
        
        return {
            'exclude_song_names': exclude_song_names
        }
    

    def get_prompt_name(self) -> str:
        return self.extracted_params['prompt_name']
    

    def get_message_type(self) -> str:
        return 'names'
    
    
    def get_song_id(self) -> int:
        return None
    

    def get_excluded_song_names(self) -> Optional[list]:
        """
        Returns a list of song names to exclude from generation.
        If no song names are available, returns None.
        """
        list_of_names = self.extracted_params['exclude_song_names']

        # split the names into lines of 110+ characters each, splitting after the next comma
        if not list_of_names:
            return None
        excluded_names = []
        current_line = ""
        for name in list_of_names:
            if len(current_line) + len(name) + 2 > 110:
                excluded_names.append(current_line.strip() + '\n')
                current_line = "'" + name + "', "
            else:
                current_line += "'" + name + "', "
        if current_line:
            excluded_names.append(current_line.strip() + '\n')

        excluded_names[-1] = excluded_names[-1].rstrip(', \n')


        logger.debug(f"Excluded song names: {excluded_names}")
        return excluded_names if excluded_names else None        
        

    def build_user_prompt_params(self) -> Dict[str, Any]:
        return {
            'include_themes': self.extracted_params['include_themes'],
            'exclude_themes': self.extracted_params['exclude_themes'],
            'include_words': self.extracted_params['include_words'],
            'exclude_words': self.extracted_params['exclude_words'],
            'starts_with': self.extracted_params['starts_with'],
            'ends_with': self.extracted_params['ends_with'],
            'count': self.extracted_params['count'],
            'min_words': self.extracted_params['min_words'],
            'max_words': self.extracted_params['max_words'],
            'exclude_song_names': self.get_excluded_song_names(),
            'custom_prompt': self.extracted_params['custom_prompt'],
        }
    
    
    def log_generation_params(self) -> None:
        params = self.extracted_params
        logger.debug(f"Generating song names with parameters: {params}")
            
    
    def preprocess_ndjson(self, ndjson_line: str) -> str:
        data = json.loads(ndjson_line)
        
        # get the song name from the data
        name = normalize_to_ascii(data["name"])
        data["name"] = name

        # create a new song object in the database
        song = models.Song.objects.create(name=data["name"], user=self.request.user)
        logger.debug(f"Created song with ID {song.id} and name '{song.name}'")

        # create new song metadata
        models.SongMetadata.objects.create(song=song, key='include_themes', value=self.extracted_params.get('include_themes', ''))
        models.SongMetadata.objects.create(song=song, key='exclude_themes', value=self.extracted_params.get('exclude_themes', ''))

        # add the new song ID to the data
        data['id'] = song.id
        logger.debug(f"Preprocessed NDJSON line: {data}")
        return json.dumps(data)
        

@login_required
@require_http_methods(["GET"])
def api_gen_song_names(request):
    generator = SongNamesGenerator(request)
    return generator.generate()
