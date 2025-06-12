import logging
import os
from typing import List, Optional, Tuple
from django.db import transaction
import tiktoken
from litellm import completion
from ...models import Message, Song, User
from .apikey import get_user_api_key


logger = logging.getLogger('services')


class ChatSummarisationService:
    """
    Service for managing chat history summarisation.
    
    Handles:
    - Token counting with precise tiktoken counting
    - Checking if conversation needs summarisation 
    - Summarising conversations using a separate LLM model
    - Updating message history by deactivating old messages and inserting summaries
    - Managing song summarisation flags
    """
    
    @staticmethod
    def estimate_tokens(text: str, model_name: str = "gpt-4") -> int:
        """
        Estimate token count for given text using tiktoken for precise counting.
        Falls back to character-based estimation if tiktoken fails.
        
        Args:
            text: Text to count tokens for
            model_name: Model name for tiktoken encoding (defaults to gpt-4)
            
        Returns:
            Estimated token count
        """
        try:
            # Map common model patterns to tiktoken encodings
            if "gpt-4" in model_name.lower():
                encoding = tiktoken.encoding_for_model("gpt-4")
            elif "gpt-3.5" in model_name.lower():
                encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
            elif "claude" in model_name.lower():
                # Claude uses similar tokenization to GPT-4
                encoding = tiktoken.encoding_for_model("gpt-4")
            else:
                # For other models (like Gemini), use cl100k_base which is general purpose
                encoding = tiktoken.get_encoding("cl100k_base")
            
            return len(encoding.encode(text))
        except Exception as e:
            logger.debug(f"tiktoken failed for model {model_name}, falling back to character estimation: {e}")
            # Fallback to character-based estimation (1 token = 4 characters)
            return len(text) // 4
    
    @staticmethod
    def count_conversation_tokens(messages: List[Message], model_name: str = "gpt-4") -> int:
        """
        Count total tokens in a conversation.
        
        Args:
            messages: List of Message objects
            model_name: Model name for token counting
            
        Returns:
            Total token count for the conversation
        """
        total_tokens = 0
        for message in messages:
            total_tokens += ChatSummarisationService.estimate_tokens(message.content, model_name)
        
        # Only log if it's a significant conversation or for debugging
        if len(messages) > 5 or total_tokens > 1000:
            logger.debug(f"Conversation token count: {total_tokens} tokens across {len(messages)} messages")
        return total_tokens
    
    @staticmethod
    def check_needs_summarisation(song_id: int, message_type: str, user: User) -> bool:
        """
        Check if a conversation needs summarisation based on token count vs user's max_tokens.
        
        Args:
            song_id: ID of the song
            message_type: Type of messages ('style', 'lyrics')
            user: User object with max_tokens setting
            
        Returns:
            True if conversation needs summarisation, False otherwise
        """
        try:
            # Get active messages for this conversation
            messages = Message.objects.filter(
                song_id=song_id,
                type=message_type,
                song__user=user,
                active=True
            ).order_by('created_at')
            
            if not messages.exists():
                return False
            
            # Count tokens in conversation
            total_tokens = ChatSummarisationService.count_conversation_tokens(
                list(messages), 
                user.llm_model.internal_name
            )
            
            # Compare with user's max_tokens setting
            needs_summary = total_tokens > (1024 * user.max_tokens_for_selected_llm)
            
            logger.info(f"Conversation check: {total_tokens} tokens vs {1024 * user.max_tokens_for_selected_llm} max_tokens = {'NEEDS SUMMARY' if needs_summary else 'OK'}")
            return needs_summary
            
        except Exception as e:
            logger.error(f"Error checking summarisation needs for song {song_id}, type '{message_type}': {str(e)}")
            return False
    
    @staticmethod
    def update_song_summarisation_flag(song_id: int, user: User, needs_summary: bool = None) -> bool:
        """
        Update the needs_summarisation flag on a song.
        If needs_summary is None, automatically check all conversation types.
        
        Args:
            song_id: ID of the song
            user: User object
            needs_summary: Override flag, or None to auto-check
            
        Returns:
            True if operation succeeded, False otherwise
        """
        try:
            song = Song.objects.get(id=song_id, user=user)
            
            if needs_summary is None:
                # Auto-check both conversation types
                style_needs_summary = ChatSummarisationService.check_needs_summarisation(
                    song_id, 'style', user
                )
                lyrics_needs_summary = ChatSummarisationService.check_needs_summarisation(
                    song_id, 'lyrics', user
                )
                needs_summary = style_needs_summary or lyrics_needs_summary
            
            song.needs_summarisation = needs_summary
            song.save()
            
            logger.info(f"Updated song {song_id} summarisation flag to: {needs_summary}")
            return True
            
        except Song.DoesNotExist:
            logger.error(f"Song {song_id} not found or does not belong to user {user.username}")
            return False
        except Exception as e:
            logger.error(f"Error updating summarisation flag for song {song_id}: {str(e)}")
            return False
    
    @staticmethod
    def _call_summarisation_llm(messages_content: str, message_type: str, user: User) -> Optional[str]:
        """
        Call the LLM to generate a summary of the conversation.
        
        Args:
            messages_content: Full conversation content as string
            message_type: Type of conversation ('style', 'lyrics')
            user: User object with LLM settings
            
        Returns:
            Summary text or None if failed
        """
        try:
            # Import prompt utilities
            from .prompts import get_system_prompt, get_user_prompt
            
            model_name = f"{user.llm_model_summarise.provider.internal_name}/{user.llm_model_summarise.internal_name}"
            user_api_key = get_user_api_key(user=user, provider=user.llm_model_summarise.provider)
            
            # Set Ollama base URL if needed
            if user.llm_model_summarise.provider.internal_name == "ollama" and "OLLAMA_API_BASE" not in os.environ:
                os.environ["OLLAMA_API_BASE"] = "http://localhost:11434"
            
            # Get prompts from internal.yaml
            system_prompt = get_system_prompt("chat_summary", user.llm_model_summarise)
            user_prompt = get_user_prompt(
                f"{message_type}_summary",
                user.llm_model_summarise,
                conversation_content=messages_content,
                conversation_type=message_type
            )
            
            if not system_prompt or not user_prompt:
                logger.error(f"Failed to load summarisation prompts for {message_type}")
                return None
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            # Prepare LLM call parameters
            llm_params = {
                "model": model_name,
                "messages": messages,
                "temperature": 0.1,  # Low temperature for consistent summaries
                "max_tokens": 1000,  # Reasonable limit for summaries
                "stream": False  # Non-streaming for simplicity
            }
            
            if user_api_key and len(user_api_key) > 0:
                llm_params["api_key"] = user_api_key
            
            logger.info(f"Calling summarisation model {model_name} for {message_type} conversation")
            
            response = completion(**llm_params)
            
            if response.choices and response.choices[0].message:
                summary = response.choices[0].message.content.strip()
                logger.info(f"Generated summary of {len(summary)} characters for {message_type} conversation")
                return summary
            else:
                logger.error("No valid response from summarisation LLM")
                return None
                
        except Exception as e:
            logger.error(f"Error calling summarisation LLM for {message_type}: {str(e)}")
            return None
    
    @staticmethod
    def summarise_conversation(song_id: int, message_type: str, user: User) -> bool:
        """
        Summarise a conversation by:
        1. Getting all active messages
        2. Generating a summary using LLM
        3. Deactivating original messages
        4. Inserting summary message
        5. Updating song summarisation flag
        
        Args:
            song_id: ID of the song
            message_type: Type of messages ('style', 'lyrics')
            user: User object
            
        Returns:
            True if summarisation succeeded, False otherwise
        """
        try:
            with transaction.atomic():
                # Get all active messages for this conversation
                messages = Message.objects.filter(
                    song_id=song_id,
                    type=message_type,
                    song__user=user,
                    active=True
                ).order_by('created_at')
                
                if not messages.exists():
                    logger.warning(f"No active messages found for song {song_id}, type '{message_type}'")
                    return False
                
                if messages.count() < 3:  # System + User + Assistant minimum
                    logger.info(f"Too few messages ({messages.count()}) to summarise for song {song_id}, type '{message_type}'")
                    return False
                
                # Build conversation content for summarisation
                conversation_content = ""
                for message in messages:
                    conversation_content += f"{message.role.upper()}: {message.content}\n\n"
                
                logger.info(f"Summarising {messages.count()} messages ({len(conversation_content)} chars) for song {song_id}, type '{message_type}'")
                
                # Generate summary using LLM
                summary = ChatSummarisationService._call_summarisation_llm(
                    conversation_content, message_type, user
                )
                
                if not summary:
                    logger.error(f"Failed to generate summary for song {song_id}, type '{message_type}'")
                    return False
                
                # Deactivate all original messages
                deactivated_count = messages.update(active=False)
                logger.info(f"Deactivated {deactivated_count} messages for song {song_id}, type '{message_type}'")
                
                # Create summary message
                song = Song.objects.get(id=song_id, user=user)
                summary_message = Message.objects.create(
                    type='summary',  # Use 'summary' type to distinguish from regular messages
                    role='assistant',
                    content=summary,
                    song=song,
                    active=True
                )
                
                logger.info(f"Created summary message {summary_message.id} for song {song_id}, type '{message_type}'")
                
                # Update song summarisation flag
                ChatSummarisationService.update_song_summarisation_flag(song_id, user)
                
                return True
                
        except Song.DoesNotExist:
            logger.error(f"Song {song_id} not found or does not belong to user {user.username}")
            return False
        except Exception as e:
            logger.error(f"Error summarising conversation for song {song_id}, type '{message_type}': {str(e)}")
            return False
    
    @staticmethod
    def get_conversation_with_summaries(song_id: int, message_type: str, user: User) -> List[Message]:
        """
        Get conversation messages including active messages and summary messages.
        This replaces the functionality in MessageHistoryService for summarisation-aware retrieval.
        
        Args:
            song_id: ID of the song
            message_type: Type of messages ('style', 'lyrics')  
            user: User object
            
        Returns:
            List of Message objects (summaries + active messages) in chronological order
        """
        try:
            # Get all summary messages (these are always included)
            summary_messages = Message.objects.filter(
                song_id=song_id,
                type='summary',
                song__user=user
            ).order_by('created_at')
            
            # Get active messages of the specified type
            active_messages = Message.objects.filter(
                song_id=song_id,
                type=message_type,
                song__user=user,
                active=True
            ).order_by('created_at')
            
            # Combine and sort by creation time
            all_messages = list(summary_messages) + list(active_messages)
            all_messages.sort(key=lambda msg: msg.created_at)
            
            logger.debug(f"Retrieved {len(summary_messages)} summary + {len(active_messages)} active messages for song {song_id}, type '{message_type}'")
            return all_messages
            
        except Exception as e:
            logger.error(f"Error retrieving conversation with summaries for song {song_id}, type '{message_type}': {str(e)}")
            return []