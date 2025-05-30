
import logging
from typing import List, Optional
from ..message_history_service import MessageHistoryService
from ...models import Message, User


logger = logging.getLogger('services')


class MessageBuilder:
    def __init__(self, system_prompt=None):
        self.messages = []
        if system_prompt:
            self.add_system(system_prompt)

    def add_system(self, content):
        self.messages.append({"role": "system", "content": content})

    def add_user(self, content):
        self.messages.append({"role": "user", "content": content})

    def add_assistant(self, content):
        self.messages.append({"role": "assistant", "content": content})

    def get(self):
        return self.messages
    
    def __str__(self):
        message_str = "\n------------------- MessageBuilder -------------------\n"
        for message in self.messages:
            message_str += f"\nrole: {message['role']}\n{message['content']}\n"
        return message_str
    
    def load_from_history(self, song_id: int, message_type: str, user: User) -> bool:
        """
        Load conversation history from database and rebuild MessageBuilder.
        
        This method will:
        1. Retrieve valid message history (filtering incomplete conversations)
        2. Clear current messages 
        3. Rebuild messages from database history
        
        Args:
            song_id: ID of the song
            message_type: Type of messages ('style', 'hook', 'lyrics')
            user: User object for security scoping
            
        Returns:
            True if history was loaded successfully, False otherwise
        """
        try:
            # Get valid message history from database
            db_messages = MessageHistoryService.get_valid_message_history(song_id, message_type, user)
            
            if not db_messages:
                logger.debug(f"No message history found for song {song_id}, type '{message_type}' - starting fresh")
                return True  # No history is still a valid state
            
            # Clear current messages
            self.messages.clear()
            
            # Rebuild from database messages
            for message in db_messages:
                self.messages.append({
                    "role": message.role,
                    "content": message.content
                })
            
            logger.debug(f"Loaded {len(db_messages)} messages from history for song {song_id}, type '{message_type}'")
            return True
            
        except Exception as e:
            logger.error(f"Error loading message history for song {song_id}, type '{message_type}': {str(e)}")
            return False
    
    def save_user_message(self, content: str, song_id: int, message_type: str, user: User) -> Optional[Message]:
        """
        Save a user message to the database.
        
        Args:
            content: Message content
            song_id: ID of the song
            message_type: Type of message ('style', 'hook', 'lyrics')
            user: User object
            
        Returns:
            Created Message object or None if failed
        """
        return MessageHistoryService.save_user_message(content, song_id, message_type, user)
    
    def save_assistant_message(self, content: str, song_id: int, message_type: str, user: User) -> Optional[Message]:
        """
        Save an assistant message to the database.
        
        Args:
            content: Message content (complete LLM response)
            song_id: ID of the song
            message_type: Type of message ('style', 'hook', 'lyrics')
            user: User object
            
        Returns:
            Created Message object or None if failed
        """
        return MessageHistoryService.save_assistant_message(content, song_id, message_type, user)
    
    def get_last_user_message(self) -> Optional[str]:
        """
        Get the content of the last user message in the conversation.
        
        Returns:
            Content of last user message or None if no user messages exist
        """
        for message in reversed(self.messages):
            if message["role"] == "user":
                return message["content"]
        return None
    
    def has_conversation_history(self) -> bool:
        """
        Check if this MessageBuilder contains conversation history.
        
        Returns:
            True if there are messages beyond just a system prompt
        """
        if len(self.messages) == 0:
            return False
        if len(self.messages) == 1 and self.messages[0]["role"] == "system":
            return False
        return True


