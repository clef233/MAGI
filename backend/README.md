# MAGI Backend

Multi-Agent Guided Intelligence - Debate System Backend

## Setup

```bash
# Install dependencies
pip install -e .

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

Create a `.env` file:

```
DATABASE_URL=sqlite+aiosqlite:///./magi.db
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:3000
```

## API Endpoints

- `GET /api/actors` - List all actors
- `POST /api/actors` - Create actor
- `GET /api/actors/:id` - Get actor details
- `PUT /api/actors/:id` - Update actor
- `DELETE /api/actors/:id` - Delete actor
- `POST /api/actors/:id/test` - Test actor connection

- `POST /api/debate/start` - Start new debate
- `GET /api/debate/:id/stream` - SSE stream for debate
- `POST /api/debate/:id/stop` - Stop debate
- `GET /api/debate/:id` - Get debate details

- `GET /api/sessions` - List debate sessions
- `DELETE /api/sessions/:id` - Delete session

- `GET /api/presets/actors` - Get preset actor templates
- `GET /api/presets/prompts` - Get preset prompt templates