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
        
        Filters out incomplete conversations by only returning messages up to 
        the last assistant response. Any user messages after the last assistant
        response are considered incomplete/unprocessed.
        
        Args:
            song_id: ID of the song
            message_type: Type of messages ('style', 'lyrics')
            user: User object for security scoping
            
        Returns:
            List of Message objects in chronological order
        """
        try:
            # Get all messages for this conversation
            messages = Message.objects.filter(
                song_id=song_id,
                type=message_type,
                song__user=user
            ).order_by('created_at')
            
            if not messages.exists():
                logger.debug(f"No message history found for song {song_id}, type '{message_type}'")
                return []
            
            # Find the index of the last assistant message
            last_assistant_idx = -1
            for i, message in enumerate(messages):
                if message.role == 'assistant':
                    last_assistant_idx = i
            
            # Return messages up to and including the last assistant response
            if last_assistant_idx >= 0:
                valid_messages = list(messages[:last_assistant_idx + 1])
                logger.info(f"Retrieved {len(valid_messages)} valid messages for song {song_id}, type '{message_type}' (user: {user.username})")
                return valid_messages
            else:
                # No assistant messages found - return empty to start fresh
                logger.debug(f"No assistant messages found for song {song_id}, type '{message_type}' - starting fresh conversation")
                return []
                
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
                # Get all messages for this conversation
                messages = Message.objects.filter(
                    song_id=song_id,
                    type=message_type,
                    song__user=user
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
        
        Args:
            song_id: ID of the song
            message_type: Type of messages ('style', 'lyrics')
            user: User object for security scoping
            
        Returns:
            Dictionary with conversation statistics
        """
        try:
            messages = Message.objects.filter(
                song_id=song_id,
                type=message_type,
                song__user=user
            )
            
            total_messages = messages.count()
            user_messages = messages.filter(role='user').count()
            assistant_messages = messages.filter(role='assistant').count()
            system_messages = messages.filter(role='system').count()
            
            return {
                'total_messages': total_messages,
                'user_messages': user_messages,
                'assistant_messages': assistant_messages,
                'system_messages': system_messages,
                'has_incomplete': user_messages > assistant_messages
            }
            
        except Exception as e:
            logger.error(f"Error getting conversation stats for song {song_id}, type '{message_type}': {str(e)}")
            return {
                'total_messages': 0,
                'user_messages': 0,
                'assistant_messages': 0,
                'system_messages': 0,
                'has_incomplete': False
            }