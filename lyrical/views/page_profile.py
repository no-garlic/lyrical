from django.shortcuts import render
from pathlib import Path
from .. import models


def page_profile(request):
    page_name = Path(__file__).name.split(".")[0].replace("page_", "")
    html_file = f"lyrical/{page_name}.html"
    print(html_file)

    return render(request, html_file, {
        "active_page": page_name        
    })