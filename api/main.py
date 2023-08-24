from fastapi import FastAPI
from pydantic import BaseModel

from common import init
from agent.chain import ConversationCache
from fastapi.responses import StreamingResponse

app = FastAPI()

CACHE, BLOOM_CHAIN, MEDIATOR, _ = init()

class ConversationInput(BaseModel):
    conversation_id: str
    message: str

@app.post("/")
async def chat(inp: ConversationInput):
    local_chain = CACHE.get("web_" + inp.conversation_id)
    if local_chain is None:
        local_chain = ConversationCache(MEDIATOR)
        local_chain.user_id = "web_" + inp.conversation_id
        CACHE.put("web_" + inp.conversation_id, local_chain)
    thought, response = await BLOOM_CHAIN.chat(local_chain, inp.message)
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
    thought_iterator = BLOOM_CHAIN.think(local_chain, inp.message)
    thought = await thought_iterator()

    response_iterator = BLOOM_CHAIN.respond(local_chain, thought, inp.message)

    return StreamingResponse(response_iterator)
