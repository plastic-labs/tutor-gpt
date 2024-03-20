from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid

# from requests.exceptions import ChunkedEncodingError
from contextlib import asynccontextmanager
import asyncio

from agent.chain import BloomChain

from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles

# from langchain.schema import _message_to_dict
from honcho import Honcho, Collection
import sentry_sdk

import os
from dotenv import load_dotenv

load_dotenv()


rate = 0.2 if os.getenv("SENTRY_ENVIRONMENT") == "production" else 1.0
sentry_sdk.init(
    dsn=os.environ["SENTRY_DSN_API"], traces_sample_rate=rate, profiles_sample_rate=rate
)


# Note this URL should not have a trailing slash will cause errors

LOCK = asyncio.Lock()
honcho = Honcho("Bloom", "http://localhost:8000")


@asynccontextmanager
async def lifespan(app: FastAPI):
    honcho.initialize()
    print(honcho)
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=os.environ["URL"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConversationInput(BaseModel):
    user_id: str
    conversation_id: uuid.UUID
    message: str


class ConversationDefinition(BaseModel):
    user_id: str
    conversation_id: uuid.UUID
    name: str


async def unpack(gen):
    result = []
    async for item in gen:
        result.append(item)
    return result


@app.get("/api/test")
async def test():
    return {"test": "test"}


@app.get("/api/conversations/get")
async def get_conversations(user_id: str):
    async with LOCK:
        user = honcho.get_or_create_user(user_id)
        sessions = list(user.get_sessions_generator(is_active=True))
    acc = []
    if len(sessions) > 0:
        for convo in sessions:
            print(convo)
            instance = {}
            instance["conversation_id"] = convo.id
            instance["name"] = ""
            if convo.metadata is not None and "name" in convo.metadata.keys():
                instance["name"] = convo.metadata["name"]
            acc.append(instance)

    print(acc)
    return {"conversations": acc}


@app.get("/api/conversations/delete")
async def delete_conversation(user_id: str, conversation_id: uuid.UUID):
    async with LOCK:
        user = honcho.get_or_create_user(user_id)
        try:
            session = user.get_session(conversation_id)
            session.close()
        except Exception:
            raise HTTPException(status_code=404, detail="Item not found") from None


@app.get("/api/conversations/insert")
async def add_conversation(user_id: str, location_id: str = "web"):
    async with LOCK:
        user = honcho.get_or_create_user(user_id)
        session = user.create_session(location_id=location_id)
    return {"conversation_id": session.id}


@app.post("/api/conversations/update")
async def update_conversations(change: ConversationDefinition):
    async with LOCK:
        user = honcho.get_or_create_user(change.user_id)
        session = user.get_session(change.conversation_id)
        session.update({"name": change.name})
    return


@app.get("/api/messages")
async def get_messages(user_id: str, conversation_id: uuid.UUID):
    async with LOCK:
        user = honcho.get_or_create_user(user_id)
        session = user.get_session(conversation_id)
        messages = list(session.get_messages_generator())
        converted_messages = [
            {
                "id": message.id,
                "content": message.content,
                "isUser": message.is_user,
            }
            for message in messages
        ]
    return {"messages": converted_messages}


# @app.post("/api/chat")
# async def chat(inp: ConversationInput):
#     if inp.user_id.startswith("anon_"):
#         return HTTPException(status_code=401, detail="unauthorized please sign in")
#     async with LOCK:
# conversation = Conversation(
#     MEDIATOR, user_id=inp.user_id, conversation_id=inp.conversation_id
# )
# conversation_data = MEDIATOR.conversation(session_id=inp.conversation_id)
# if honcho_url:
#     # metadata = conversation_data["metadata"]
#     # if "A/B" in metadata.keys() and metadata["A/B"]:
#     response = requests.post(
#         f"{honcho_url}/chat",
#         json={
#             "user_id": inp.user_id,
#             "conversation_id": inp.conversation_id,
#             "message": inp.message,
#         },
#         stream=True,
#     )
#     print(response)
#     return response
# if conversation is None:
#     raise HTTPException(status_code=404, detail="Item not found")
# thought, response = await BloomChain.chat(conversation, inp.message)
# return {"thought": thought, "response": response}


@app.post("/api/stream")
async def stream(inp: ConversationInput):
    """Stream the response too the user, currently only used by the Web UI and has integration to be able to use Honcho is not anonymous"""
    if inp.user_id.startswith("anon_"):
        return HTTPException(status_code=401, detail="unauthorized please sign in")
    async with LOCK:
        user = honcho.get_or_create_user(inp.user_id)
        session = user.get_session(inp.conversation_id)

    if session is None:
        raise HTTPException(status_code=404, detail="Item not found")

    message = session.create_message(is_user=True, content=inp.message)
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
