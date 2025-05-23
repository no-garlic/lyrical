from django.http import JsonResponse, StreamingHttpResponse
from ..services.llm_service import llm_call
from ..services.utils.prompts import get_system_prompt, get_user_prompt
from ..services.utils.messages import MessageBuilder
from .. import models


def api_gen_song(request):
    prompt_name = request.GET.get("prompt")

    song_name = request.GET.get("song_name", None)
    song_theme = request.GET.get("song_theme", None)
    verse_count = request.GET.get("verse_count", 1)
    verse_lines = request.GET.get("verse_lines", 4)
    pre_chorus_lines = request.GET.get("pre_chorus_lines", 4)
    chorus_lines = request.GET.get("chorus_lines", 4)
    bridge_lines = request.GET.get("bridge_lines", 4)
    outro_lines = request.GET.get("outro_lines", 4)
    vocalisation_lines = request.GET.get("vocalisation_lines", 0)
    vocalisation_terms = request.GET.get("vocalisation_terms", None)
    song_vocalisation_level = request.GET.get("song_vocalisation_level", 0)
    syllables = request.GET.get("syllables", 8)

    if not prompt_name:
        return JsonResponse({"error": "Prompt name not provided"}, status=400)

    current_user = request.user
    if not current_user.is_authenticated:
        current_user = models.User.objects.get(username="mpetrou")

    llm_model = current_user.llm_model

    song_vocalisation_level_names = [None, "low", "medium", "high"]

    # Get the prompts from the YAML file
    system_message = get_system_prompt(prompt_name, llm_model)
    user_message = get_user_prompt(
        prompt_name=prompt_name, 
        llm=llm_model,
        song_name=song_name,
        song_theme=song_theme,
        verse_count=int(verse_count),
        verse_lines=int(verse_lines),
        pre_chorus_lines=int(pre_chorus_lines),
        chorus_lines=int(chorus_lines),
        bridge_lines=int(bridge_lines),
        outro_lines=int(outro_lines),
        vocalisation_lines=int(vocalisation_lines),
        vocalisation_terms=vocalisation_terms,
        song_vocalisation_level=song_vocalisation_level_names[int(song_vocalisation_level)],
        syllables=int(syllables)
    )

    if user_message is None:
        print(f"Error: Prompt '{prompt_name}' not found in prompts.yaml")
        return JsonResponse({"error": f"Prompt '{prompt_name}' not found"}, status=404)

    # Create a message builder for the message history
    prompt_messages = MessageBuilder()
    prompt_messages.add_system(system_message)
    prompt_messages.add_user(user_message) 

    print(prompt_messages)

    # Call the LLM with the user message and stream the response
    # llm_call yields JSON strings for each chunk (e.g., for structured streaming):
    response_stream_generator = llm_call(prompt_messages=prompt_messages, user=current_user, llm=llm_model)
    return StreamingHttpResponse(response_stream_generator, content_type="application/x-ndjson") # Changed to application/x-ndjson
    #return JsonResponse({"name": "All Good"}, status=200)
