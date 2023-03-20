from chain import load_chains, load_memories
from cache import LRUCache

def init():
    global THOUGHT_MEMORY, RESPONSE_MEMORY, STARTER_CHAIN, THOUGHT_CHAIN, RESPONSE_CHAIN, CONTEXT, CACHE
    CACHE = LRUCache(50)
    THOUGHT_MEMORY, RESPONSE_MEMORY = load_memories()
    STARTER_CHAIN, THOUGHT_CHAIN, RESPONSE_CHAIN = load_chains(THOUGHT_MEMORY, RESPONSE_MEMORY)
    CONTEXT = None

def restart():
    global THOUGHT_MEMORY, RESPONSE_MEMORY
    THOUGHT_MEMORY, RESPONSE_MEMORY = load_memories()
