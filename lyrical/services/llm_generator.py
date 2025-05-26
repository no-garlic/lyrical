"""
Base class for LLM generation API views.

This provides a standardized pattern for endpoints that:
1. Extract and validate parameters
2. Query database if needed
3. Build system and user prompts
4. Call LLM service
5. Return streaming response
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from django.http import JsonResponse, StreamingHttpResponse
from .llm_service import llm_call
from .utils.prompts import get_system_prompt, get_user_prompt
from .utils.messages import MessageBuilder
from .. import models


logger = logging.getLogger(__name__)


class LLMGenerator(ABC):
    """
    Base class for LLM generation endpoints.
    
    Subclasses should implement the abstract methods to customize:
    - Parameter extraction and validation
    - Database queries
    - Prompt building
    """
    

    def __init__(self, request):
        """
        Initialize the generator with the Django request.
        
        Args:
            request: Django HTTP request object
        """
        self.request = request
        self.user = None
        self.llm_model = None
        self.extracted_params = {}
        

    def generate(self) -> StreamingHttpResponse:
        """
        Main method that orchestrates the generation process.
        
        Returns:
            StreamingHttpResponse: LLM generated content or JSON error response
        """
        try:
            # step 1: extract and validate parameters
            validation_result = self._extract_and_validate_parameters()
            if validation_result:
                return validation_result
            
            # step 2: authenticate user
            auth_result = self._authenticate_user()
            if auth_result:
                return auth_result
            
            # step 3: get llm model configuration
            model_result = self._get_llm_model()
            if model_result:
                return model_result
            
            # step 4: query database if needed
            db_result = self._query_database()
            if db_result:
                return db_result
            
            # step 5: build prompts
            prompt_result = self._build_prompts()
            if prompt_result:
                return prompt_result
            
            # step 6: call llm and return streaming response
            return self._call_llm_and_stream()
            
        except Exception as e:
            logger.error(f"unexpected error in {self.__class__.__name__}: {str(e)}")
            return JsonResponse({
                "success": False,
                "error": "an unexpected error occurred during generation"
            }, status=500)
    

    def _extract_and_validate_parameters(self) -> Optional[JsonResponse]:
        """
        Extract and validate request parameters.
        
        Returns:
            JsonResponse if validation fails, None if successful
        """
        try:
            # call subclass implementation
            self.extracted_params = self.extract_parameters()
            
            # call subclass validation
            validation_errors = self.validate_parameters(self.extracted_params)
            
            if validation_errors:
                logger.warning(f"parameter validation failed: {validation_errors}")
                return JsonResponse({
                    "success": False,
                    "error": validation_errors
                }, status=400)
            
            return None
            
        except Exception as e:
            logger.error(f"error extracting parameters: {str(e)}")
            return JsonResponse({
                "success": False,
                "error": "failed to process request parameters"
            }, status=400)
    
    
    def _authenticate_user(self) -> Optional[JsonResponse]:
        """
        Authenticate the user with fallback for development.
        
        Returns:
            JsonResponse if authentication fails, None if successful
        """
        try:
            self.user = self.request.user
            
            if not self.user.is_authenticated:
                logger.warning("unauthenticated generation attempt")
                return JsonResponse({
                    "success": False,
                    "error": "authentication required"
                }, status=401)
            
            return None
            
        except Exception as e:
            logger.error(f"authentication error: {str(e)}")
            return JsonResponse({
                "success": False,
                "error": "authentication failed"
            }, status=500)
    

    def _get_llm_model(self) -> Optional[JsonResponse]:
        """
        Get the LLM model configuration.
        
        Returns:
            JsonResponse if model lookup fails, None if successful
        """
        try:
            self.llm_model = self.user.llm_model
            model_name = self.get_llm_model_name()
            logger.debug(f"using llm model: {model_name}")
            return None
            
        except models.LLM.DoesNotExist:
            logger.error(f"llm model '{model_name}' not found in database")
            return JsonResponse({
                "success": False,
                "error": "llm model configuration not found, please contact support"
            }, status=500)
        except Exception as e:
            logger.error(f"error getting llm model: {str(e)}")
            return JsonResponse({
                "success": False,
                "error": "failed to load llm model configuration"
            }, status=500)
    

    def _query_database(self) -> Optional[JsonResponse]:
        """
        Query database for additional data needed for prompts.
        
        Returns:
            JsonResponse if database query fails, None if successful
        """
        try:
            # call subclass implementation
            self.extracted_params.update(self.query_database_data())
            return None
            
        except Exception as e:
            logger.error(f"database query error: {str(e)}")
            return JsonResponse({
                "success": False,
                "error": "failed to retrieve required data"
            }, status=500)
    
    
    def _build_prompts(self) -> Optional[JsonResponse]:
        """
        Build system and user prompts.
        
        Returns:
            JsonResponse if prompt building fails, None if successful
        """
        try:
            prompt_name = self.get_prompt_name()
            
            # get system prompt
            system_message = get_system_prompt(prompt_name, self.llm_model)
            if system_message is None:
                logger.error(f"system prompt for '{prompt_name}' not found")
                return JsonResponse({
                    "success": False,
                    "error": "system prompt configuration not found"
                }, status=500)
            
            # get user prompt with custom parameters
            user_prompt_params = self.build_user_prompt_params()
            user_message = get_user_prompt(
                prompt_name=prompt_name,
                llm=self.llm_model,
                **user_prompt_params
            )
            
            if user_message is None:
                logger.error(f"prompt '{prompt_name}' not found in configuration")
                return JsonResponse({
                    "success": False,
                    "error": f"prompt configuration '{prompt_name}' not found"
                }, status=404)
            
            # build message chain
            self.prompt_messages = MessageBuilder()
            self.prompt_messages.add_system(system_message)
            self.prompt_messages.add_user(user_message)

            print(self.prompt_messages)
            
            # log generation start
            logger.info(f"starting generation for user '{self.user.username}' with prompt '{prompt_name}'")
            self.log_generation_params()
            
            return None
            
        except Exception as e:
            logger.error(f"error building prompts: {str(e)}")
            return JsonResponse({
                "success": False,
                "error": "failed to build prompts for generation"
            }, status=500)
    

    def _call_llm_and_stream(self) -> StreamingHttpResponse:
        """
        Call LLM service and return streaming response.
        
        Returns:
            StreamingHttpResponse: Streaming LLM response
        """
        try:
            response_stream_generator = llm_call(
                prompt_messages=self.prompt_messages,
                user=self.user,
                llm=self.llm_model,
                generator=self
            )
            
            logger.info(f"generation stream started for user '{self.user.username}'")
            return StreamingHttpResponse(
                response_stream_generator,
                content_type="application/x-ndjson"
            )
            
        except Exception as e:
            logger.error(f"llm service error: {str(e)}")
            return JsonResponse({
                "success": False,
                "error": "failed to generate content, please try again later"
            }, status=500)
    

    # abstract methods that subclasses must implement
    
    @abstractmethod
    def extract_parameters(self) -> Dict[str, Any]:
        """
        Extract parameters from the request.
        
        Returns:
            Dict containing extracted parameters
        """
        pass
    
    @abstractmethod
    def validate_parameters(self, params: Dict[str, Any]) -> Optional[str]:
        """
        Validate extracted parameters.
        
        Args:
            params: Dictionary of extracted parameters
            
        Returns:
            Error message string if validation fails, None if successful
        """
        pass
    
    @abstractmethod
    def get_prompt_name(self) -> str:
        """
        Get the prompt name to use for generation.
        
        Returns:
            String prompt name
        """
        pass
    
    @abstractmethod
    def build_user_prompt_params(self) -> Dict[str, Any]:
        """
        Build parameters for the user prompt.
        
        Returns:
            Dict of parameters to pass to get_user_prompt
        """
        pass
    
    # optional methods that subclasses can override
    
    def get_llm_model_name(self) -> str:
        """
        Get the LLM model name to use.
        
        Returns:
            String model name (default: gemini-2.0-flash)
        """
        return "gemini-2.0-flash"
    
    def get_fallback_username(self) -> Optional[str]:
        """
        Get fallback username for development authentication.
        
        Returns:
            Username string or None if no fallback allowed
        """
        return "mpetrou"
    
    def query_database_data(self) -> Dict[str, Any]:
        """
        Query database for additional data needed for prompts.
        
        Returns:
            Dict of additional data to add to extracted_params
        """
        return {}
    
    def log_generation_params(self) -> None:
        """
        Log generation parameters for debugging.
        """
        pass
    
    def preprocess_ndjson(self, ndjson_line: str) -> str:
        """
        Preprocess individual NDJSON lines before streaming to client.
        
        Subclasses can override this method to modify the NDJSON content
        before it's sent to the client. This is useful for adding metadata,
        transforming data, or filtering content.
        
        Args:
            ndjson_line: A single line of NDJSON (already validated as valid JSON)
            
        Returns:
            Modified NDJSON line (must remain valid JSON)
        """
        return ndjson_line


