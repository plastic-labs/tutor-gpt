from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from common import init
from agent.chain import BloomChain
from agent.cache import Conversation
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


app = FastAPI()

origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"],
)
__, LOCK, MEDIATOR, _ = init()

class ConversationInput(BaseModel):
    conversation_id: str
    user_id: str
    message: str

@app.get("/conversations/get")
async def get_conversations(user_id: str):
    async with LOCK:
        conversations = MEDIATOR.conversations(location_id="web", user_id=user_id, single=False)
    return {
        "conversations": conversations
    }

@app.get("/conversations/delete")
async def delete_conversation(conversation_id: str):
    async with LOCK:
        MEDIATOR.delete_conversation(conversation_id)
        return

@app.get("/conversations/insert")
async def add_conversation(user_id: str, location_id: str = "web"):
    async with LOCK:
        conversation_id = MEDIATOR.add_conversation(location_id=location_id, user_id=user_id)
    return {
       "conversation_id": conversation_id
    }

@app.get("/messages")
async def get_messages(user_id: str, conversation_id: str):
    async with LOCK:
        messages = MEDIATOR.messages(user_id=user_id, session_id=conversation_id, message_type="response", limit=(False, None))
    return {
        "messages": messages
    }

@app.post("/")
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

@app.post("/stream")
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
