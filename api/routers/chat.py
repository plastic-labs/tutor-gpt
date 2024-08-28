from fastapi import APIRouter
from fastapi.responses import StreamingResponse

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
            thought += chunk.content
            yield chunk.content

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
            response += chunk.content
            yield chunk.content
        yield "❀"

        new_message = honcho.apps.users.sessions.messages.create(
            is_user=True,
            session_id=str(inp.conversation_id),
            app_id=app.id,
            user_id=user.id,
            content=inp.message,
        )
        honcho.apps.users.sessions.metamessages.create(
            app_id=app.id,
            session_id=str(inp.conversation_id),
            user_id=user.id,
            message_id=new_message.id,
            metamessage_type="thought",
            content=thought,
        )
        honcho.apps.users.sessions.messages.create(
            is_user=False,
            session_id=str(inp.conversation_id),
            app_id=app.id,
            user_id=user.id,
            content=response,
        )

    return StreamingResponse(convo_turn())
