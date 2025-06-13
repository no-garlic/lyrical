"""
LLM Conversation Logger Service

This service manages detailed logging of LLM conversations to separate files
organized by message type and song ID for debugging and analysis purposes.

Each conversation is logged to: /logs/llm/{message_type}_{song_id}.log
"""

import os
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional
from ..logging_config import get_logger


logger = get_logger('services')

# Thread lock for file operations
_file_lock = threading.Lock()

# Base directory for LLM conversation logs
LLM_LOGS_DIR = Path(__file__).parent.parent.parent / "logs" / "llm"

# Length of the header line in log files
HEADER_LENGTH = 120


class LLMConversationLogger:
    """
    Service for logging LLM conversations to individual files organized by message type and song ID.
    
    Features:
    - One log file per message_type + song_id combination
    - Timestamped headers for each conversation session
    - Thread-safe file operations
    - Automatic directory creation
    """
    
    @staticmethod
    def ensure_llm_logs_directory():
        """
        Ensure the LLM logs directory exists.
        
        Creates /logs/llm/ directory if it doesn't exist.
        """
        try:
            LLM_LOGS_DIR.mkdir(parents=True, exist_ok=True)
            logger.debug(f"LLM logs directory ensured at: {LLM_LOGS_DIR}")
        except Exception as e:
            logger.error(f"Failed to create LLM logs directory: {e}")
            raise
    
    @staticmethod
    def get_log_file_path(message_type: str, song_id: int, is_summarization: bool = False) -> Path:
        """
        Get the log file path for a specific message type and song ID.
        
        Args:
            message_type: The message type ('style', 'lyrics')
            song_id: The song ID
            is_summarization: Whether this is for summarization logging
            
        Returns:
            Path object for the log file
        """
        suffix = "_summarize" if is_summarization else ""
        filename = f"{message_type}{suffix}.log"
        if song_id is not None:
            filename = f"{message_type}_{song_id}{suffix}.log"
        return LLM_LOGS_DIR / filename
    
    @staticmethod
    def create_session_header(message_type: str, song_id: int, is_summarization: bool = False) -> str:
        """
        Create a timestamped header for a new conversation session.
        
        Args:
            message_type: The message type
            song_id: The song ID
            is_summarization: Whether this is for summarization logging
            
        Returns:
            Formatted header string (HEADER_LENGTH characters wide)
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        type_suffix = " [SUMMARIZATION]" if is_summarization else ""
        header_text = f" {timestamp} | {message_type}{type_suffix} "
        if song_id is not None:
            header_text = f" {timestamp} | {message_type}{type_suffix} | song_id: {song_id} "
        
        # Calculate padding to make exactly HEADER_LENGTH characters
        total_padding = HEADER_LENGTH - len(header_text)
        left_padding = total_padding // 2
        right_padding = total_padding - left_padding
        
        header = "=" * left_padding + header_text + "=" * right_padding
        
        # Ensure exactly HEADER_LENGTH characters
        return header[:HEADER_LENGTH]
    
    @staticmethod
    def log_conversation(message_type: str, song_id: int, conversation_content: str):
        """
        Log a conversation to the appropriate file with a timestamped header.
        
        Args:
            message_type: The message type ('style', 'lyrics')
            song_id: The song ID
            conversation_content: The full conversation content (from MessageBuilder.__str__())
        """
        try:
            # Ensure directory exists
            LLMConversationLogger.ensure_llm_logs_directory()
            
            # Get the log file path
            log_file_path = LLMConversationLogger.get_log_file_path(message_type, song_id)
            
            # Create session header
            header = LLMConversationLogger.create_session_header(message_type, song_id)
            
            # Thread-safe file writing
            with _file_lock:
                with open(log_file_path, 'a', encoding='utf-8') as f:
                    f.write(f"{header}\n")
                    f.write("=" * HEADER_LENGTH + "\n")
                    for line in conversation_content.splitlines():
                        f.write(f"{line}\n") if line.startswith('role: ') else f.write(f"    {line}\n")
                    f.write("=" * HEADER_LENGTH + "\n")
            
            logger.info(f"LLM conversation logged to: {log_file_path}")
            
        except Exception as e:
            logger.error(f"Failed to log LLM conversation for {message_type}_{song_id}: {e}")
            # Don't raise the exception - logging failures shouldn't break the main flow
    
    @staticmethod
    def log_summarization_conversation(message_type: str, song_id: int, system_prompt: str, user_prompt: str, summary_response: str):
        """
        Log a summarization conversation to the appropriate _summarize file with a timestamped header.
        
        Args:
            message_type: The message type ('style', 'lyrics')
            song_id: The song ID
            system_prompt: The system prompt sent to the LLM
            user_prompt: The user prompt sent to the LLM
            summary_response: The summary response from the LLM
        """
        try:
            # Ensure directory exists
            LLMConversationLogger.ensure_llm_logs_directory()
            
            # Get the log file path for summarization
            log_file_path = LLMConversationLogger.get_log_file_path(message_type, song_id, is_summarization=True)
            
            # Create session header for summarization
            header = LLMConversationLogger.create_session_header(message_type, song_id, is_summarization=True)
            
            # Build conversation content
            conversation_content = f"role: system\n{system_prompt}\n\nrole: user\n{user_prompt}\n\nrole: assistant\n{summary_response}"
            
            # Thread-safe file writing
            with _file_lock:
                with open(log_file_path, 'a', encoding='utf-8') as f:
                    f.write(f"{header}\n")
                    f.write("=" * HEADER_LENGTH + "\n")
                    for line in conversation_content.splitlines():
                        f.write(f"{line}\n") if line.startswith('role: ') else f.write(f"    {line}\n")
                    f.write("=" * HEADER_LENGTH + "\n")
            
            logger.info(f"LLM summarization conversation logged to: {log_file_path}")
            
        except Exception as e:
            logger.error(f"Failed to log LLM summarization conversation for {message_type}_{song_id}: {e}")
            # Don't raise the exception - logging failures shouldn't break the main flow
    
    @staticmethod
    def get_conversation_log_info(message_type: str, song_id: int, is_summarization: bool = False) -> dict:
        """
        Get information about the conversation log file.
        
        Args:
            message_type: The message type
            song_id: The song ID
            is_summarization: Whether this is for summarization logging
            
        Returns:
            Dictionary with log file information
        """
        try:
            log_file_path = LLMConversationLogger.get_log_file_path(message_type, song_id, is_summarization)
            
            if log_file_path.exists():
                stat = log_file_path.stat()
                return {
                    'exists': True,
                    'path': str(log_file_path),
                    'size_bytes': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'sessions': LLMConversationLogger._count_sessions(log_file_path)
                }
            else:
                return {
                    'exists': False,
                    'path': str(log_file_path),
                    'size_bytes': 0,
                    'modified': None,
                    'sessions': 0
                }
                
        except Exception as e:
            logger.error(f"Failed to get conversation log info for {message_type}_{song_id}: {e}")
            return {
                'exists': False,
                'path': str(LLMConversationLogger.get_log_file_path(message_type, song_id, is_summarization)),
                'error': str(e)
            }
    
    @staticmethod
    def _count_sessions(log_file_path: Path) -> int:
        """
        Count the number of conversation sessions in a log file.
        
        Args:
            log_file_path: Path to the log file
            
        Returns:
            Number of sessions (header lines)
        """
        try:
            with open(log_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Count lines that start with "=" and contain timestamp pattern
                lines = content.split('\n')
                session_count = 0
                for line in lines:
                    if (line.startswith('=') and 
                        (' | ' in line) and 
                        ('song_id:' in line)):
                        session_count += 1
                return session_count
        except Exception:
            return 0
    
    @staticmethod
    def cleanup_old_logs(days_old: int = 30):
        """
        Clean up old conversation log files.
        
        Args:
            days_old: Remove files older than this many days
        """
        try:
            if not LLM_LOGS_DIR.exists():
                return
            
            cutoff_time = datetime.now().timestamp() - (days_old * 24 * 60 * 60)
            removed_count = 0
            
            for log_file in LLM_LOGS_DIR.glob("*.log"):
                if log_file.stat().st_mtime < cutoff_time:
                    log_file.unlink()
                    removed_count += 1
            
            logger.info(f"Cleaned up {removed_count} old LLM conversation logs (older than {days_old} days)")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old LLM conversation logs: {e}")
    
    @staticmethod
    def get_all_conversation_logs() -> list:
        """
        Get information about all existing conversation log files.
        
        Returns:
            List of dictionaries with log file information
        """
        try:
            if not LLM_LOGS_DIR.exists():
                return []
            
            logs = []
            for log_file in LLM_LOGS_DIR.glob("*.log"):
                # Parse filename to extract message_type and song_id
                name_parts = log_file.stem.split('_')
                if len(name_parts) >= 2:
                    message_type = '_'.join(name_parts[:-1])  # Handle message types with underscores
                    try:
                        song_id = int(name_parts[-1])
                        log_info = LLMConversationLogger.get_conversation_log_info(message_type, song_id)
                        log_info['message_type'] = message_type
                        log_info['song_id'] = song_id
                        logs.append(log_info)
                    except ValueError:
                        # Skip files that don't match the expected pattern
                        continue
            
            return sorted(logs, key=lambda x: x.get('modified', ''), reverse=True)
            
        except Exception as e:
            logger.error(f"Failed to get all conversation logs: {e}")
            return []