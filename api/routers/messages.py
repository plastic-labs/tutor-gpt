from fastapi import APIRouter, HTTPException, Depends
from honcho import NotFoundError

from api.dependencies import honcho, app
from api.security import get_current_user

router = APIRouter(prefix="/api/messages", tags=["conversations"])


@router.get("")
async def get_messages(
    user_id: str, conversation_id: str, current_user=Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this resource"
        )

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
            "metadata": message.metadata,
        }
        for message in honcho.apps.users.sessions.messages.list(
            app_id=app.id, user_id=user.id, session_id=session.id
        )
    ]
    return {"messages": messages}
