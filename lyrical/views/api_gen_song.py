import logging
from django.http import JsonResponse, StreamingHttpResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.conf import settings
from ..services.llm_service import llm_call
from ..services.utils.prompts import get_system_prompt, get_user_prompt
from ..services.utils.messages import MessageBuilder
from .. import models


logger = logging.getLogger(__name__)


@require_http_methods(["GET"])
def api_gen_song(request):
    """
    generate complete song lyrics using llm based on detailed song parameters
    
    args:
        request: django http request object with query parameters for song structure
        
    returns:
        streaminghttpresponse: llm generated song lyrics or json error response
    """
    try:
        # extract and validate required parameters
        prompt_name = request.GET.get("prompt", "").strip()
        song_name = request.GET.get("song_name", "").strip()
        song_theme = request.GET.get("song_theme", "").strip()
        
        if not prompt_name:
            logger.warning("song generation failed: missing prompt name")
            return JsonResponse({
                "success": False,
                "error": "prompt name is required to generate songs"
            }, status=400)
        
        # validate prompt name format
        if not prompt_name.replace('_', '').replace('-', '').isalnum():
            logger.warning(f"song generation failed: invalid prompt name '{prompt_name}'")
            return JsonResponse({
                "success": False,
                "error": "prompt name can only contain letters, numbers, hyphens, and underscores"
            }, status=400)
        
        if not song_name:
            logger.warning("song generation failed: missing song name")
            return JsonResponse({
                "success": False,
                "error": "song name is required to generate lyrics"
            }, status=400)
        
        # validate song name length
        if len(song_name) > 200:
            logger.warning(f"song generation failed: song name too long ({len(song_name)} characters)")
            return JsonResponse({
                "success": False,
                "error": "song name cannot exceed 200 characters"
            }, status=400)
        
        # validate song theme if provided
        if song_theme and len(song_theme) > 500:
            logger.warning(f"song generation failed: song theme too long ({len(song_theme)} characters)")
            return JsonResponse({
                "success": False,
                "error": "song theme cannot exceed 500 characters"
            }, status=400)
        
        # extract and validate numeric parameters with defaults and ranges
        try:
            verse_count = int(request.GET.get("verse_count", 1))
            verse_lines = int(request.GET.get("verse_lines", 4))
            pre_chorus_lines = int(request.GET.get("pre_chorus_lines", 4))
            chorus_lines = int(request.GET.get("chorus_lines", 4))
            bridge_lines = int(request.GET.get("bridge_lines", 4))
            outro_lines = int(request.GET.get("outro_lines", 4))
            vocalisation_lines = int(request.GET.get("vocalisation_lines", 0))
            song_vocalisation_level = int(request.GET.get("song_vocalisation_level", 0))
            syllables = int(request.GET.get("syllables", 8))
            
        except ValueError as param_error:
            logger.warning(f"song generation failed: invalid numeric parameters - {str(param_error)}")
            return JsonResponse({
                "success": False,
                "error": "all numeric parameters must be valid integers"
            }, status=400)
        
        # validate parameter ranges
        if verse_count < 1 or verse_count > 10:
            logger.warning(f"song generation failed: invalid verse_count {verse_count}")
            return JsonResponse({
                "success": False,
                "error": "verse_count must be between 1 and 10"
            }, status=400)
        
        if verse_lines < 1 or verse_lines > 20:
            logger.warning(f"song generation failed: invalid verse_lines {verse_lines}")
            return JsonResponse({
                "success": False,
                "error": "verse_lines must be between 1 and 20"
            }, status=400)
        
        if pre_chorus_lines < 0 or pre_chorus_lines > 20:
            logger.warning(f"song generation failed: invalid pre_chorus_lines {pre_chorus_lines}")
            return JsonResponse({
                "success": False,
                "error": "pre_chorus_lines must be between 0 and 20"
            }, status=400)
        
        if chorus_lines < 1 or chorus_lines > 20:
            logger.warning(f"song generation failed: invalid chorus_lines {chorus_lines}")
            return JsonResponse({
                "success": False,
                "error": "chorus_lines must be between 1 and 20"
            }, status=400)
        
        if bridge_lines < 0 or bridge_lines > 20:
            logger.warning(f"song generation failed: invalid bridge_lines {bridge_lines}")
            return JsonResponse({
                "success": False,
                "error": "bridge_lines must be between 0 and 20"
            }, status=400)
        
        if outro_lines < 0 or outro_lines > 20:
            logger.warning(f"song generation failed: invalid outro_lines {outro_lines}")
            return JsonResponse({
                "success": False,
                "error": "outro_lines must be between 0 and 20"
            }, status=400)
        
        if vocalisation_lines < 0 or vocalisation_lines > 20:
            logger.warning(f"song generation failed: invalid vocalisation_lines {vocalisation_lines}")
            return JsonResponse({
                "success": False,
                "error": "vocalisation_lines must be between 0 and 20"
            }, status=400)
        
        if song_vocalisation_level < 0 or song_vocalisation_level > 3:
            logger.warning(f"song generation failed: invalid song_vocalisation_level {song_vocalisation_level}")
            return JsonResponse({
                "success": False,
                "error": "song_vocalisation_level must be between 0 and 3"
            }, status=400)
        
        if syllables < 1 or syllables > 50:
            logger.warning(f"song generation failed: invalid syllables {syllables}")
            return JsonResponse({
                "success": False,
                "error": "syllables must be between 1 and 50"
            }, status=400)
        
        # extract and validate optional text parameters
        vocalisation_terms = request.GET.get("vocalisation_terms", "").strip()
        if vocalisation_terms and len(vocalisation_terms) > 500:
            logger.warning(f"song generation failed: vocalisation_terms too long ({len(vocalisation_terms)} characters)")
            return JsonResponse({
                "success": False,
                "error": "vocalisation_terms cannot exceed 500 characters"
            }, status=400)
        
        # determine current user with fallback for testing
        current_user = request.user
        if not current_user.is_authenticated:
            # only allow fallback authentication in development/testing
            if not getattr(settings, 'DEBUG', False):
                logger.warning("unauthenticated song generation attempt in production")
                return JsonResponse({
                    "success": False,
                    "error": "authentication required to generate songs"
                }, status=401)
            
            try:
                current_user = models.User.objects.get(username="mpetrou")
                logger.info("using fallback test user for song generation")
            except models.User.DoesNotExist:
                logger.error("fallback test user 'mpetrou' not found")
                return JsonResponse({
                    "success": False,
                    "error": "authentication required and fallback user not available"
                }, status=401)
        
        # get user's llm model configuration
        try:
            llm_model = current_user.llm_model
            if not llm_model:
                logger.error(f"user '{current_user.username}' has no llm model assigned")
                return JsonResponse({
                    "success": False,
                    "error": "no llm model configured for your account, please contact support"
                }, status=500)
                
            logger.debug(f"using llm model: {llm_model.internal_name}")
            
        except Exception as model_error:
            logger.error(f"error accessing llm model for user '{current_user.username}': {str(model_error)}")
            return JsonResponse({
                "success": False,
                "error": "unable to access llm model configuration"
            }, status=500)
        
        # map vocalisation level to descriptive name
        song_vocalisation_level_names = [None, "low", "medium", "high"]
        try:
            vocalisation_level_name = song_vocalisation_level_names[song_vocalisation_level]
        except IndexError:
            logger.error(f"invalid vocalisation level index: {song_vocalisation_level}")
            return JsonResponse({
                "success": False,
                "error": "internal error with vocalisation level mapping"
            }, status=500)
        
        # get prompts from yaml configuration
        try:
            system_message = get_system_prompt(prompt_name, llm_model)
            user_message = get_user_prompt(
                prompt_name=prompt_name,
                llm=llm_model,
                song_name=song_name,
                song_theme=song_theme,
                verse_count=verse_count,
                verse_lines=verse_lines,
                pre_chorus_lines=pre_chorus_lines,
                chorus_lines=chorus_lines,
                bridge_lines=bridge_lines,
                outro_lines=outro_lines,
                vocalisation_lines=vocalisation_lines,
                vocalisation_terms=vocalisation_terms,
                song_vocalisation_level=vocalisation_level_name,
                syllables=syllables
            )
            
            if user_message is None:
                logger.error(f"prompt '{prompt_name}' not found in prompts configuration")
                return JsonResponse({
                    "success": False,
                    "error": f"prompt configuration '{prompt_name}' not found"
                }, status=404)
            
            if system_message is None:
                logger.error(f"system prompt for '{prompt_name}' not found in configuration")
                return JsonResponse({
                    "success": False,
                    "error": "system prompt configuration not found"
                }, status=500)
                
        except Exception as prompt_error:
            logger.error(f"error loading prompt configuration for '{prompt_name}': {str(prompt_error)}")
            return JsonResponse({
                "success": False,
                "error": "failed to load prompt configuration"
            }, status=500)
        
        # create message builder for llm conversation
        try:
            prompt_messages = MessageBuilder()
            prompt_messages.add_system(system_message)
            prompt_messages.add_user(user_message)
            
            logger.info(f"starting song generation for user '{current_user.username}' with song '{song_name}'")
            logger.debug(f"song parameters: verses={verse_count}, verse_lines={verse_lines}, chorus_lines={chorus_lines}")
            
        except Exception as message_error:
            logger.error(f"error building prompt messages: {str(message_error)}")
            return JsonResponse({
                "success": False,
                "error": "failed to prepare prompt messages for llm"
            }, status=500)
        
        # call llm service and stream response
        try:
            response_stream_generator = llm_call(
                prompt_messages=prompt_messages,
                user=current_user,
                llm=llm_model
            )
            
            logger.info(f"song generation stream started for user '{current_user.username}' with song '{song_name}'")
            return StreamingHttpResponse(
                response_stream_generator,
                content_type="application/x-ndjson"
            )
            
        except Exception as llm_error:
            logger.error(f"llm service error during song generation: {str(llm_error)}")
            return JsonResponse({
                "success": False,
                "error": "failed to generate song lyrics, please try again later"
            }, status=500)
    
    except Exception as e:
        logger.error(f"unexpected error in song generation api: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": "an unexpected error occurred while generating the song"
        }, status=500)
