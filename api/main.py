import os
import random

import requests
import sentry_sdk
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# from fastapi.staticfiles import StaticFiles
from langchain.schema import _message_to_dict
from pydantic import BaseModel
from requests.exceptions import ChunkedEncodingError

from agent.cache import Conversation
from agent.chain import BloomChain
from common import init

load_dotenv()

rate = 0.2 if os.getenv("SENTRY_ENVIRONMENT") == "production" else 1.0
sentry_sdk.init(
    dsn=os.environ['SENTRY_DSN_API'],
    traces_sample_rate=rate,
    profiles_sample_rate=rate
)

app = FastAPI()

# Note this URL should not have a trailing slash will cause errors

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=os.environ['URL'],
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"],
)
__, LOCK, MEDIATOR, _ = init()

honcho_url = os.getenv("HONCHO_URL")

class ConversationInput(BaseModel):
    conversation_id: str
    user_id: str
    message: str

class ConversationDefinition(BaseModel):
    conversation_id: str
    name: str 

@app.get("/api/test")
async def test():
    return {"test": "test"}

@app.get("/api/conversations/get")
async def get_conversations(user_id: str):
    async with LOCK:
        conversations = MEDIATOR.conversations(location_id="web", user_id=user_id, single=False)
    acc = []
    if conversations:
        for convo in conversations:
           instance = {}
           instance["conversation_id"] = convo["id"]
           instance["name"] = ""
           if convo["metadata"] is not None and "name" in convo["metadata"].keys():
               instance["name"] = convo["metadata"]["name"]
           acc.append(instance)
        
    return {
        "conversations": acc
    }

@app.get("/api/conversations/delete")
async def delete_conversation(conversation_id: str):
    async with LOCK:
        MEDIATOR.delete_conversation(conversation_id)
        return

@app.get("/api/conversations/insert")
async def add_conversation(user_id: str, location_id: str = "web"):
    async with LOCK:
        metadata = {"A/B": False}
        if not user_id.startswith("anon_"):
            # metadata["A/B"] = bool(random.getrandbits(1))
            metadata["A/B"] = True
        representation = MEDIATOR.add_conversation(location_id=location_id, user_id=user_id, metadata=metadata)
        conversation_id = representation["id"]
    return {
       "conversation_id": conversation_id
    }

@app.post("/api/conversations/update")
async def update_conversations(change: ConversationDefinition):
    async with LOCK:
        MEDIATOR.update_conversation(conversation_id=change.conversation_id, metadata={"name": change.name})
    return 

@app.get("/api/messages")
async def get_messages(user_id: str, conversation_id: str):
    async with LOCK:
        messages = MEDIATOR.messages(user_id=user_id, session_id=conversation_id, message_type="response", limit=(False, None))
        converted_messages = [_message_to_dict(_message) for _message in messages]
    return {
        "messages": converted_messages
    }

@app.post("/api/chat")
async def chat(inp: ConversationInput):
    async with LOCK:
        conversation = Conversation(MEDIATOR, user_id=inp.user_id, conversation_id=inp.conversation_id)
        conversation_data = MEDIATOR.conversation(session_id=inp.conversation_id)
    if honcho_url and conversation_data and conversation_data["metadata"]: 
        metadata = conversation_data["metadata"]
        if "A/B" in metadata.keys() and metadata["A/B"]:
            response = requests.post(f'{honcho_url}/chat', json={
                "user_id": inp.user_id,
                "conversation_id": inp.conversation_id,
                "message": inp.message
                }, stream=True)
            print(response)
            return response
    if conversation is None:
        raise HTTPException(status_code=404, detail="Item not found")
    thought, response = await BloomChain.chat(conversation, inp.message)
    return {
        "thought": thought,
        "response": response
    }


@app.post("/api/stream")
async def stream(inp: ConversationInput):
    """Stream the response too the user, currently only used by the Web UI and has integration to be able to use Honcho is not anonymous"""
    async with LOCK:
        conversation = Conversation(MEDIATOR, user_id=inp.user_id, conversation_id=inp.conversation_id)
        conversation_data = MEDIATOR.conversation(session_id=inp.conversation_id)
    if honcho_url and not inp.user_id.startswith("anon_") and conversation_data and conversation_data["metadata"]: 
        metadata = conversation_data["metadata"]
        if "A/B" in metadata.keys() and metadata["A/B"]:
            response = requests.post(f'{honcho_url}/stream', json={
                "user_id": inp.user_id,
                "conversation_id": inp.conversation_id,
                "message": inp.message
                }, stream=True)

            def generator():
                try:
                    for chunk in response.iter_content(chunk_size=8192):
                        # print(f"Received chunk: {chunk}")
                        if chunk:
                            yield chunk
                except ChunkedEncodingError as e:
                    print(f"Chunked encoding error occurred: {e}")
                    print(response)
                    print(response.headers)
                    # Optionally yield an error message to the client
                    yield b"An error occurred while streaming the response."
                except Exception as e:
                    print(f"An unexpected error occurred: {e}")
                    # Optionally yield an error message to the client
                    yield b"An unexpected error occurred."

            print("A/B Confirmed")
            return StreamingResponse(generator())
    if conversation is None:
        raise HTTPException(status_code=404, detail="Item not found")

    async def thought_and_response():
        try: 
            thought_iterator = await BloomChain.think(conversation, inp.message)
            thought = ""
            async for item in thought_iterator:
                # escape ❀ if present
                item = item.replace("❀", "🌸")
                thought += item
                yield item
            yield "❀"

            response_iterator = await BloomChain.respond(conversation, thought, inp.message)
            async for item in response_iterator:
                # if "❀" in item:
                item = item.replace("❀", "🌸")
                yield item

            await BloomChain.think_user_prediction(conversation)
        except Exception as e:
            import traceback
            stack_trace = traceback.format_exc()
            print("====================")
            print("Exception")
            print(e)
            print(stack_trace)
            print("====================")
            yield "!!!!! Sorry an error occurred. Please try again. !!!!!"
        finally:
            yield "❀"
    return StreamingResponse(thought_and_response())

