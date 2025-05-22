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

    if not song_id:
        print("No song ID provided")
        return JsonResponse({"status": "failure", "error": "Song ID not provided"}, status=400)

    if not song_name:
        print("No song name provided")
        return JsonResponse({"status": "failure", "error": "Song name not provided"}, status=400)

    if not request.user or not request.user.is_authenticated:
        return JsonResponse({"status": "failure", "error": "User not authenticated"}, status=401)
    
    print(f"Renaming song with ID: {song_id} to '{song_name}'")

    song = models.Song.objects.get(id=song_id)
    if not song:
        print(f"Song with ID {song_id} not found.")
        return JsonResponse({"status": "failure", "error": "Song not found"}, status=404)

    song.name = song_name
    song.save()
    print(f"Song with ID {song_id} renamed to '{song_name}'.")

    return JsonResponse({"status": "success"}, status=200)
