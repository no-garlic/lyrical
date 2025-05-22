from django.shortcuts import render
from pathlib import Path
from .. import models


def page_prepare(request):
    page_name = Path(__file__).name.split(".")[0].replace("page_", "")
    html_file = f"lyrical/{page_name}.html"
    print(html_file)

    return render(request, html_file, {
        "active_page": "edit",
        "navigation": [
            {"name": "SONG", "url": "song", "active": True, "selected": False, "enabled": True},
            {"name": "PREPARE", "url": "prepare", "active": True, "selected": True, "enabled": True},
            {"name": "LYRICS", "url": "lyrics", "active": False, "selected": False, "enabled": True},
            {"name": "STRUCTURE", "url": "structure", "active": False, "selected": False, "enabled": False},
        ],
    })