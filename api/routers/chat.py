from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse

from api import schemas
from api.dependencies import app, honcho

from agent.chain import ThinkCall, RespondCall

import os
import logging


router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/stream")
async def stream(inp: schemas.ConversationInput):
    try:
        user = honcho.apps.users.get_or_create(app_id=app.id, name=inp.user_id)

        # Make method synchronous so it does not await the end of the calls
        def convo_turn():
            thought = ""
            response = ""
            try:
                thought_stream = ThinkCall(
                    user_input=inp.message,
                    app_id=app.id,
                    user_id=user.id,
                    session_id=str(inp.conversation_id),
                    honcho=honcho,
                ).stream()
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
                    app_id=app.id,
                    user_id=user.id,
                    session_id=str(inp.conversation_id),
                    honcho=honcho,
                    thought=thought,
                    honcho_content=honcho_content,
                ).stream()
                for chunk in response_stream:
                    response += chunk
                    yield chunk
                yield "❀"
            except Exception as e:
                logging.error(f"Error during streaming: {str(e)}")
                yield f"Error: {str(e)}"
                return

            create_messages_and_metamessages(
                app.id,
                user.id,
                inp.conversation_id,
                inp.message,
                thought,
                honcho_content,
                response,
            )

        return StreamingResponse(convo_turn())
    except Exception as e:
        logging.error(f"An error occurred: {str(e)}")
        if "rate limit" in str(e).lower():
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "Rate limit exceeded. Please try again later.",
                },
            )
        else:
            return JSONResponse(
                status_code=500,
                content={
                    "error": "internal_server_error",
                    "message": "An internal server error has occurred.",
                },
            )


def create_messages_and_metamessages(
    app_id, user_id, conversation_id, user_message, thought, honcho_content, ai_response
):
    try:
        # These operations will use the DB layer's built-in retry logic
        new_user_message = honcho.apps.users.sessions.messages.create(
            is_user=True,
            session_id=str(conversation_id),
            app_id=app_id,
            user_id=user_id,
            content=user_message,
        )
        # save constructed thought as a user metamessage
        thought_metamessage = f"""<honcho-response>{honcho_content}</honcho-response>\n<bloom>{ai_response}</bloom>\n{user_message}"""
        honcho.apps.users.sessions.metamessages.create(
            app_id=app_id,
            user_id=user_id,
            session_id=str(conversation_id),
            message_id=new_user_message.id,
            metamessage_type="thought",
            content=thought_metamessage,
            metadata={"type": "user"},
        )
        # save bloom's response
        new_ai_message = honcho.apps.users.sessions.messages.create(
            is_user=False,
            session_id=str(conversation_id),
            app_id=app_id,
            user_id=user_id,
            content=ai_response,
        )
        # save thought (honcho query) as metamessage
        honcho.apps.users.sessions.metamessages.create(
            session_id=str(conversation_id),
            app_id=app_id,
            user_id=user_id,
            content=thought,
            message_id=new_ai_message.id,
            metamessage_type="thought",
            metadata={"type": "assistant"},
        )
        # save constructed response as a metamessage
        response_metamessage = (
            f"""<honcho-response>{honcho_content}</honcho-response>\n{user_message}"""
        )
        honcho.apps.users.sessions.metamessages.create(
            app_id=app_id,
            user_id=user_id,
            session_id=str(conversation_id),
            message_id=new_ai_message.id,
            metamessage_type="response",
            content=response_metamessage,
        )
    except Exception as e:
        logging.error(f"Error in create_messages_and_metamessages: {str(e)}")
        raise  # Re-raise the exception to be handled by the caller


@router.get("/thought/{message_id}")
async def get_thought(conversation_id: str, message_id: str, user_id: str):
    user = honcho.apps.users.get_or_create(app_id=app.id, name=user_id)
    try:
        thought = honcho.apps.users.sessions.metamessages.list(
            session_id=conversation_id,
            app_id=app.id,
            user_id=user.id,
            message_id=message_id,
            metamessage_type="thought",
            filter={"type": "assistant"},
        )
        print(thought)
    except Exception as e:
        logging.error(f"Error in get_thought: {str(e)}")
        raise  # Re-raise the exception to be handled by the caller
    # In practice, there should only be one thought per message
    return {"thought": thought.items[0].content if thought.items else None}
