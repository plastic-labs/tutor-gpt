from fastapi import APIRouter, HTTPException
import uuid
from honcho import NotFoundError

from api.dependencies import honcho, app

router = APIRouter(prefix="/api/messages", tags=["conversations"])


@router.get("/")
async def get_messages(user_id: str, conversation_id: uuid.UUID):
    # async with LOCK:
    # user = honcho.get_or_create_user(user_id)
    # session = user.get_session(conversation_id)
    try:
        user = honcho.apps.users.get_or_create(app_id=app.id, name=user_id)
        session = honcho.apps.users.sessions.get(
            session_id=str(conversation_id), app_id=app.id, user_id=user.id
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Item not found")
    # if session is None:
    #     raise HTTPException(status_code=404, detail="Item not found")
    # messages = list(session.get_messages_generator())
    messages = [
        {
            "id": message.id,
            "content": message.content,
            "isUser": message.is_user,
        }
        for message in honcho.apps.users.sessions.messages.list(
            app_id=app.id, user_id=user_id, session_id=str(conversation_id)
        )
    ]
    # converted_messages = [
    #     {
    #         "id": message.id,
    #         "content": message.content,
    #         "isUser": message.is_user,
    #     }
    #     for message in messages
    # ]
    return {"messages": messages}
