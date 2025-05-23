from django.http import JsonResponse, StreamingHttpResponse, QueryDict
from django.contrib.auth.decorators import login_required
from ..services.llm_service import llm_call
from ..services.utils.prompts import get_system_prompt, get_user_prompt
from ..services.utils.messages import MessageBuilder
from .. import models
import json


@login_required
def api_song_add(request):

    if request.method != 'POST':
        return JsonResponse({"status": "failure", "error": "Invalid request method"}, status=405)

    # Parse the request body for PUT requests
    edit_data = json.loads(request.body.decode('utf-8'))
    song_name = edit_data.get("song_name")

    if not song_name:
        print("No song name provided")
        return JsonResponse({"status": "failure", "error": "Song name not provided"}, status=400)

    if not request.user or not request.user.is_authenticated:
        return JsonResponse({"status": "failure", "error": "User not authenticated"}, status=401)

    if len(models.Song.objects.filter(name=song_name)) > 0:
        print(f"Song with name '{song_name}' already exists.")
        return JsonResponse({"status": "failure", "error": "Song already exists"}, status=400)

    print(f"Creating a new song with name '{song_name}'")

    # Create a new song object
    song = models.Song(name=song_name, user=request.user)
    song.save()

    print(f"Song with name '{song_name}' created successfully.")    
    return JsonResponse({"status": "success"}, status=200)
