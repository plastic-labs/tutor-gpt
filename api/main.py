from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from common import init
from agent.chain import BloomChain
from agent.cache import LayeredLRUConversationCache, Conversation
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware


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
CACHE, LOCK, _ = init(cache_type="Conversation")

class ConversationInput(BaseModel):
    conversation_id: str
    user_id: str
    message: str

@app.get("/conversations/get")
async def get_conversations(user_id: str):
    async with LOCK:
        conversations = CACHE.mediator.conversations(location_id="web", user_id=user_id, single=False)
    return {
        "conversations": conversations
    }

@app.get("/conversations/delete")
async def delete_conversation(conversation_id: str):
    async with LOCK:
        CACHE.hard_delete(user_id, conversation_id)
        return

@app.get("/conversations/insert")
async def add_conversation(user_id: str, location_id: str = "web"):
    async with LOCK:
        conversation = CACHE.put(location_id=location_id, user_id=user_id)
    return {
       "conversation_id": conversation.conversation_id
    }

@app.post("/")
async def chat(inp: ConversationInput):
    async with LOCK:
        conversation = CACHE.get(user_id=inp.user_id, conversation_id=inp.conversation_id)
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
        conversation = CACHE.get(user_id=inp.user_id, conversation_id=inp.conversation_id)
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
