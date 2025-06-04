from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.db import transaction
from .. import models
import json
import logging
from ..logging_config import get_logger


logger = get_logger('apis')


@login_required
def api_lyrics_edit(request):
    """
    Edit song lyrics by ID.
    
    Args:
        request: The HTTP request object containing PUT data with song_id and updates
    
    Returns:
        JsonResponse: Success/error response
    """
    # validate request method
    if request.method != 'PUT':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        # parse the request body for PUT requests
        edit_data = json.loads(request.body.decode('utf-8'))

        logger.debug(f"Song lyrics edit request data: {json.dumps(edit_data, indent=2)}")
        
        """
        json_structure = {
            "song_id:": 0,
            "lyrics": {
                "1": "words"},
                "2": "words"},
                "3": "words"},
                "4": "words"},
                "5": "words"}
            }
        }
        """

        # validate required fields
        if not isinstance(edit_data, dict):
            return JsonResponse({"error": "Invalid data format. Expected a JSON object."}, status=400)
        if "song_id" not in edit_data or "lyrics" not in edit_data:
            return JsonResponse({"error": "Missing required fields: 'song_id' and 'lyrics'."}, status=400)
        if not isinstance(edit_data.get("lyrics"), dict):
            return JsonResponse({"error": "Invalid lyrics format. 'lyrics' must be a dict."}, status=400)

        # extract fields from the request
        song_id = edit_data.get("song_id")
        lyrics_update = edit_data.get("lyrics")

        try:
            # perform all updates in a single transaction
            with transaction.atomic():
                logger.info(f"User {request.user.username} is editing lyrics for song ID {song_id}")

                # iterate through the lyrics sections to validate and update
                for id, words in lyrics_update.items():
                    logger.info(f"Processing lyrics section ID {id} for song ID {song_id}")

                    # update the lyrics in the database
                    lyrics = models.Lyrics.objects.get(id=id, song_id=song_id)

                    # check if lyrics section exists
                    if not lyrics:
                        return JsonResponse({"error": f"Lyrics section with ID {id} not found for this song"}, status=404)
                    
                    # update the words for this section
                    lyrics.words = words.strip() if words else ""
                    lyrics.save()
                    
        except models.Lyrics.DoesNotExist:
            logger.error(f"Lyrics section not found for song ID {song_id} by user {request.user.username}")
            return JsonResponse({"error": "One or more lyrics sections not found for this song"}, status=404)
        except Exception as e:
            logger.error(f"Failed to update lyrics for song {song_id} by user {request.user.username}: {str(e)}")
            return JsonResponse({"error": "Failed to update lyrics. Please try again."}, status=500)

        # return success response
        logger.info(f"User {request.user.username} successfully edited lyrics for song ID {song_id}")
        return JsonResponse({"status": "success", "message": "Song lyrics updated successfully."}, status=200)

    except json.JSONDecodeError:
        logger.error(f"Invalid JSON data provided by user {request.user.username}")
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to edit song for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to edit song. Please try again."}, status=500)
