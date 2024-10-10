from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse

from api import schemas
from api.dependencies import app, honcho

from agent.chain import ThinkCall, RespondCall

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/stream")
async def stream(inp: schemas.ConversationInput):
    """Stream the response to the user, currently only used by the Web UI and has integration to be able to use Honcho if not anonymous"""
    try:
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
    except Exception as e:
        # Log the error here if needed
        if "rate limit" in str(e).lower():
            return JSONResponse(
                status_code=429,
                content={"error": "rate_limit_exceeded", "message": str(e)}
            )
        else:
            return JSONResponse(
                status_code=500,
                content={"error": "internal_server_error", "message": str(e)}
            )


@router.get("/thought/{message_id}")
async def get_thought(conversation_id: str, message_id: str, user_id: str):
    try:
        user = honcho.apps.users.get_or_create(app_id=app.id, name=user_id)
        thought = honcho.apps.users.sessions.metamessages.list(
            session_id=conversation_id,
            app_id=app.id,
            user_id=user.id,
            message_id=message_id,
            metamessage_type="thought",
        )
        # In practice, there should only be one thought per message
        return {"thought": thought.items[0].content if thought.items else None}
    except Exception as e:
        # Log the error here if needed
        return JSONResponse(
            status_code=500,
            content={"error": "internal_server_error", "message": str(e)}
        )
