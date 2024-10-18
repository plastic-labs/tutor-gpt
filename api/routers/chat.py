from typing import Optional
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api import schemas
from api.dependencies import app, honcho

from agent.chain import ThinkCall, RespondCall

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/stream")
async def stream(
    inp: schemas.ConversationInput,
):
    """Stream the response too the user, currently only used by the Web UI and has integration to be able to use Honcho is not anonymous"""
    user = honcho.apps.users.get_or_create(app_id=app.id, name=inp.user_id)

    def convo_turn():
        thought_stream = ThinkCall(
            user_input=inp.message,
            app_id=app.id,
            user_id=user.id,
            session_id=str(inp.conversation_id),
            honcho=honcho,
        ).stream()
        thought = ""
        for chunk in thought_stream:
            thought += chunk
            yield chunk

        yield "❀"
        response_stream = RespondCall(
            user_input=inp.message,
            thought=thought,
            app_id=app.id,
            user_id=user.id,
            session_id=str(inp.conversation_id),
            honcho=honcho,
        ).stream()
        response = ""
        for chunk in response_stream:
            response += chunk
            yield chunk
        yield "❀"

        honcho.apps.users.sessions.messages.create(
            is_user=True,
            session_id=str(inp.conversation_id),
            app_id=app.id,
            user_id=user.id,
            content=inp.message,
        )
        new_ai_message = honcho.apps.users.sessions.messages.create(
            is_user=False,
            session_id=str(inp.conversation_id),
            app_id=app.id,
            user_id=user.id,
            content=response,
        )
        honcho.apps.users.sessions.metamessages.create(
            app_id=app.id,
            session_id=str(inp.conversation_id),
            user_id=user.id,
            message_id=new_ai_message.id,
            metamessage_type="thought",
            content=thought,
        )
    return StreamingResponse(convo_turn())

@router.get("/thought/{message_id}")
async def get_thought(conversation_id: str, message_id: str, user_id: str):
    user = honcho.apps.users.get_or_create(app_id=app.id, name=user_id)
    thought = honcho.apps.users.sessions.metamessages.list(
        session_id=conversation_id,
        app_id=app.id,
        user_id=user.id,
        message_id=message_id,
        metamessage_type="thought"
    )
    # In practice, there should only be one thought per message
    return {"thought": thought.items[0].content if thought.items else None}

class ReactionBody(BaseModel):
    reaction: Optional[str] = None

@router.post("/reaction/{message_id}")
async def add_or_remove_reaction(
    conversation_id: str,
    message_id: str,
    user_id: str,
    body: ReactionBody
):
    reaction = body.reaction

    if reaction is not None and reaction not in ["thumbs_up", "thumbs_down"]:
        raise HTTPException(status_code=400, detail="Invalid reaction type")

    user = honcho.apps.users.get_or_create(app_id=app.id, name=user_id)

    message = honcho.apps.users.sessions.messages.get(
        app_id=app.id,
        session_id=conversation_id,
        user_id=user.id,
        message_id=message_id
    )

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    metadata = message.metadata or {}

    if reaction is None:
        metadata.pop('reaction', None)
    else:
        metadata['reaction'] = reaction

    honcho.apps.users.sessions.messages.update(
        app_id=app.id,
        session_id=conversation_id,
        user_id=user.id,
        message_id=message_id,
        metadata=metadata
    )

    return {"status": "Reaction updated successfully"}
