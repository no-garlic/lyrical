import logging
from typing import List, Optional, Tuple
from django.db import transaction
from ..models import Message, Song, User


logger = logging.getLogger('services')


class MessageHistoryService:
    """
    Centralized service for managing message history and conversation persistence.
    
    Handles:
    - Retrieving valid conversation history (filtering incomplete conversations)
    - Saving user and assistant messages 
    - Cleaning up incomplete conversations
    - Validating message sequences
    """
    
    @staticmethod
    def get_valid_message_history(song_id: int, message_type: str, user: User) -> List[Message]:
        """
        Retrieve valid message history for a song and message type.
        
        Now includes summarization support:
        - Returns all summary messages (these provide context from previous conversations)
        - Returns active messages of the specified type up to the last assistant response
        - Filters out incomplete conversations (user messages after last assistant response)
        
        Args:
            song_id: ID of the song
            message_type: Type of messages ('style', 'lyrics')
            user: User object for security scoping
            
        Returns:
            List of Message objects in chronological order (summaries + active messages)
        """
        try:
            # Get all summary messages (these are always included for context)
            summary_messages = Message.objects.filter(
                song_id=song_id,
                type='summary',
                song__user=user,
                active=True
            ).order_by('created_at')
            
            # Get active messages for this specific conversation type
            active_messages = Message.objects.filter(
                song_id=song_id,
                type=message_type,
                song__user=user,
                active=True
            ).order_by('created_at')
            
            if not active_messages.exists() and not summary_messages.exists():
                logger.debug(f"No message history found for song {song_id}, type '{message_type}'")
                return []
            
            # For active messages, filter out incomplete conversations
            valid_active_messages = []
            if active_messages.exists():
                # Find the index of the last assistant message
                last_assistant_idx = -1
                for i, message in enumerate(active_messages):
                    if message.role == 'assistant':
                        last_assistant_idx = i
                
                # Include messages up to and including the last assistant response
                if last_assistant_idx >= 0:
                    valid_active_messages = list(active_messages[:last_assistant_idx + 1])
                    logger.debug(f"Found {len(valid_active_messages)} valid active messages for song {song_id}, type '{message_type}'")
                else:
                    # No assistant messages found in active messages
                    logger.debug(f"No assistant messages found in active messages for song {song_id}, type '{message_type}'")
            
            # Combine summary messages and valid active messages, sort by creation time
            all_messages = list(summary_messages) + valid_active_messages
            all_messages.sort(key=lambda msg: msg.created_at)
            
            summary_count = len(summary_messages)
            active_count = len(valid_active_messages)
            total_count = len(all_messages)
            
            logger.info(f"Retrieved {summary_count} summary + {active_count} active = {total_count} total messages for song {song_id}, type '{message_type}' (user: {user.username})")
            return all_messages
                
        except Exception as e:
            logger.error(f"Error retrieving message history for song {song_id}, type '{message_type}': {str(e)}")
            return []
    
    @staticmethod
    def save_user_message(content: str, song_id: int, message_type: str, user: User) -> Optional[Message]:
        """
        Save a user message to the database.
        
        Args:
            content: Message content
            song_id: ID of the song
            message_type: Type of message ('style', 'lyrics')
            user: User object
            
        Returns:
            Created Message object or None if failed
        """
        try:
            # Validate that the song belongs to the user
            song = Song.objects.get(id=song_id, user=user)
            
            message = Message.objects.create(
                type=message_type,
                role='user',
                content=content,
                song=song
            )
            
            logger.debug(f"Saved user message for song {song_id}, type '{message_type}', message ID {message.id}")
            return message
            
        except Song.DoesNotExist:
            logger.error(f"Song {song_id} not found or does not belong to user {user.username}")
            return None
        except Exception as e:
            logger.error(f"Error saving user message for song {song_id}, type '{message_type}': {str(e)}")
            return None
    
    @staticmethod
    def save_assistant_message(content: str, song_id: int, message_type: str, user: User) -> Optional[Message]:
        """
        Save an assistant message to the database.
        
        After saving, checks if the conversation needs summarisation and updates the song flag.
        
        Args:
            content: Message content (complete LLM response)
            song_id: ID of the song
            message_type: Type of message ('style', 'lyrics')
            user: User object
            
        Returns:
            Created Message object or None if failed
        """
        try:
            # Validate that the song belongs to the user
            song = Song.objects.get(id=song_id, user=user)
            
            message = Message.objects.create(
                type=message_type,
                role='assistant',
                content=content,
                song=song
            )
            
            logger.debug(f"Saved assistant message for song {song_id}, type '{message_type}', message ID {message.id}")
            
            # Check if conversation now needs summarisation and update song flag
            MessageHistoryService._check_and_update_summarisation_flag(song_id, user, message_type)
            
            return message
            
        except Song.DoesNotExist:
            logger.error(f"Song {song_id} not found or does not belong to user {user.username}")
            return None
        except Exception as e:
            logger.error(f"Error saving assistant message for song {song_id}, type '{message_type}': {str(e)}")
            return None
    
    @staticmethod
    def cleanup_incomplete_conversations(song_id: int, message_type: str, user: User) -> int:
        """
        Remove incomplete conversations (user messages after last assistant response).
        
        Now respects the active flag - only processes active messages.
        This is useful for cleaning up after failed LLM calls or interrupted streams.
        
        Args:
            song_id: ID of the song
            message_type: Type of messages ('style', 'lyrics')
            user: User object for security scoping
            
        Returns:
            Number of messages deleted
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
                    return 0
                
                # Find the index of the last assistant message
                last_assistant_idx = -1
                for i, message in enumerate(messages):
                    if message.role == 'assistant':
                        last_assistant_idx = i
                
                # Delete any messages after the last assistant message
                if last_assistant_idx >= 0 and last_assistant_idx < len(messages) - 1:
                    orphaned_messages = messages[last_assistant_idx + 1:]
                    deleted_count = len(orphaned_messages)
                    
                    for message in orphaned_messages:
                        message.delete()
                    
                    logger.info(f"Cleaned up {deleted_count} incomplete messages for song {song_id}, type '{message_type}'")
                    return deleted_count
                
                return 0
                
        except Exception as e:
            logger.error(f"Error cleaning up incomplete conversations for song {song_id}, type '{message_type}': {str(e)}")
            return 0
    
    @staticmethod
    def validate_conversation_sequence(messages: List[Message]) -> bool:
        """
        Validate that a conversation follows proper alternating sequence.
        
        A valid conversation should alternate between user and assistant messages,
        starting with a system or user message.
        
        Args:
            messages: List of Message objects in chronological order
            
        Returns:
            True if sequence is valid, False otherwise
        """
        if not messages:
            return True
        
        try:
            expected_role = 'system'  # Can start with system
            
            for i, message in enumerate(messages):
                if i == 0:
                    # First message can be system or user
                    if message.role not in ['system', 'user']:
                        return False
                    expected_role = 'assistant' if message.role == 'user' else 'user'
                else:
                    # Subsequent messages should alternate
                    if message.role != expected_role:
                        return False
                    expected_role = 'assistant' if message.role == 'user' else 'user'
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating conversation sequence: {str(e)}")
            return False
    
    @staticmethod
    def get_conversation_stats(song_id: int, message_type: str, user: User) -> dict:
        """
        Get statistics about a conversation.
        
        Now includes summarization-aware statistics.
        
        Args:
            song_id: ID of the song
            message_type: Type of messages ('style', 'lyrics')
            user: User object for security scoping
            
        Returns:
            Dictionary with conversation statistics
        """
        try:
            # Get active messages for the specific type
            active_messages = Message.objects.filter(
                song_id=song_id,
                type=message_type,
                song__user=user,
                active=True
            )
            
            # Get summary messages
            summary_messages = Message.objects.filter(
                song_id=song_id,
                type='summary',
                song__user=user,
                active=True
            )
            
            # Get inactive messages (for historical tracking)
            inactive_messages = Message.objects.filter(
                song_id=song_id,
                type=message_type,
                song__user=user,
                active=False
            )
            
            active_total = active_messages.count()
            active_user = active_messages.filter(role='user').count()
            active_assistant = active_messages.filter(role='assistant').count()
            active_system = active_messages.filter(role='system').count()
            
            return {
                'active_total_messages': active_total,
                'active_user_messages': active_user,
                'active_assistant_messages': active_assistant,
                'active_system_messages': active_system,
                'summary_messages': summary_messages.count(),
                'inactive_messages': inactive_messages.count(),
                'has_incomplete': active_user > active_assistant,
                'has_summaries': summary_messages.exists()
            }
            
        except Exception as e:
            logger.error(f"Error getting conversation stats for song {song_id}, type '{message_type}': {str(e)}")
            return {
                'active_total_messages': 0,
                'active_user_messages': 0,
                'active_assistant_messages': 0,
                'active_system_messages': 0,
                'summary_messages': 0,
                'inactive_messages': 0,
                'has_incomplete': False,
                'has_summaries': False
            }
    
    @staticmethod
    def _check_and_update_summarisation_flag(song_id: int, user: User, updated_message_type: str = None) -> None:
        """
        Check if any conversations for a song need summarisation and update the song flag.
        
        This is called after saving assistant messages to keep the needs_summarisation flag current.
        
        Args:
            song_id: ID of the song
            user: User object
            updated_message_type: The message type that was just updated (for efficiency)
        """
        try:
            # Import here to avoid circular imports
            from ..services.utils.summarise import ChatSummarisationService
            
            # Get current song state
            song = Song.objects.get(id=song_id, user=user)
            current_needs_summary = song.needs_summarisation
            
            # If we know which conversation type was updated, check it first
            if updated_message_type:
                updated_needs_summary = ChatSummarisationService.check_needs_summarisation(
                    song_id, updated_message_type, user
                )
                
                # If the updated conversation needs summary, we can short-circuit
                if updated_needs_summary and not current_needs_summary:
                    song.needs_summarisation = True
                    song.save()
                    logger.info(f"Updated song {song_id} needs_summarisation flag to: True (due to {updated_message_type} conversation)")
                    return
                
                # If we already needed summary and this conversation still needs it, no change needed
                if updated_needs_summary and current_needs_summary:
                    logger.debug(f"Song {song_id} already marked as needing summarisation")
                    return
                
                # Check the other conversation type only if needed
                other_type = 'lyrics' if updated_message_type == 'style' else 'style'
                other_needs_summary = ChatSummarisationService.check_needs_summarisation(
                    song_id, other_type, user
                )
                
                needs_summary = updated_needs_summary or other_needs_summary
            else:
                # Check both conversation types (fallback)
                style_needs_summary = ChatSummarisationService.check_needs_summarisation(
                    song_id, 'style', user
                )
                lyrics_needs_summary = ChatSummarisationService.check_needs_summarisation(
                    song_id, 'lyrics', user
                )
                needs_summary = style_needs_summary or lyrics_needs_summary
            
            # Update song flag if changed
            if song.needs_summarisation != needs_summary:
                song.needs_summarisation = needs_summary
                song.save()
                logger.info(f"Updated song {song_id} needs_summarisation flag to: {needs_summary}")
            
        except Song.DoesNotExist:
            logger.error(f"Song {song_id} not found when updating summarisation flag")
        except Exception as e:
            logger.error(f"Error checking/updating summarisation flag for song {song_id}: {str(e)}")