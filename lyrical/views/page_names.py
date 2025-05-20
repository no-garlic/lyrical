from django.shortcuts import render
from pathlib import Path
from .. import models


def page_names(request):
    filename = Path(__file__).name.split(".")[0].replace("page_", "")
    html_file = f"lyrical/{filename}.html"
    print(html_file)

    return render(request, html_file)
