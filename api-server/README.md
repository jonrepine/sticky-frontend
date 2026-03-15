# Sticky LLM API Server

Standalone Node.js Express server that handles LLM operations for the Sticky frontend.

## Quick Start

```bash
# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Development (with auto-reload)
npm run dev

# Production
npm start
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `OPENAI_API_KEY` - Your OpenAI API key
- `OPENAI_MODEL` - Model to use (default: gpt-4o-mini)
- `OPENAI_ALLOW_FALLBACK` - Enable fallback cards when API fails (default: false)

## API Endpoints

- `GET /health` - Health check
- `GET /api/llm/status` - LLM configuration status
- `POST /api/llm/socratic-questions` - Generate Socratic questions
- `POST /api/llm/generate-cards` - Generate flashcards

## Railway Deployment

1. Create a new service in Railway
2. Connect to the `api-server/` directory
3. Set environment variables (OPENAI_API_KEY, etc.)
4. Deploy

The `nixpacks.toml` configuration is already set up for Railway deployment.
