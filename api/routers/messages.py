from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import uuid
import schemas

from dependencies import LOCK, honcho

router = APIRouter(prefix="/api/messages", tags=["conversations"])


@router.get("/")
async def get_messages(user_id: str, conversation_id: uuid.UUID):
    async with LOCK:
        user = honcho.get_or_create_user(user_id)
        session = user.get_session(conversation_id)
        messages = list(session.get_messages_generator())
        converted_messages = [
            {
                "id": message.id,
                "content": message.content,
                "isUser": message.is_user,
            }
            for message in messages
        ]
    return {"messages": converted_messages}
