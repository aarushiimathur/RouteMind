<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Route Agent architecture rules

- The FastAPI backend (RouteMind) owns all AI, routing, POI and traffic logic. The React app only calls `POST {VITE_API_URL}/chat` via `src/lib/route-agent-api.ts` — never re-implement planning or call travel APIs from the frontend, so provider keys stay server-side.
- Assistant replies are plain text in the backend's fixed format; `src/lib/itinerary.ts` parses them and anything unrecognised renders as prose. Never synthesise trip data in the frontend.
- Chat/trip persistence lives in Lovable Cloud (`conversations`, `messages`, `trips`, `profiles`) with RLS scoped to `auth.uid()`; the `conversation_id` returned by FastAPI is stored as the conversation row id so backend and database stay aligned.
