import faiss
import numpy as np
from django.core.management.base import BaseCommand
from sentence_transformers import SentenceTransformer
from quizly.models import Quiz, Question


class Command(BaseCommand):
    """
    Command to build a FAISS index for quiz embeddings.
    This command uses the SentenceTransformer model to encode quiz names and descriptions
    into embeddings, which are then indexed using FAISS for efficient similarity search.
    """
    help = "Builds a FAISS index for quiz embeddings"

    def handle(self, *args, **kwargs):
        """
        Handle the command to build the FAISS index.
        This method loads all quizzes from the database, encodes their names and descriptions
        into embeddings using the SentenceTransformer model, and creates a FAISS index
        for these embeddings. The index is then saved to disk.
        """
        # Using a fast, small, simple model to make the application more lightweight
        # and to avoid the need for GPU support, as this is a capstone project and
        # I want to keep it simple and fast. For a production application, I would 
        # use a larger model and it would produce better search results.
        model = SentenceTransformer('all-MiniLM-L6-v2')

        # Load all quizzes from the database
        quizzes = Quiz.objects.all()
        
        # Just use the quiz name and description for the index, not the question text
        quiz_texts = [f"{q.name} {q.description}" for q in quizzes]

        # Encode the texts into embeddings
        embeddings = model.encode(quiz_texts, convert_to_numpy=True).astype(np.float32)

        # Normalize the embeddings for cosine similarity
        faiss.normalize_L2(embeddings)

        # Create a FAISS index for the embeddings
        index = faiss.IndexFlatIP(embeddings.shape[1])
        index.add(embeddings)

        # Save the index to disk
        faiss.write_index(index, "faiss_index.idx")
        print("FAISS index built and saved to disk.")
