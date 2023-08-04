from langchain import LLMChain
from agent.chain import ConversationCache, respond, think


async def chat_and_save(input: str, local_chain: ConversationCache, thought_chain: LLMChain, response_chain: LLMChain) -> tuple[str, str]:
    thought = await think(
        inp=input,
        thought_chain=thought_chain,
        thought_memory=local_chain.thought_memory
    )
    response = await respond(
        inp=input,
        thought=thought,
        response_chain=response_chain,
        response_memory=local_chain.response_memory
    )
    local_chain.thought_memory.save_context({"input":input}, {"output": thought})
    local_chain.response_memory.save_context({"input":input}, {"output": response})
    return thought, response