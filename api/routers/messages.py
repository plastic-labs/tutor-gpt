from fastapi import APIRouter, HTTPException
import uuid
from honcho import NotFoundError

from api.dependencies import honcho, app

router = APIRouter(prefix="/api/messages", tags=["conversations"])


@router.get("")
async def get_messages(user_id: str, conversation_id: uuid.UUID):
    try:
        user = honcho.apps.users.get_or_create(app_id=app.id, name=user_id)
        session = honcho.apps.users.sessions.get(
            session_id=str(conversation_id), app_id=app.id, user_id=user.id
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Item not found")
    messages = [
        {
            "id": message.id,
            "content": message.content,
            "isUser": message.is_user,
        }
        for message in honcho.apps.users.sessions.messages.list(
            app_id=app.id, user_id=user.id, session_id=str(conversation_id)
        )
    ]
    return {"messages": messages}
