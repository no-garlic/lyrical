from django.http import JsonResponse, StreamingHttpResponse
from ..services.llm_service import llm_call
from ..services.utils.prompts import get_system_prompt, get_user_prompt
from ..services.utils.messages import MessageBuilder
from .. import models


def generate_song_names(request):
    prompt_name = request.GET.get("prompt")

    count = request.GET.get("count", 1)
    min_words = request.GET.get("min_words", 1)
    max_words = request.GET.get("max_words", 5)
    include_themes = "[" + request.GET.get("include_themes", None) + "]"
    exclude_themes = "[" + request.GET.get("exclude_themes", None) + "]"
    exclude_words = "[" + request.GET.get("exclude_words", None) + "]"

    # Get the list of song names to exclude from the database
    qs_excluded = models.ExcludeSongName.objects.values('title')
    qs_previous = models.Song.objects.values('title')
    combined_titles_qs = qs_excluded.union(qs_previous)
    exclude_song_names = [item['title'] for item in combined_titles_qs]
    
    if not prompt_name:
        return JsonResponse({"error": "Prompt name not provided"}, status=400)

    current_user = request.user
    if not current_user.is_authenticated:
        try:
            current_user = models.User.objects.get(username="mpetrou") # Use a specific user for unauthenticated
        except models.User.DoesNotExist:
            return JsonResponse({"error": "Default user for unauthenticated request not found."}, status=500)

    try:
        llm_model_name = "gemini-2.0-flash"
        llm_model = models.LLM.objects.get(internal_name=llm_model_name)
    except models.LLM.DoesNotExist:
        print(f"Error: LLM model '{llm_model_name}' not found in database.")
        return JsonResponse({"error": "LLM model configuration not found."}, status=500)

    # Get the prompts from the YAML file
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
        exclude_song_names=exclude_song_names)

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
