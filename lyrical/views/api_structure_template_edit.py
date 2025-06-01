from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .. import models
import json
import logging
from ..logging_config import get_logger


logger = get_logger('apis')


@login_required
def api_structure_template_edit(request):
    """
    Edit a template by ID.
    
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

        logger.debug(f"Structure Template edit request data: {json.dumps(edit_data, indent=2)}")

        template_id = edit_data.get("template_id")
        template_name = edit_data.get("template_name")

        introLines = edit_data.get("intro_lines")
        outroLines = edit_data.get("outro_lines")
        verseCount = edit_data.get("verse_count")
        verseLines = edit_data.get("verse_lines")
        preChorusLines = edit_data.get("pre_chorus_lines")
        chorusLines = edit_data.get("chorus_lines")
        bridgeLines = edit_data.get("bridge_lines")
        syllables = edit_data.get("average_syllables")
        vocalisationLevel = edit_data.get("vocalisation_level")
        vocalisationLines = edit_data.get("vocalisation_lines")
        vocalisationTerms = edit_data.get("vocalisation_terms")
        customRequest = edit_data.get("custom_request")
        songStructure = edit_data.get("structure")

        # validate template ID is provided
        if not template_id:
            return JsonResponse({"error": "Template ID must be provided"}, status=400)

        # get the template object and verify ownership
        try:
            template = models.SongStructureTemplate.objects.get(id=template_id, user=request.user)
        except models.SongStructureTemplate.DoesNotExist:
            return JsonResponse({"error": f"Template with ID {template_id} not found or you don't have permission to edit it"}, status=404)

        # check if template name already exists for this user (if updating name)
        if template_name and template_name.strip() != template.name:
            if models.SongStructureTemplate.objects.filter(name=template_name.strip(), user=request.user).exclude(id=template_id).exists():
                return JsonResponse({"error": f"A template with the name '{template_name}' already exists"}, status=400)

        # update fields based on what was provided
        updates = []
        if template_name:
            old_name = template.name
            template.name = template_name.strip()
            updates.append(f"name from '{old_name}' to '{template.name}'")
        
        if introLines is not None:
            old_intro = template.intro_lines
            template.intro_lines = introLines
            updates.append(f"intro lines from '{old_intro}' to '{introLines}'")

        if outroLines is not None:
            old_outro = template.outro_lines
            template.outro_lines = outroLines
            updates.append(f"outro lines from '{old_outro}' to '{outroLines}'")

        if verseCount is not None:
            old_verse_count = template.verse_count
            template.verse_count = verseCount
            updates.append(f"verse count from {old_verse_count} to {verseCount}")

        if verseLines is not None:
            old_verse_lines = template.verse_lines
            template.verse_lines = verseLines
            updates.append(f"verse lines from '{old_verse_lines}' to '{verseLines}'")

        if preChorusLines is not None:          
            old_pre_chorus = template.pre_chorus_lines
            template.pre_chorus_lines = preChorusLines
            updates.append(f"pre-chorus lines from '{old_pre_chorus}' to '{preChorusLines}'")

        if chorusLines is not None:
            old_chorus = template.chorus_lines
            template.chorus_lines = chorusLines
            updates.append(f"chorus lines from '{old_chorus}' to '{chorusLines}'")
            
        if bridgeLines is not None:
            old_bridge = template.bridge_lines
            template.bridge_lines = bridgeLines
            updates.append(f"bridge lines from '{old_bridge}' to '{bridgeLines}'")

        if syllables is not None:
            old_syllables = template.average_syllables
            template.average_syllables = syllables
            updates.append(f"average syllables from {old_syllables} to {syllables}")

        if vocalisationLevel is not None:       
            old_vocalisation_level = template.vocalisation_level
            template.vocalisation_level = vocalisationLevel
            updates.append(f"vocalisation level from {old_vocalisation_level} to {vocalisationLevel}")

        if vocalisationLines is not None:
            old_vocalisation_lines = template.vocalisation_lines
            template.vocalisation_lines = vocalisationLines
            updates.append(f"vocalisation lines from '{old_vocalisation_lines}' to '{vocalisationLines}'")

        if vocalisationTerms is not None:
            old_vocalisation_terms = template.vocalisation_terms
            template.vocalisation_terms = vocalisationTerms
            updates.append(f"vocalisation terms from '{old_vocalisation_terms}' to '{vocalisationTerms}'")

        if customRequest is not None:
            old_custom_request = template.custom_request
            template.custom_request = customRequest
            updates.append(f"custom request from '{old_custom_request}' to '{customRequest}'")

        if songStructure is not None:
            old_structure = template.structure
            template.structure = songStructure
            updates.append(f"song structure from '{old_structure}' to '{songStructure}'")

        template.save()

        logger.info(f"User {request.user.username} updated template {template_id}:\n  {', \n  '.join(updates)}")
        return JsonResponse({"status": "success", "song_id": template.id}, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data provided"}, status=400)
    except Exception as e:
        logger.error(f"Failed to edit template for user {request.user.username}: {str(e)}")
        return JsonResponse({"error": "Failed to edit template. Please try again."}, status=500)
