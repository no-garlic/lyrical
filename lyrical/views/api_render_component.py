from django.http import JsonResponse
from django.template.loader import render_to_string
import json


def api_render_component(request, component_name):
    if request.method == 'POST':
        context = json.loads(request.body)
        html = render_to_string(f'cotton/{component_name}.html', context, request=request)
        return JsonResponse({'html': html})
    
    return JsonResponse({'error': 'Invalid request method'})
