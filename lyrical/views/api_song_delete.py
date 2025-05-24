from django.http import JsonResponse, StreamingHttpResponse, QueryDict
from django.contrib.auth.decorators import login_required
from ..services.llm_service import llm_call
from ..services.utils.prompts import get_system_prompt, get_user_prompt
from ..services.utils.messages import MessageBuilder
from .. import models
import json


@login_required
def api_song_delete(request):

    if request.method != 'DELETE':
        return JsonResponse({"status": "failure", "error": "Invalid request method"}, status=405)

    # Parse the request body for DELETE requests
    delete_data = json.loads(request.body.decode('utf-8'))
    song_id = delete_data.get("song_id")

    if not song_id:
        print("No song ID provided")
        return JsonResponse({"status": "failure", "error": "Song ID not provided"}, status=400)

    if not request.user or not request.user.is_authenticated:
        return JsonResponse({"status": "failure", "error": "User not authenticated"}, status=401)
    
    print(f"Deleting song with ID: {song_id}")

    result = models.Song.objects.get(id=song_id).delete()
    if result[0] == 0:
        print(f"Song with ID {song_id} not found or already deleted.")
        return JsonResponse({"status": "failure", "error": "Song not found or already deleted"}, status=404)

    return JsonResponse({"status": "success", "song_id": song_id}, status=200)
