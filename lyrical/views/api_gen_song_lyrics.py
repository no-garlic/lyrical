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
            'custom_request': song.structure_custom_request,
            'vocalisation_level': song.get_structure_vocalisation_level_display().lower(),
            'vocalisation_terms': song.structure_vocalisation_terms,
            'syllables': song.structure_average_syllables,
            'verse_count': song.structure_verse_count if song.structure.find('verse') != -1 else 0,
            'verse_lines': song.structure_verse_lines if song.structure.find('verse') != -1 else None,
            'pre_chorus_lines': song.structure_pre_chorus_lines if song.structure.find('pre-chorus') != -1 else None,
            'chorus_lines': song.structure_chorus_lines if song.structure.find('chorus') != -1 else None,
            'bridge_lines': song.structure_bridge_lines if song.structure.find('bridge') != -1 else None,
            'intro_lines': song.structure_intro_lines if song.structure.find('intro') != -1 else None,
            'outro_lines': song.structure_outro_lines if song.structure.find('outro') != -1 else None,
            'vocalisation_lines': song.structure_vocalisation_lines if song.structure.find('vocalisation') != -1 else None,
        }    

    def uses_conversation_history(self) -> bool:
        # TODO: We relly need the follow_up prompt
        return True

    def get_prompt_name(self) -> str:
        return self.extracted_params['prompt_name']
    
    def get_message_type(self) -> str:
        return 'lyrics'
    
    def get_song_id(self) -> int:
        return self.extracted_params['song_id']

    def build_user_prompt_params(self) -> Dict[str, Any]:
        return {
            'song_name': self.extracted_params.get('song_name', ''),
            'include_themes': self.extracted_params.get('include_themes', ''),
            'exclude_themes': self.extracted_params.get('exclude_themes', ''),
            'theme': self.extracted_params.get('theme', ''),
            'narrative': self.extracted_params.get('narrative', ''),
            'mood': self.extracted_params.get('mood', ''),
            'custom_request': self.extracted_params.get('custom_request', ''),
            'vocalisation_level': self.extracted_params.get('vocalisation_level', ''),
            'vocalisation_terms': self.extracted_params.get('vocalisation_terms', ''),
            'syllables': self.extracted_params.get('syllables', ''),
            'verse_count': self.extracted_params.get('verse_count', ''),
            'verse_lines': self.extracted_params.get('verse_lines', ''),
            'pre_chorus_lines': self.extracted_params.get('pre_chorus_lines', ''),
            'chorus_lines': self.extracted_params.get('chorus_lines', ''),
            'bridge_lines': self.extracted_params.get('bridge_lines', ''),
            'intro_lines': self.extracted_params.get('intro_lines', ''),
            'outro_lines': self.extracted_params.get('outro_lines', ''),
            'vocalisation_lines': self.extracted_params.get('vocalisation_lines', ''),
        }


    def log_generation_params(self) -> None:
        params = self.extracted_params
        logger.debug(f"Generating song lyrics with parameters: {params}")
    
    def preprocess_ndjson(self, ndjson_line: str) -> str:
        data = json.loads(ndjson_line)
        print(json.dumps(data, indent=2))

        # get the song ID from the request parameters
        song_id = self.extracted_params.get('song_id')
    
        # validate the song ID
        if not song_id:
            logger.error("Song ID is required for generating songs")
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

        # loop over all keys in the data
        for section, words in data.items():
            # split the section into section_type and section_index if there are trailing numbers
            if section[-1].isdigit():
                section_type = section[:-1]
                section_index = int(section[-1])
            else:
                section_type = section
                section_index = 0

            # get the lyrics object from the database
            try:
                lyrics_obj = models.Lyrics.objects.get(song=song, type=section_type, index=section_index)
            except models.Lyrics.DoesNotExist:
                logger.error(f"Lyrics section '{section_type}' with index {section_index} does not exist for song ID {song_id}")
                continue
            except Exception as e:
                logger.error(f"Error fetching lyrics section '{section_type}' with index {section_index} for song ID {song_id}: {str(e)}")
                continue

            # normalize the words to ASCII
            lyrics = "\n".join(words)
            logger.debug(f"lyrics for section '{section_type}' with index {section_index}:\n{lyrics}")

            # update the lyrics object with the normalized words
            lyrics_obj.words = lyrics
            
            # save the lyrics object to the database
            try:
                lyrics_obj.save()
                logger.debug(f"Updated section '{section_type}' with index {section_index} for song ID {song_id}")
            except Exception as e:
                logger.error(f"Error saving section '{section_type}' with index {section_index} for song ID {song_id}: {str(e)}")
        
            # savce the section to the database
            try:
                song_section = models.Section.objects.create(song=song, type=section_type, text=lyrics)
                song_section.save()
            except Exception as e:
                logger.error(f"Error creating section '{section_type}' for song ID {song_id}: {str(e)}")
                continue

        # return the original data as a NDJSON string to process in javascript
        return json.dumps(data)
    
    def on_response_complete(self) -> None:
        """
        Called after the full LLM response has been received.
        Updates the song stage to 'generated' when lyrics generation is complete.
        """
        song_id = self.get_song_id()
        
        if not song_id:
            logger.error("Song ID is required for updating song stage")
            return
        
        try:
            # fetch the song and update its stage
            song = models.Song.objects.get(id=song_id, user=self.user)
            song.stage = 'generated'
            song.save()
            logger.info(f"Updated song {song_id} stage to 'generated' after lyrics generation completion")
        except models.Song.DoesNotExist:
            logger.error(f"Song with ID {song_id} does not exist for user '{self.user.username}'")
        except Exception as e:
            logger.error(f"Error updating song {song_id} stage: {str(e)}")
        

@login_required
@require_http_methods(["GET"])
def api_gen_song_lyrics(request):
    generator = SongLyricsGenerator(request)
    return generator.generate()
