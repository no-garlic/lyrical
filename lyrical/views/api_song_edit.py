from django.http import JsonResponse, StreamingHttpResponse, QueryDict
from django.contrib.auth.decorators import login_required
from ..services.llm_service import llm_call
from ..services.utils.prompts import get_system_prompt, get_user_prompt
from ..services.utils.messages import MessageBuilder
from .. import models
import json


@login_required
def api_song_edit(request):

    if request.method != 'PUT':
        return JsonResponse({"status": "failure", "error": "Invalid request method"}, status=405)

    # Parse the request body for PUT requests
    edit_data = json.loads(request.body.decode('utf-8'))

    song_id = edit_data.get("song_id")
    song_name = edit_data.get("song_name")
    song_stage = edit_data.get("song_stage")

    if not song_id:
        print("No song ID provided")
        return JsonResponse({"status": "failure", "error": "Song ID not provided"}, status=400)

    # Must provide either song_name or song_stage (or both)
    if not song_name and not song_stage:
        print("No song name or stage provided")
        return JsonResponse({"status": "failure", "error": "Song name or stage must be provided"}, status=400)

    if not request.user or not request.user.is_authenticated:
        return JsonResponse({"status": "failure", "error": "User not authenticated"}, status=401)
    
    try:
        song = models.Song.objects.get(id=song_id, user=request.user)
    except models.Song.DoesNotExist:
        print(f"Song with ID {song_id} not found for user {request.user.username}.")
        return JsonResponse({"status": "failure", "error": "Song not found"}, status=404)

    # Update fields based on what was provided
    updates = []
    if song_name:
        song.name = song_name
        updates.append(f"name to '{song_name}'")
    
    if song_stage:
        song.stage = song_stage
        updates.append(f"stage to '{song_stage}'")
    
    song.save()
    print(f"Song with ID {song_id} updated: {', '.join(updates)}.")

    return JsonResponse({"status": "success", "song_id": song.id}, status=200)
