import os
from dotenv import load_dotenv
from agent.chain import load_chains
from agent.cache import LRUCache

load_dotenv()

def init():
    global OBJECTIVE_THOUGHT_CHAIN, \
    OBJECTIVE_RESPONSE_CHAIN, \
    CACHE, \
    THOUGHT_CHANNEL
    
    CACHE = LRUCache(500)
    THOUGHT_CHANNEL = os.environ["THOUGHT_CHANNEL_ID"]
    ( 
        OBJECTIVE_THOUGHT_CHAIN, 
        OBJECTIVE_RESPONSE_CHAIN, 
    ) = load_chains()
