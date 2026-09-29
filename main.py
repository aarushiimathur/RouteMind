from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from services.groq_client import run_chat_turn
from services.conversation_store import get_or_create, save


app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent


@app.get("/")
def home():
    return FileResponse(BASE_DIR / "test.html")


# Allow the temporary test UI to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(req: ChatRequest):

    conversation_id, history = get_or_create(req.conversation_id)

    history = history + [
        {
            "role": "user",
            "content": req.message
        }
    ]

    updated = await run_chat_turn(history)

    save(conversation_id, updated)

    # Get the latest assistant response.
    # This prevents raw tool results from being returned.
    reply = ""

    for message in reversed(updated):
        if message.get("role") == "assistant":
            content = message.get("content")

            if content:
                reply = content
                break

    return {
        "conversation_id": conversation_id,
        "reply": reply
    }