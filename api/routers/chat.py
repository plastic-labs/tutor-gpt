import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from honcho.types.apps.users import Collection
from pydantic import BaseModel

# from agent.chain import BloomChain
from api import schemas
from api.dependencies import LOCK, app, honcho

from agent.chain import ThinkCall, RespondCall

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/stream")
async def stream(
    request: Request,
    inp: schemas.ConversationInput,
):
    """Stream the response too the user, currently only used by the Web UI and has integration to be able to use Honcho is not anonymous"""
    # Get User
    user = honcho.apps.users.get_or_create(app_id=app.id, name=inp.user_id)
    # session = honcho.apps.users.sessions.get(
    #     app_id=app.id, user_id=user.id, session_id=str(inp.conversation_id)
    # )

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
    # Get Session
    # Get Thought
    # Get Response
    # return
    #     # user = honcho.get_or_create_user(inp.user_id)
    #     session = honcho.apps.users.sessions.get(
    #         session_id=str(inp.conversation_id), app_id=app.id, user_id=inp.user_id
    # pass


# @router.post("/stream")
# async def stream(inp: schemas.ConversationInput):
#     """Stream the response too the user, currently only used by the Web UI and has integration to be able to use Honcho is not anonymous"""
#     if inp.user_id.startswith("anon_"):
#         return HTTPException(status_code=401, detail="unauthorized please sign in")
#     # async with LOCK:
#     # user = honcho.get_or_create_user(inp.user_id)
#     session = honcho.apps.users.sessions.get(
#         session_id=str(inp.conversation_id), app_id=app.id, user_id=inp.user_id
#     )
#     # session = user.get_session(inp.conversation_id)

#     if session is None:
#         raise HTTPException(status_code=404, detail="Item not found")

#     # message = session.create_message(is_user=True, content=inp.message)
#     collection: Collection
#     try:
#         collection = user.get_collection("Bloom")
#         if not collection:
#             collection = user.create_collection("Bloom")
#     except Exception:
#         collection = user.create_collection("Bloom")

#     async def thought_and_response():
#         try:
#             uptr = session.get_metamessages(
#                 metamessage_type="user_prediction_thought_revision",
#                 page=1,
#                 page_size=10,
#                 reverse=True,
#             ).items
#             if len(uptr) > 0:
#                 user_prediction_thought_revision = uptr[0].content

#                 voe_thought = await BloomChain.think_violation_of_expectation(
#                     session, message, user_prediction_thought_revision
#                 )
#                 voe_facts = await BloomChain.violation_of_expectation(
#                     session, message, user_prediction_thought_revision, voe_thought
#                 )

#                 if not voe_facts or voe_facts[0] == "None":
#                     pass
#                 else:
#                     await BloomChain.check_voe_list(session, collection, voe_facts)

#             thought_iterator = BloomChain.think(session, message)

#             thought = ""
#             async for item in thought_iterator:
#                 # escape ❀ if present
#                 item = item.replace("❀", "🌸")  # type: ignore
#                 thought += item
#                 yield item
#             yield "❀Thought❀"

#             thought_revision_iterator = BloomChain.revise_thought(
#                 session, collection, message, thought
#             )

#             thought_revision = ""
#             async for item in thought_revision_iterator:
#                 # escape ❀ if present
#                 item = item.replace("❀", "🌸")  # type: ignore
#                 thought_revision += item
#                 yield item
#             yield "❀Thought Revision❀"

#             response_iterator = BloomChain.respond(session, thought_revision, message)
#             async for item in response_iterator:
#                 # if "❀" in item:
#                 item = item.replace("❀", "🌸")  # type: ignore
#                 yield item
#             yield "❀Response❀"

#             user_prediction_thought = await BloomChain.think_user_prediction(
#                 session, message
#             )
#             yield user_prediction_thought
#             yield "❀User Prediction Thought❀"
#             user_prediction_thought_revision = (
#                 await BloomChain.revise_user_prediction_thought(
#                     session, collection, message, user_prediction_thought
#                 )
#             )
#             yield user_prediction_thought
#             yield "❀User Prediction Thought Revision❀"
#         finally:
#             yield "❀Done❀"

#     return StreamingResponse(thought_and_response())
