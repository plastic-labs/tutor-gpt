from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid
import requests
from requests.exceptions import ChunkedEncodingError
from contextlib import asynccontextmanager
import asyncio

# from common import init
from agent.chain import BloomChain

# from agent.cache import Conversation
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles

from langchain.schema import _message_to_dict
from honcho import Honcho, User, Session
import sentry_sdk

import os
import random
from dotenv import load_dotenv

load_dotenv()


rate = 0.2 if os.getenv("SENTRY_ENVIRONMENT") == "production" else 1.0
sentry_sdk.init(
    dsn=os.environ["SENTRY_DSN_API"], traces_sample_rate=rate, profiles_sample_rate=rate
)


# Note this URL should not have a trailing slash will cause errors

# __, LOCK, MEDIATOR, _ = init()

# honcho_url = os.getenv("HONCHO_URL")

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
        # conversations = MEDIATOR.conversations(
        #     location_id="web", user_id=user_id, single=False
        # )
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
        # representation = MEDIATOR.add_conversation(
        #     location_id=location_id, user_id=user_id
        # )
        # conversation_id = representation["id"]
    return {"conversation_id": session.id}


@app.post("/api/conversations/update")
async def update_conversations(change: ConversationDefinition):
    async with LOCK:
        user = honcho.get_or_create_user(change.user_id)
        session = user.get_session(change.conversation_id)
        session.update({"name": change.name})
        # MEDIATOR.update_conversation(
        #     conversation_id=change.conversation_id, metadata={"name": change.name}
        # )
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
        # messages = MEDIATOR.messages(
        #     user_id=user_id,
        #     session_id=conversation_id,
        #     message_type="response",
        #     limit=(False, None),
        # )
        # converted_messages = [_message_to_dict(_message) for _message in messages]
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

        # conversation = Conversation(
        #     MEDIATOR, user_id=inp.user_id, conversation_id=inp.conversation_id
        # )
        # conversation_data = MEDIATOR.conversation(session_id=inp.conversation_id)
    # if honcho_url and not inp.user_id.startswith("anon_"):
    #     # metadata = conversation_data["metadata"]
    #     # if "A/B" in metadata.keys() and metadata["A/B"]:
    #     response = requests.post(f'{honcho_url}/stream', json={
    #         "user_id": inp.user_id,
    #         "conversation_id": inp.conversation_id,
    #         "message": inp.message
    #         }, stream=True)

    #     def generator():
    #         try:
    #             for chunk in response.iter_content(chunk_size=8192):
    #                 # print(f"Received chunk: {chunk}")
    #                 if chunk:
    #                     yield chunk
    #         except ChunkedEncodingError as e:
    #             print(f"Chunked encoding error occurred: {e}")
    #             print(response)
    #             print(response.headers)
    #             # Optionally yield an error message to the client
    #             yield b"An error occurred while streaming the response."
    #         except Exception as e:
    #             print(f"An unexpected error occurred: {e}")
    #             # Optionally yield an error message to the client
    #             yield b"An unexpected error occurred."

    #     return StreamingResponse(generator())
    if session is None:
        raise HTTPException(status_code=404, detail="Item not found")

    message = session.create_message(is_user=True, content=inp.message)

    async def thought_and_response():
        try:
            thought_iterator = BloomChain.think(session, message)
            thought = ""
            async for item in thought_iterator:
                # escape ❀ if present
                item = item.replace("❀", "🌸")
                thought += item
                yield item
            yield "❀"
            response_iterator = BloomChain.respond(session, thought, message)

            async for item in response_iterator:
                # if "❀" in item:
                item = item.replace("❀", "🌸")
                yield item

            await BloomChain.think_user_prediction(session, message)
        finally:
            yield "❀"

    return StreamingResponse(thought_and_response())
