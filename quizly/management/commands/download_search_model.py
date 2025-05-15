from django.core.management.base import BaseCommand
from sentence_transformers import SentenceTransformer
from huggingface_hub import constants as hf_constants
import os


class Command(BaseCommand):
    """
    Command to download the model that is used to create the embeddings for
    the semantic search.
    """
    help = "Download the all-MiniLM-L6-v2 model"

    def handle(self, *args, **kwargs):
        """
        Handle the command to download the model.
        """
        # Define the model name we want to download
        model_name = 'all-MiniLM-L6-v2'
        
        # Get the huggingface cache directory
        hf_cache_home = hf_constants.HF_HUB_CACHE
        
        # Check if model is already downloaded by looking at the cache directory
        cache_dir = os.path.join(hf_cache_home, 
                                 'models--sentence-transformers--' 
                                 + model_name.replace('/', '--'))
        
        # Check if the model file exists in the cache directory
        if os.path.exists(cache_dir) and any(os.scandir(cache_dir)):

            # Model is already downloaded
            self.stdout.write(f"Model '{model_name}' is already downloaded")
        else:
            # Download the model
            self.stdout.write(f"Downloading model '{model_name}'...")
            model = SentenceTransformer(model_name)
            self.stdout.write(self.style.SUCCESS(f"Model '{model_name}' is now ready to use"))
