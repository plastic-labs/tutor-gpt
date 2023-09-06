from fastapi import FastAPI
from pydantic import BaseModel

from common import init
from agent.chain import BloomChain
from agent.cache import LayeredLRUConversationCache
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
    message: str

@app.get("/conversations/get")
async def get_conversations(user_id: str):
    async with LOCK:
        conversations = await CACHE.mediator.conversations(location_id="web", user_id=user_id, single=False)
    return conversations

@app.get("/conversations/delete/{conversation_id}")
async def delete_conversation(conversation_id: str):
    async with LOCK:
        await CACHE.hard_delete(user_id, conversation_id)
        return

@app.post("/conversations/insert")
async def add_conversation(user_id: str, location_id: str = "web"):
    async with LOCK:
        conversation_id = CACHE.put(location_id=location_id, user_id=user_id)
    return conversation_id

@app.post("/")
async def chat(inp: ConversationInput):
    local_chain = CACHE.get("web_" + inp.conversation_id)
    if local_chain is None:
        local_chain = ConversationCache(MEDIATOR)
        local_chain.user_id = "web_" + inp.conversation_id
        CACHE.put("web_" + inp.conversation_id, local_chain)
    thought, response = await BloomChain.chat(local_chain, inp.message)
    return {
        "thought": thought,
        "response": response
    }

@app.post("/stream")
async def stream(inp: ConversationInput):
    local_chain = CACHE.get("web_" + inp.conversation_id)
    if local_chain is None:
        local_chain = ConversationCache(MEDIATOR)
        local_chain.user_id = "web_" + inp.conversation_id
        CACHE.put("web_" + inp.conversation_id, local_chain)
    print()
    print()
    print("local chain", local_chain.messages("thought"), local_chain.messages("response"))
    print()
    print()


    async def thought_and_response():
        thought_iterator = BloomChain.think(local_chain, inp.message)
        thought = ""
        async for item in thought_iterator:
            # escape ❀ if present
            item = item.replace("❀", "🌸")
            thought += item
            yield item
        yield "❀"
        response_iterator = BloomChain.respond(local_chain, thought, inp.message)
        async for item in response_iterator:
            # if "❀" in item:
            item = item.replace("❀", "🌸")
            yield item

        


    return StreamingResponse(thought_and_response())
