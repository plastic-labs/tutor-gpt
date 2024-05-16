from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import uuid
import schemas

from dependencies import LOCK, honcho, app
from fastapi.responses import StreamingResponse
from honcho.types.apps.users import Collection

from agent.chain import BloomChain

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/stream")
async def stream(inp: schemas.ConversationInput):
    """Stream the response too the user, currently only used by the Web UI and has integration to be able to use Honcho is not anonymous"""
    if inp.user_id.startswith("anon_"):
        return HTTPException(status_code=401, detail="unauthorized please sign in")
    # async with LOCK:
    # user = honcho.get_or_create_user(inp.user_id)
    session = honcho.apps.users.sessions.get(
        session_id=str(inp.conversation_id), app_id=app.id, user_id=inp.user_id
    )
    # session = user.get_session(inp.conversation_id)

    if session is None:
        raise HTTPException(status_code=404, detail="Item not found")

    # message = session.create_message(is_user=True, content=inp.message)
    collection: Collection
    try:
        collection = user.get_collection("Bloom")
        if not collection:
            collection = user.create_collection("Bloom")
    except Exception:
        collection = user.create_collection("Bloom")

    async def thought_and_response():
        try:
            uptr = session.get_metamessages(
                metamessage_type="user_prediction_thought_revision",
                page=1,
                page_size=10,
                reverse=True,
            ).items
            if len(uptr) > 0:
                user_prediction_thought_revision = uptr[0].content

                voe_thought = await BloomChain.think_violation_of_expectation(
                    session, message, user_prediction_thought_revision
                )
                voe_facts = await BloomChain.violation_of_expectation(
                    session, message, user_prediction_thought_revision, voe_thought
                )

                if not voe_facts or voe_facts[0] == "None":
                    pass
                else:
                    await BloomChain.check_voe_list(session, collection, voe_facts)

            thought_iterator = BloomChain.think(session, message)

            thought = ""
            async for item in thought_iterator:
                # escape ❀ if present
                item = item.replace("❀", "🌸")  # type: ignore
                thought += item
                yield item
            yield "❀Thought❀"

            thought_revision_iterator = BloomChain.revise_thought(
                session, collection, message, thought
            )

            thought_revision = ""
            async for item in thought_revision_iterator:
                # escape ❀ if present
                item = item.replace("❀", "🌸")  # type: ignore
                thought_revision += item
                yield item
            yield "❀Thought Revision❀"

            response_iterator = BloomChain.respond(session, thought_revision, message)
            async for item in response_iterator:
                # if "❀" in item:
                item = item.replace("❀", "🌸")  # type: ignore
                yield item
            yield "❀Response❀"

            user_prediction_thought = await BloomChain.think_user_prediction(
                session, message
            )
            yield user_prediction_thought
            yield "❀User Prediction Thought❀"
            user_prediction_thought_revision = (
                await BloomChain.revise_user_prediction_thought(
                    session, collection, message, user_prediction_thought
                )
            )
            yield user_prediction_thought
            yield "❀User Prediction Thought Revision❀"
        finally:
            yield "❀Done❀"

    return StreamingResponse(thought_and_response())
