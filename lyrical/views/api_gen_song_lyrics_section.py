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


class SongLyricsSectionGenerator(LLMGenerator):
    def extract_parameters(self) -> Dict[str, Any]:
        return {
            'prompt_name': self.request.GET.get("prompt", "").strip(),
            'song_id': int(self.request.GET.get("song_id", "")),
            'section_type': self.request.GET.get("section_type", "").strip(),
            'count': int(self.request.GET.get("count", 1)),
        }
    

    def query_database_data(self) -> Dict[str, Any]:
        return {}    


    def uses_conversation_history(self) -> bool:
        return True


    def get_prompt_name(self) -> str:
        return self.extracted_params['prompt_name']
    

    def get_message_type(self) -> str:
        return 'lyrics'
    

    def get_song_id(self) -> int:
        return self.extracted_params['song_id']


    def build_user_prompt_params(self) -> Dict[str, Any]:
        return {
            'section_type': self.extracted_params.get('section_type', ''),
            'custom_request': self.extracted_params.get('custom_request', ''),
            'count': self.extracted_params.get('count', 1),
        }


    def log_generation_params(self) -> None:
        params = self.extracted_params
        logger.debug(f"Generating song lyrics sections with parameters: {params}")
    

    def preprocess_ndjson(self, ndjson_line: str) -> str:
        data = json.loads(ndjson_line)
        print(f'in:\n{json.dumps(data, indent=2)}')

        # get the song ID from the request parameters
        song_id = self.extracted_params.get('song_id')
    
        # validate the song ID
        if not song_id:
            logger.error("Song ID is required for generating song sections")
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

        # create a new dictionary with cleaned section names
        cleaned_data = {}
        for section, words in data.items():
            # extract section type by removing trailing digits
            section_type = section.rstrip('0123456789')
            cleaned_data[section_type] = words

            # normalize the words to ASCII
            lyrics = "\n".join(words)
        
            # save the section to the database
            try:
                song_section = models.Section.objects.create(song=song, type=section_type, text=lyrics)
                song_section.save()
            except Exception as e:
                logger.error(f"Error creating section '{section_type}' for song ID {song_id}: {str(e)}")
                continue
        
        # update data with cleaned section names
        data = cleaned_data

        # return the updated data as a NDJSON string to process in javascript
        print(f'out:\n{json.dumps(data, indent=2)}')
        return json.dumps(data)
        

@login_required
@require_http_methods(["GET"])
def api_gen_song_lyrics_section(request):
    generator = SongLyricsSectionGenerator(request)
    return generator.generate()
