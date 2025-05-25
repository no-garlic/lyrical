import json
import logging
import os
from django.http import JsonResponse
from django.template.loader import render_to_string, TemplateDoesNotExist
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods


logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def api_render_component(request, component_name):
    """
    render a cotton component template with provided context data
    
    args:
        request: django http request object
        component_name: name of the component template to render
        
    returns:
        jsonresponse: rendered html on success or error message on failure
    """
    try:
        # validate component name format and security
        if not component_name:
            logger.warning("component render failed: missing component name")
            return JsonResponse({
                'success': False,
                'error': 'component name is required'
            }, status=400)
        
        # validate component name contains only safe characters
        if not component_name.replace('_', '').replace('-', '').isalnum():
            logger.warning(f"component render failed: invalid component name '{component_name}'")
            return JsonResponse({
                'success': False,
                'error': 'component name can only contain letters, numbers, hyphens, and underscores'
            }, status=400)
        
        # prevent directory traversal attacks
        if '..' in component_name or '/' in component_name or '\\' in component_name:
            logger.warning(f"component render failed: suspicious component name '{component_name}'")
            return JsonResponse({
                'success': False,
                'error': 'invalid component name format'
            }, status=400)
        
        # validate request has body content
        if not hasattr(request, 'body') or not request.body:
            logger.warning(f"component render failed for '{component_name}': missing request body")
            return JsonResponse({
                'success': False,
                'error': 'request body with context data is required'
            }, status=400)
        
        # parse json context data
        try:
            context_data = json.loads(request.body)
        except json.JSONDecodeError as e:
            logger.warning(f"component render failed for '{component_name}': invalid json - {str(e)}")
            return JsonResponse({
                'success': False,
                'error': 'request body must contain valid json data'
            }, status=400)
        
        # validate context data is a dictionary
        if not isinstance(context_data, dict):
            logger.warning(f"component render failed for '{component_name}': context data is not an object")
            return JsonResponse({
                'success': False,
                'error': 'context data must be a json object'
            }, status=400)
        
        # attempt to render the component template
        try:
            template_path = f'cotton/{component_name}.html'
            rendered_html = render_to_string(template_path, context_data, request=request)
            
            logger.info(f"component '{component_name}' rendered successfully")
            return JsonResponse({
                'success': True,
                'html': rendered_html
            })
            
        except TemplateDoesNotExist:
            logger.warning(f"component render failed: template '{template_path}' does not exist")
            return JsonResponse({
                'success': False,
                'error': f'component template "{component_name}" not found'
            }, status=404)
        
        except Exception as template_error:
            logger.error(f"component render failed for '{component_name}': template error - {str(template_error)}")
            return JsonResponse({
                'success': False,
                'error': 'failed to render component template'
            }, status=500)
    
    except Exception as e:
        logger.error(f"unexpected error rendering component '{component_name}': {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'an unexpected error occurred while rendering the component'
        }, status=500)
