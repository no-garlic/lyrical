import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import threading

class QuizSemanticSearchService:
    _model = None
    _index = None
    _lock = threading.Lock()
    _loading_model = threading.Event()
    _loading_index = threading.Event()


    @classmethod
    def preload_resources(cls):
        """
        Preload the model and index in the background.
        This is called from AppConfig.ready().
        """
        # Set the loading event flags
        cls._loading_model.set()
        cls._loading_index.set()
        
        # Load the SentenceTransformer model in the background
        try:
            cls._model = SentenceTransformer('all-MiniLM-L6-v2')
            print("SentenceTransformer model loaded successfully.")
        except Exception as e:
            print(f"Error loading SentenceTransformer model: {e}")
        finally:
            # Clear the loading event flag
            cls._loading_model.clear()
        
        # Load the FAISS index file from disk
        try:
            cls._index = faiss.read_index("faiss_index.idx")
            print("FAISS index loaded successfully.")
        except Exception as e:
            print(f"Error loading FAISS index: {e}")
        finally:
            # Clear the loading event flag
            cls._loading_index.clear()


    @classmethod
    def get_model(cls):
        """
        Get the SentenceTransformer model.
        If the model is currently loading in the background, wait for it to complete.
        If the model hasn't started loading yet, load it synchronously.
        """
        # If the model is currently being loaded in the background, wait for it
        # to finish loading
        if cls._loading_model.is_set():
            print("Waiting for model to finish loading in the background...")
            cls._loading_model.wait()
        
        # If the model is still None after waiting, it means I need to load it
        with cls._lock:
            if cls._model is None:
                print("Model not preloaded. Loading now...")
                cls._model = SentenceTransformer('all-MiniLM-L6-v2')
            
        return cls._model


    @classmethod
    def get_index(cls):
        """
        Get the FAISS index.
        If the index is currently loading in the background, wait for it to complete.
        If the index hasn't started loading yet, load it synchronously.
        """
        # If the index is currently being loaded in the background, wait for it
        # to complete
        if cls._loading_index.is_set():
            print("Waiting for index to finish loading in the background...")
            cls._loading_index.wait()
        
        # If the index is still None after waiting, it means I need to load it
        with cls._lock:
            if cls._index is None:
                print("Index not preloaded. Loading now...")
                cls._index = faiss.read_index("faiss_index.idx")
            
        return cls._index


    @classmethod
    def add(cls, quiz):
        """
        Add a new quiz to the FAISS index.
        :param quiz: The quiz object to add.
        """
        model = cls.get_model()
        index = cls.get_index()

        # Encode the quiz name and description into an embedding
        text = f"{quiz.name} {quiz.description}"
        embedding = model.encode([text], convert_to_numpy=True).astype(np.float32)
        faiss.normalize_L2(embedding)

        # Add the embedding to the FAISS index
        index.add(embedding)

        # Save the updated index to disk
        faiss.write_index(index, "faiss_index.idx")


    @classmethod
    def search(cls, query, quizzes, top_k=10, min_similarity=0.3):
        """
        Perform a semantic search on quizzes using FAISS and SentenceTransformer.
        :param query: The search query.
        :param quizzes: List of quizzes to search from.
        :param top_k: Number of top results to return.
        :param min_similarity: Minimum cosine similarity score to consider a quiz as a match.
        :return: List of quizzes that match the query.
        """
        model = cls.get_model()
        index = cls.get_index()

        # Encode the query into an embedding
        query_embedding = model.encode([query], convert_to_numpy=True).astype(np.float32)
        faiss.normalize_L2(query_embedding)

        # Perform the search on the FAISS index
        similarities, indices = index.search(query_embedding, k=top_k)

        # Filter results based on the minimum similarity threshold
        results = []
        for i, sim in zip(indices[0], similarities[0]):
            if i < len(quizzes) and sim >= min_similarity:
                results.append((sim, quizzes[i]))

        # Sort results by similarity score in descending order
        results.sort(key=lambda x: x[0], reverse=True)

        # Return only the quizzes, sorted by similarity
        return [quiz for sim, quiz in results]
