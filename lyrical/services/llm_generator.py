import os
import json
import unicodedata
import litellm
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from django.http import JsonResponse, StreamingHttpResponse
from .utils.prompts import get_system_prompt, get_user_prompt
from .utils.messages import MessageBuilder
from .utils.apikey import get_user_api_key
from ..logging_config import get_logger


logger = get_logger('services')


class LLMGenerator(ABC):
    """
    Base class for LLM generation endpoints.
    
    Subclasses should implement the abstract methods to customize:
    - Parameter extraction
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
            validation_errors = self._extract_parameters()
            if validation_errors:
                return validation_errors
            
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
    

    def _extract_parameters(self) -> Optional[JsonResponse]:
        """
        Extract and validate request parameters.
        
        Returns:
            JsonResponse if validation fails, None if successful
        """
        try:
            # call subclass implementation
            self.extracted_params = self.extract_parameters()
            
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
            logger.debug(f"using llm model: {self.get_llm_model_name()}")
            return None
            
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
        Build system and user prompts with conversation history.
        
        Returns:
            JsonResponse if prompt building fails, None if successful
        """
        try:
            prompt_name = self.get_prompt_name()
            song_id = self.get_song_id()
            message_type = self.get_message_type()
            
            # get system prompt
            system_message = get_system_prompt(prompt_name, self.llm_model)
            if system_message is None:
                logger.error(f"system prompt for '{prompt_name}' not found")
                return JsonResponse({
                    "success": False,
                    "error": "system prompt configuration not found"
                }, status=500)
            
            # initialize message builder with system prompt
            self.prompt_messages = MessageBuilder(system_message)
            
            # load conversation history from database if enabled for this generator
            if self.uses_conversation_history():
                history_loaded = self.prompt_messages.load_from_history(song_id, message_type, self.user)
                if not history_loaded:
                    logger.warning(f"Failed to load conversation history for song {song_id}, type '{message_type}' - continuing anyway")
            else:
                logger.debug(f"Conversation history disabled for this generator - starting fresh conversation")
            
            # determine if we prefer a follow up prompt
            prefer_follow_up = (self.uses_conversation_history() and self.prompt_messages.get_user_message_count() > 0)

            # get user prompt with custom parameters
            user_prompt_params = self.build_user_prompt_params()
            user_message = get_user_prompt(
                prompt_name=prompt_name,
                llm=self.llm_model,
                prefer_follow_up=prefer_follow_up,
                **user_prompt_params
            )
            
            if user_message is None:
                logger.error(f"prompt '{prompt_name}' not found in configuration")
                return JsonResponse({
                    "success": False,
                    "error": f"prompt configuration '{prompt_name}' not found"
                }, status=404)
            
            # add new user message to conversation
            self.prompt_messages.add_user(user_message)

            # log the prompt messages for debugging
            logger.debug(f"Prompt messages: {self.prompt_messages}")
            
            # log generation start
            if self.prompt_messages.has_conversation_history():
                logger.info(f"continuing conversation for user '{self.user.username}' with prompt '{prompt_name}', song {song_id}, type '{message_type}'")
            else:
                logger.info(f"starting new conversation for user '{self.user.username}' with prompt '{prompt_name}', song {song_id}, type '{message_type}'")
            
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
            response_stream_generator = self._stream_llm_response()
            
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
    def get_prompt_name(self) -> str:
        """
        Get the prompt name to use for generation.
        
        Returns:
            String prompt name
        """
        pass
    
    @abstractmethod
    def get_message_type(self) -> str:
        """
        Get the message type for conversation history.
        
        Returns:
            String message type ('style', 'lyrics')
        """
        pass
    
    @abstractmethod
    def get_song_id(self) -> int:
        """
        Get the song ID for conversation history.
        
        Returns:
            Integer song ID
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
    
    def uses_conversation_history(self) -> bool:
        """
        Override this method to disable conversation history for specific generators.
        
        Returns:
            True if this generator should use conversation history (default), False otherwise
        """
        return True
    
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
    
    def on_response_complete(self) -> None:
        """
        Called after the full LLM response has been received and processed.
        
        Subclasses can override this method to perform actions when the
        generation is complete, such as updating database records or
        triggering follow-up processes.
        """
        pass
    
    def _normalize_text(self, text):
        """
        Convert Unicode characters to closest ASCII equivalent.
        """
        if isinstance(text, str):
            return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
        elif isinstance(text, list):
            return [self._normalize_text(item) for item in text]
        elif isinstance(text, dict):
            return {self._normalize_text(k): self._normalize_text(v) for k, v in text.items()}
        return text
    
    def _clean_assistant_response(self, response_text: str) -> str:
        """
        Clean assistant response by removing excessive trailing backticks.
        Leaves at most 3 trailing backticks to preserve intentional formatting.
        
        Args:
            response_text: Raw assistant response text
            
        Returns:
            Cleaned response text with excessive backticks removed
        """
        if not response_text:
            return response_text
        
        # Find trailing backticks at the end of the response
        stripped_response = response_text.rstrip()
        if not stripped_response.endswith('`'):
            return response_text
        
        # Count trailing backticks
        trailing_backticks = 0
        for i in range(len(stripped_response) - 1, -1, -1):
            if stripped_response[i] == '`':
                trailing_backticks += 1
            else:
                break
        
        if trailing_backticks > 3:
            # Remove excessive backticks, keep at most 3
            content_without_backticks = stripped_response[:-trailing_backticks]
            cleaned_response = content_without_backticks + '```'
            
            # Preserve any whitespace that was after the original content
            original_whitespace = response_text[len(stripped_response):]
            cleaned_response += original_whitespace
            
            logger.debug(f"Cleaned {trailing_backticks} trailing backticks, reduced to 3")
            return cleaned_response
        
        return response_text
    
    def _process_response_line(self, line: str):
        """
        Process a single line of LLM response text and yield valid JSON.
        Handles markdown fences and validates JSON format.
        """
        stripped_line = line.strip()
        
        # Skip markdown fence lines (including long strings of backticks)
        if (stripped_line in ["```json", "```", "```ndjson"] or 
            not stripped_line or 
            stripped_line.startswith("```") or
            all(c == '`' for c in stripped_line)):
            logger.debug(f"Skipping markdown fence or backtick line: {stripped_line[:50]}{'...' if len(stripped_line) > 50 else ''}")
            return
        
        try:
            # Validate JSON format
            json.loads(stripped_line)
            
            # Apply preprocessing if available
            processed_line = self.preprocess_ndjson(stripped_line)
            
            # Validate processed line is still valid JSON
            json.loads(processed_line)
            
            yield processed_line + '\n'
            
        except json.JSONDecodeError as e:
            logger.warning(f"LLM_SERVICE_NDJSON_PARSE_ERROR: Malformed JSON line: {stripped_line}, Error: {e}")
            error_data = {
                "error": "Malformed JSON line from LLM",
                "raw_content": stripped_line,
                "details": str(e)
            }
            yield json.dumps(error_data) + '\n'
            
        except Exception as e:
            logger.error(f"LLM_SERVICE_NDJSON_PROCESS_ERROR: Error processing line: {stripped_line}, Error: {e}")
            error_data = {
                "error": "Error processing line from LLM",
                "raw_content": stripped_line,
                "details": str(e)
            }
            yield json.dumps(error_data) + '\n'
    
    def _stream_llm_response(self):
        """
        Call LLM and stream the response, processing each line for JSON validation.
        Also handles conversation history persistence.
        """
        model_name = f"{self.llm_model.provider.internal_name}/{self.llm_model.internal_name}"
        temperature = self.user.llm_temperature if self.llm_model.use_temperature else None
        max_tokens = self.user.max_tokens_for_selected_llm * 1000
        user_api_key = get_user_api_key(user=self.user, provider=self.llm_model.provider)
        
        # Get parameters for message persistence
        song_id = self.get_song_id()
        message_type = self.get_message_type()
        
        # Set Ollama base URL if needed
        if self.llm_model.provider.internal_name == "ollama" and "OLLAMA_API_BASE" not in os.environ:
            os.environ["OLLAMA_API_BASE"] = "http://localhost:11434"
        
        # Save user message before LLM call (if conversation history is enabled)
        if self.uses_conversation_history():
            user_message_content = self.prompt_messages.get_last_user_message()
            if user_message_content:
                saved_user_msg = self.prompt_messages.save_user_message(
                    user_message_content, song_id, message_type, self.user
                )
                if saved_user_msg:
                    logger.debug(f"Saved user message {saved_user_msg.id} before LLM call")
                else:
                    logger.warning(f"Failed to save user message before LLM call for song {song_id}")
        
        try:
            # Prepare LLM call parameters
            llm_params = {
                "model": model_name,
                "messages": self.prompt_messages.get(),
                "max_tokens": max_tokens,
                "stream": True
            }
            
            if temperature is not None:
                llm_params["temperature"] = temperature

            if user_api_key and len(user_api_key) > 0:
                llm_params["api_key"] = user_api_key
            
            logger.info(f"LLM_SERVICE: Calling model {model_name} with temperature {temperature} and max_tokens {max_tokens}")
            logger.debug(f"LLM_SERVICE: Messages: {self.prompt_messages.get()}")

            # Log the full conversation to LLM conversation log file before calling completion()
            try:
                self.prompt_messages.log_conversation_to_file(message_type, song_id)
            except Exception as e:
                logger.warning(f"Failed to log conversation to file: {e}")
            
            response_stream = litellm.completion(**llm_params)
            
            # Accumulate assistant response for database persistence
            accumulated_response = []
            
            # Process streaming chunks
            current_line = ""
            chunk_count = 0
            for chunk in response_stream:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    content = self._normalize_text(chunk.choices[0].delta.content)
                    chunk_count += 1
                    
                    # Log suspicious content containing many backticks
                    if '`' in content and len([c for c in content if c == '`']) > 10:
                        logger.warning(f"LLM_STREAM_CHUNK_{chunk_count}: Detected chunk with many backticks: {repr(content)}")
                    
                    current_line += content
                    accumulated_response.append(content)
                    
                    # Process complete lines
                    while '\n' in current_line:
                        line, current_line = current_line.split('\n', 1)
                        yield from self._process_response_line(line)
            
            # Process any remaining content
            if current_line.strip():
                accumulated_response.append(current_line)
                yield from self._process_response_line(current_line)
            
            # Save complete assistant response to database (if conversation history is enabled)
            if self.uses_conversation_history():
                complete_response = ''.join(accumulated_response)
                if complete_response.strip():
                    # Clean excessive backticks before saving to database
                    cleaned_response = self._clean_assistant_response(complete_response)
                    saved_assistant_msg = self.prompt_messages.save_assistant_message(
                        cleaned_response, song_id, message_type, self.user
                    )
                    if saved_assistant_msg:
                        logger.debug(f"Saved assistant message {saved_assistant_msg.id} after LLM completion")
                    else:
                        logger.warning(f"Failed to save assistant message after LLM completion for song {song_id}")
            
            # Call on_response_complete after successful generation
            try:
                self.on_response_complete()
            except Exception as e:
                logger.error(f"Error in on_response_complete: {str(e)}")
                
        except Exception as e:
            logger.error(f"LLM_SERVICE_EXCEPTION: An error occurred during the LLM stream: {e}")
            import traceback
            error_response = {
                "error": str(e),
                "traceback": traceback.format_exc(),
                "status": "error"
            }
            yield json.dumps(error_response)
            
            # Call on_response_complete even on error in case we saved some messages
            try:
                self.on_response_complete()
            except Exception as complete_error:
                logger.error(f"Error in on_response_complete during error handling: {str(complete_error)}")
            
            # Note: If the stream fails, we still have the user message saved in the database
            # The next time we load history, incomplete conversations will be filtered out automatically


