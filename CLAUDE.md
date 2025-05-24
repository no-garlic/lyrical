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
- **DaisyUI + Tailwind CSS**: Component-based styling
- **System classes**: Reusable JavaScript systems (SelectSystem, drag-drop, streaming)
- **Component rendering**: Server-side component rendering via AJAX using django-cotton

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
- API modules in `api_*.js` handle backend communication
- Utility modules (`util_*.js`) provide reusable functionality
- Page modules coordinate feature initialization

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