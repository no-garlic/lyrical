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


@login_required
@require_http_methods(["GET"])
def api_song_gen_names(request):
    """
    generate song names using llm based on user parameters and themes
    
    args:
        request: django http request object with query parameters
        
    returns:
        streaminghttpresponse: llm generated song names or json error response
    """
    try:
        # extract and validate query parameters
        prompt_name = request.GET.get("prompt", "").strip()
        
        if not prompt_name:
            logger.warning("song name generation failed: missing prompt name")
            return JsonResponse({
                "success": False,
                "error": "prompt name is required to generate song names"
            }, status=400)
        
        # validate prompt name format to prevent injection attacks
        if not prompt_name.replace('_', '').replace('-', '').isalnum():
            logger.warning(f"song name generation failed: invalid prompt name '{prompt_name}'")
            return JsonResponse({
                "success": False,
                "error": "prompt name can only contain letters, numbers, hyphens, and underscores"
            }, status=400)
        
        # extract and validate numeric parameters with defaults
        try:
            count = int(request.GET.get("count", 1))
            min_words = int(request.GET.get("min_words", 1))
            max_words = int(request.GET.get("max_words", 5))
        except ValueError as param_error:
            logger.warning(f"song name generation failed: invalid numeric parameters - {str(param_error)}")
            return JsonResponse({
                "success": False,
                "error": "count, min_words, and max_words must be valid numbers"
            }, status=400)
        
        # validate parameter ranges
        if count < 1 or count > 50:
            logger.warning(f"song name generation failed: invalid count {count}")
            return JsonResponse({
                "success": False,
                "error": "count must be between 1 and 50"
            }, status=400)
        
        if min_words < 1 or min_words > 20:
            logger.warning(f"song name generation failed: invalid min_words {min_words}")
            return JsonResponse({
                "success": False,
                "error": "min_words must be between 1 and 20"
            }, status=400)
        
        if max_words < min_words or max_words > 20:
            logger.warning(f"song name generation failed: invalid max_words {max_words}")
            return JsonResponse({
                "success": False,
                "error": "max_words must be between min_words and 20"
            }, status=400)
        
        # extract and validate theme parameters
        include_themes_raw = request.GET.get("include_themes", "").strip()
        exclude_themes_raw = request.GET.get("exclude_themes", "").strip()
        exclude_words_raw = request.GET.get("exclude_words", "").strip()
        
        # format theme parameters safely
        include_themes = f"[{include_themes_raw}]" if include_themes_raw else "[]"
        exclude_themes = f"[{exclude_themes_raw}]" if exclude_themes_raw else "[]"
        exclude_words = f"[{exclude_words_raw}]" if exclude_words_raw else "[]"
        
        # validate theme parameter lengths to prevent excessively long inputs
        if len(include_themes) > 1000:
            logger.warning("song name generation failed: include_themes too long")
            return JsonResponse({
                "success": False,
                "error": "include_themes parameter is too long (max 1000 characters)"
            }, status=400)
        
        if len(exclude_themes) > 1000:
            logger.warning("song name generation failed: exclude_themes too long")
            return JsonResponse({
                "success": False,
                "error": "exclude_themes parameter is too long (max 1000 characters)"
            }, status=400)
        
        if len(exclude_words) > 1000:
            logger.warning("song name generation failed: exclude_words too long")
            return JsonResponse({
                "success": False,
                "error": "exclude_words parameter is too long (max 1000 characters)"
            }, status=400)
        
        # get excluded song names from database with error handling
        try:
            qs_excluded = models.ExcludeSongName.objects.values('title')
            qs_previous = models.Song.objects.values('title')
            combined_titles_qs = qs_excluded.union(qs_previous)
            exclude_song_names = [item['title'] for item in combined_titles_qs]
            
            logger.debug(f"excluding {len(exclude_song_names)} existing song names from generation")
            
        except Exception as db_error:
            logger.error(f"error fetching excluded song names: {str(db_error)}")
            return JsonResponse({
                "success": False,
                "error": "unable to fetch existing song names for exclusion"
            }, status=500)
        
        # determine current user with fallback for testing
        current_user = request.user
        if not current_user.is_authenticated:
            # only allow fallback authentication in development/testing
            if not getattr(settings, 'DEBUG', False):
                logger.warning("unauthenticated song name generation attempt in production")
                return JsonResponse({
                    "success": False,
                    "error": "authentication required to generate song names"
                }, status=401)
            
            try:
                current_user = models.User.objects.get(username="mpetrou")
                logger.info("using fallback test user for song name generation")
            except models.User.DoesNotExist:
                logger.error("fallback test user 'mpetrou' not found")
                return JsonResponse({
                    "success": False,
                    "error": "authentication required and fallback user not available"
                }, status=401)
        
        # get llm model configuration
        try:
            llm_model_name = "gemini-2.0-flash"
            llm_model = models.LLM.objects.get(internal_name=llm_model_name)
            logger.debug(f"using llm model: {llm_model_name}")
            
        except models.LLM.DoesNotExist:
            logger.error(f"llm model '{llm_model_name}' not found in database")
            return JsonResponse({
                "success": False,
                "error": "llm model configuration not found, please contact support"
            }, status=500)
        
        # get prompts from yaml configuration
        try:
            system_message = get_system_prompt(prompt_name, llm_model)
            user_message = get_user_prompt(
                prompt_name=prompt_name,
                llm=llm_model,
                count=count,
                min_words=min_words,
                max_words=max_words,
                include_themes=include_themes,
                exclude_themes=exclude_themes,
                exclude_words=exclude_words,
                exclude_song_names=exclude_song_names
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
            
            logger.info(f"starting song name generation for user '{current_user.username}' with prompt '{prompt_name}'")
            logger.debug(f"generation parameters: count={count}, min_words={min_words}, max_words={max_words}")
            
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
            
            logger.info(f"song name generation stream started for user '{current_user.username}'")
            return StreamingHttpResponse(
                response_stream_generator,
                content_type="application/x-ndjson"
            )
            
        except Exception as llm_error:
            logger.error(f"llm service error during song name generation: {str(llm_error)}")
            return JsonResponse({
                "success": False,
                "error": "failed to generate song names, please try again later"
            }, status=500)
    
    except Exception as e:
        logger.error(f"unexpected error in song name generation api: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": "an unexpected error occurred while generating song names"
        }, status=500)



