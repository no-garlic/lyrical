from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
from ..services.utils.summarise import ChatSummarisationService
import json
import logging
from ..logging_config import get_logger


logger = get_logger('apis')


@login_required
def api_summarise_chat_history(request):
    """
    Summarise chat history for a song and message type.
    
    This endpoint will:
    1. Check if summarisation is needed based on token count
    2. Generate a summary using the user's summarisation LLM model
    3. Deactivate original messages and insert summary
    4. Update the song's needs_summarisation flag
    
    Args:
        request: The HTTP request object containing POST data with song_id and message_type
    
    Returns:
        JsonResponse: Success/error response with summarisation details
    """
    # Validate request method
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        # Parse the request body
        request_data = json.loads(request.body.decode('utf-8'))

        logger.debug(f"Chat summarisation request data: {json.dumps(request_data, indent=2)}")

        song_id = request_data.get("song_id")
        message_type = request_data.get("message_type")
        force_summarise = request_data.get("force_summarise", False)

        # Validate required parameters
        if not song_id:
            return JsonResponse({"error": "Song ID must be provided"}, status=400)
        
        if not message_type:
            return JsonResponse({"error": "Message type must be provided"}, status=400)
        
        if message_type not in ['style', 'lyrics']:
            return JsonResponse({"error": "Message type must be 'style' or 'lyrics'"}, status=400)

        # Verify song exists and user has permission
        try:
            song = models.Song.objects.get(id=song_id, user=request.user)
        except models.Song.DoesNotExist:
            return JsonResponse({
                "error": f"Song with ID {song_id} not found or you don't have permission to access it"
            }, status=404)

        # Check if summarisation is actually needed (unless forced)
        if not force_summarise:
            needs_summary = ChatSummarisationService.check_needs_summarisation(
                song_id, message_type, request.user
            )
            if not needs_summary:
                return JsonResponse({
                    "status": "not_needed",
                    "message": f"Conversation for {message_type} does not need summarisation yet",
                    "song_id": song_id,
                    "message_type": message_type
                }, status=200)

        # Get conversation stats before summarisation
        from ..services.message_history_service import MessageHistoryService
        stats_before = MessageHistoryService.get_conversation_stats(song_id, message_type, request.user)

        logger.info(f"Starting chat summarisation for user {request.user.username}, song {song_id}, type '{message_type}'")
        logger.debug(f"Conversation stats before summarisation: {stats_before}")

        # Perform the summarisation
        success = ChatSummarisationService.summarise_conversation(
            song_id, message_type, request.user
        )

        if not success:
            logger.error(f"Summarisation failed for user {request.user.username}, song {song_id}, type '{message_type}'")
            return JsonResponse({
                "error": "Failed to summarise conversation. Please try again later."
            }, status=500)

        # Get conversation stats after summarisation
        stats_after = MessageHistoryService.get_conversation_stats(song_id, message_type, request.user)

        logger.info(f"Chat summarisation completed for user {request.user.username}, song {song_id}, type '{message_type}'")
        logger.debug(f"Conversation stats after summarisation: {stats_after}")

        # Check if song still needs summarisation (for other conversation types)
        final_needs_summary = ChatSummarisationService.update_song_summarisation_flag(
            song_id, request.user
        )

        response_data = {
            "status": "success",
            "message": f"Successfully summarised {message_type} conversation",
            "song_id": song_id,
            "message_type": message_type,
            "stats_before": stats_before,
            "stats_after": stats_after,
            "messages_summarised": stats_before.get('active_total_messages', 0),
            "song_still_needs_summarisation": song.needs_summarisation
        }

        logger.info(f"Summarisation response: {json.dumps(response_data, indent=2)}")
        return JsonResponse(response_data, status=200)

    except json.JSONDecodeError:
        logger.error(f"Invalid JSON in summarisation request from user {request.user.username}")
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    
    except Exception as e:
        logger.error(f"Unexpected error during chat summarisation for user {request.user.username}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JsonResponse({
            "error": "An unexpected error occurred during summarisation. Please try again later."
        }, status=500)


@login_required
def api_check_summarisation_status(request):
    """
    Check if any conversations for a song need summarisation.
    
    Args:
        request: The HTTP request object with song_id parameter
    
    Returns:
        JsonResponse: Status information about summarisation needs
    """
    if request.method != 'GET':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        song_id = request.GET.get("song_id")
        
        if not song_id:
            return JsonResponse({"error": "Song ID must be provided"}, status=400)

        # Verify song exists and user has permission
        try:
            song = models.Song.objects.get(id=song_id, user=request.user)
        except models.Song.DoesNotExist:
            return JsonResponse({
                "error": f"Song with ID {song_id} not found or you don't have permission to access it"
            }, status=404)

        # Check summarisation status for both conversation types
        style_needs_summary = ChatSummarisationService.check_needs_summarisation(
            song_id, 'style', request.user
        )
        lyrics_needs_summary = ChatSummarisationService.check_needs_summarisation(
            song_id, 'lyrics', request.user
        )

        # Get conversation stats
        from ..services.message_history_service import MessageHistoryService
        style_stats = MessageHistoryService.get_conversation_stats(song_id, 'style', request.user)
        lyrics_stats = MessageHistoryService.get_conversation_stats(song_id, 'lyrics', request.user)

        response_data = {
            "song_id": song_id,
            "song_needs_summarisation": song.needs_summarisation,
            "style": {
                "needs_summarisation": style_needs_summary,
                "stats": style_stats
            },
            "lyrics": {
                "needs_summarisation": lyrics_needs_summary,
                "stats": lyrics_stats
            },
            "any_needs_summarisation": style_needs_summary or lyrics_needs_summary
        }

        return JsonResponse(response_data, status=200)

    except Exception as e:
        logger.error(f"Error checking summarisation status for user {request.user.username}: {str(e)}")
        return JsonResponse({
            "error": "Failed to check summarisation status. Please try again later."
        }, status=500)