from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from api import schemas
from api.dependencies import app, honcho

from agent.chain import ThinkCall, RespondCall

import os


router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/stream")
async def stream(
    inp: schemas.ConversationInput,
):
    """Stream the response too the user, currently only used by the Web UI and has integration to be able to use Honcho is not anonymous"""
    user = honcho.apps.users.get_or_create(app_id=app.id, name=inp.user_id)

    async def convo_turn():
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

        # dialectic
        honcho_response = honcho.apps.users.sessions.chat(
            app_id=app.id,
            user_id=user.id,
            session_id=str(inp.conversation_id),
            queries=thought,
        )
        honcho_content = honcho_response.content


        yield "❀"
        response_stream = RespondCall(
            user_input=inp.message,
            thought=thought,
            app_id=app.id,
            user_id=user.id,
            session_id=str(inp.conversation_id),
            honcho=honcho,
            honcho_content=honcho_content,
        ).stream()
        response = ""
        for chunk in response_stream:
            response += chunk
            yield chunk
        yield "❀"

        user_message = honcho.apps.users.sessions.messages.create(
            is_user=True,
            session_id=str(inp.conversation_id),
            app_id=app.id,
            user_id=user.id,
            content=inp.message,
        )
        thought_metamessage = f"""<honcho-response>{honcho_content}</honcho-response>\n<bloom>{response}</bloom>\n{inp.message}"""
        honcho.apps.users.sessions.metamessages.create(
            app_id=app.id,
            user_id=user.id,
            session_id=str(inp.conversation_id),
            message_id=user_message.id,
            metamessage_type="thought",
            content=thought_metamessage,
            metadata={"type": "user"}
        )
        # save thought (honcho query) as metamessage
        honcho.apps.users.sessions.metamessages.create(
            session_id=str(inp.conversation_id),
            app_id=app.id,
            user_id=user.id,
            content=f"<honcho>{honcho_content}</honcho>",
            message_id=user_message.id,
            metamessage_type="thought",
            metadata={"type": "assistant"}
        )
        # save bloom's response
        bloom_message = honcho.apps.users.sessions.messages.create(
            session_id=str(inp.conversation_id),
            app_id=app.id,
            user_id=user.id,
            content=response,
            is_user=False,
        )
        response_metamessage = f"""<honcho-response>{honcho_content}</honcho-response>\n{inp.message}"""
        honcho.apps.users.sessions.metamessages.create(
            app_id=app.id,
            user_id=user.id,
            session_id=str(inp.conversation_id),
            message_id=bloom_message.id,
            metamessage_type="response",
            content=response_metamessage,
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
