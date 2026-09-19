from typing import Dict, List, Optional
import uuid

_conversations: Dict[str, List[dict]] = {}

def get_or_create(conversation_id: Optional[str]):
    if conversation_id and conversation_id in _conversations:
        return conversation_id, _conversations[conversation_id]
    new_id = conversation_id or str(uuid.uuid4())
    _conversations[new_id] = []
    return new_id, _conversations[new_id]

def save(conversation_id: str, messages: list):
    _conversations[conversation_id] = messages