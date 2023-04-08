import os
from dotenv import load_dotenv
from chain import load_chains
from cache import LRUCache

load_dotenv()

def init():
    global DISCUSS_STARTER_CHAIN, \
    DISCUSS_THOUGHT_CHAIN, \
    DISCUSS_RESPONSE_CHAIN, \
    WORKSHOP_STARTER_CHAIN, \
    WORKSHOP_THOUGHT_CHAIN, \
    WORKSHOP_RESPONSE_CHAIN, \
    CACHE, \
    THOUGHT_CHANNEL
    
    CACHE = LRUCache(50)
    THOUGHT_CHANNEL = os.environ["THOUGHT_CHANNEL_ID"]
    ( 
        DISCUSS_STARTER_CHAIN, 
        DISCUSS_THOUGHT_CHAIN, 
        DISCUSS_RESPONSE_CHAIN,
        WORKSHOP_STARTER_CHAIN,
        WORKSHOP_THOUGHT_CHAIN,
        WORKSHOP_RESPONSE_CHAIN
    ) = load_chains()
