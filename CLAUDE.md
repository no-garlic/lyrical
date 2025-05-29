# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lyrical** is an AI-powered song creation web application built with Django. Users can generate song names using various LLM providers, manage songs through staging workflows (new → liked/disliked → generated), and create structured lyrics with AI assistance.

## Common Commands

### Development Server
```bash
python manage.py runserver
```

### Database Operations
```bash
# Reset database and run all migrations
./rebuild.sh

# Standard migration workflow
python manage.py makemigrations
python manage.py migrate
```

### CSS Development
```bash
# Watch and build Tailwind CSS
./tailwind.sh
```

### Dependency Management
```bash
# Install/update dependencies
pip install -r requirements.txt
```

### Full Development Restart
```bash
# Update dependencies, clear cache, restart server
./restart.sh
```

### Stop Server
```bash
./stop.sh
```

## Architecture Overview

### Django Structure
- **Single app architecture**: All functionality in `lyrical/` app
- **Modular views**: Each view in separate file (`page_*.py` for pages, `api_*.py` for AJAX endpoints)
- **Custom User model**: Extends AbstractUser with LLM preferences (temperature, max_tokens, default model)
- **Multi-provider LLM system**: Supports various AI providers via LiteLLM

### Key Models
- **User**: Authentication + LLM settings + API key management
- **Song**: Core entity with staging workflow (new/liked/disliked/generated)
- **LLM/LLMProvider**: Multi-provider AI model configuration
- **Message**: Conversation history for LLM context
- **Lyrics/Section**: Structured song content (verses, chorus, etc.)

### Frontend Architecture
- **Vanilla JavaScript with ES6 modules**: No build tools, modular organization
- **DaisyUI + Tailwind CSS**: Component-based styling with custom theme
- **System classes**: Reusable JavaScript systems (SelectSystem, DragDropSystem, streaming)
- **Component rendering**: Server-side component rendering via AJAX using django-cotton
- **Toast notifications**: Global error/success feedback using `util_toast.js`

### LLM Integration
- **LiteLLM**: Unified interface for multiple AI providers (Gemini, OpenAI, etc.)
- **Streaming responses**: Real-time AI interaction using NDJSON format
- **Prompt management**: YAML-based prompts with Jinja2 templating
- **Per-user API keys**: Secure provider-specific key storage

## Development Patterns

### View Organization
- Page views render full HTML templates
- API views return JSON for AJAX calls
- Generation views (`api_gen_*`) handle streaming LLM responses
- Each view file handles single responsibility

### Frontend Module System
- Import modules using: `import { functionName } from './module_name.js'`
- **API modules** (`api_*.js`): Return promises with consistent error handling
- **Utility modules** (`util_*.js`): Reusable systems (drag-drop, selection, toasts)
- **Page modules**: Coordinate feature initialization and event binding
- **Error handling**: All API calls show toast notifications on failure

### Component System
- Use django-cotton components in `templates/cotton/`
- Render components via AJAX: `api_render_component.py`
- Pass parameters through request data

### Streaming Implementation
- LLM responses use NDJSON format
- Frontend uses `util_stream_helper.js` for processing
- Handle partial responses and completion events

## Database Schema
- SQLite for development (db.sqlite3)
- Migration files track schema evolution
- Custom user model requires careful migration handling

## Authentication
- Django's built-in authentication system
- All data scoped to authenticated users
- CSRF protection required for AJAX calls

## File Organization
- Static files: `lyrical/static/lyrical/`
- Templates: `lyrical/templates/lyrical/`
- Views: `lyrical/views/`
- Services: `lyrical/services/` (LLM integration)
- Components: `lyrical/templates/cotton/`

## Key Development Notes

### API Design Pattern
- **Unified editing**: `api_song_edit` handles both name and stage updates via optional parameters
- **Promise-based**: All APIs return promises for consistent async handling
- **Error propagation**: Errors thrown by APIs are caught and displayed as toast notifications

### Interactive Systems
- **SelectSystem**: Manages card selection with configurable click-away behavior
- **DragDropSystem**: Custom drag-and-drop with ghost elements and cursor management
- **Specialized cursors**: Aggressive browser override for consistent drag cursor behavior

### Styling Architecture
- **CSS specificity management**: Uses `!important` and descendant selectors for drag cursors
- **Custom theme**: DaisyUI theme customization in `styles.css`
- **Responsive design**: Tailwind utilities with custom CSS overrides

### Toast System
- **Global error handling**: `showErrorToast()` function available globally
- **User feedback**: All API failures show user-friendly error messages
- **Animation system**: Slide-in animations with proper cleanup

### LLM Generation Pattern
- **BaseLLMGenerator**: Base class for standardized LLM API endpoints
- **Template available**: `_template_generator.py` for creating new generators
- **Structured workflow**: Parameter extraction → validation → database queries → prompt building → LLM streaming
- **Error handling**: Consistent error responses and logging throughout the pipeline

## Known Issues and Development Notes
- **NDJSON streaming**: Handle malformed JSON gracefully; corrupt responses should be ignored rather than breaking the stream
- **Duplicate handling**: LLM responses may contain duplicates; implement server-side deduplication
- **Error propagation**: Ensure LLM generation errors flow to frontend with user-friendly messages