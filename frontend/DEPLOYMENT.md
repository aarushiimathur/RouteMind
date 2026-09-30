# Route Agent Deployment

## Recommended production architecture

- Frontend: Vercel or Netlify
- FastAPI backend: Render or Railway
- Database + Google OAuth: Supabase
- Gemini, TomTom and OpenTripMap keys: backend environment variables only

## Frontend environment variables

Set these in the frontend host:

```env
VITE_API_URL=https://YOUR-BACKEND-DOMAIN
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Do not use `http://localhost:8000` after deployment.

## Backend

Deploy the existing FastAPI project separately. Configure:

```env
GEMINI_API_KEY=...
OPENTRIPMAP_API_KEY=...
TOMTOM_API_KEY=...
```

Run with a production server command such as:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## CORS

The FastAPI backend must allow the deployed frontend origin, for example:

```python
allow_origins=[
    "https://your-route-agent-domain.com",
]
```

For local development, also allow the local frontend origin, such as `http://localhost:5173`.

## Supabase Google OAuth

In Supabase Authentication settings, configure Google as a provider and add the production frontend URL to the allowed redirect URLs.

## Local development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
uvicorn main:app --reload --port 8000
```

Then keep:

```env
VITE_API_URL=http://localhost:8000
```

## Chat error diagnosis

The frontend now exposes the FastAPI HTTP status and backend `detail`/`message` instead of only showing a generic error. If the backend returns 500, the toast will show the actual FastAPI error, making the remaining issue much easier to fix.
