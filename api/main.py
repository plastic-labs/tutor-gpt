from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from common import init
from agent.chain import BloomChain
from agent.cache import Conversation
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles

from langchain.schema import _message_to_dict

import os
from dotenv import load_dotenv

load_dotenv()

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
        conversation_id = MEDIATOR.add_conversation(location_id=location_id, user_id=user_id)
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
    if conversation is None:
        raise HTTPException(status_code=404, detail="Item not found")
    thought, response = await BloomChain.chat(conversation, inp.message)
    return {
        "thought": thought,
        "response": response
    }

@app.post("/api/stream")
async def stream(inp: ConversationInput):
    async with LOCK:
        conversation = Conversation(MEDIATOR, user_id=inp.user_id, conversation_id=inp.conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Item not found")
    print()
    print()
    print("local chain", conversation.messages("thought"), conversation.messages("response"))
    print()
    print()


    async def thought_and_response():
        thought_iterator = BloomChain.think(conversation, inp.message)
        thought = ""
        async for item in thought_iterator:
            # escape ❀ if present
            item = item.replace("❀", "🌸")
            thought += item
            yield item
        yield "❀"
        response_iterator = BloomChain.respond(conversation, thought, inp.message)
        async for item in response_iterator:
            # if "❀" in item:
            item = item.replace("❀", "🌸")
            yield item

    return StreamingResponse(thought_and_response())

# app.mount("/", StaticFiles(directory="www/out", html=True), name="static")
