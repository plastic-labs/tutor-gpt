import os
from agent.cache import LayeredLRULocationCache, LayeredLRUConversationCache
from agent.mediator import SupabaseMediator
import asyncio


def init(cache_type="Location"):
    THOUGHT_CHANNEL = os.environ["THOUGHT_CHANNEL_ID"]
    TOKEN = os.environ['BOT_TOKEN']
    MEDIATOR = SupabaseMediator()
    CACHE = ''
    if cache_type == "Location":
        CACHE = LayeredLRULocationCache(50, MEDIATOR) # Support 50 concurrent active conversations cached in memory 
    else:
        CACHE = LayeredLRUConversationCache(50, MEDIATOR) # Support 50 concurrent active conversations cached in memory 
    LOCK = asyncio.Lock()

    return CACHE, LOCK, (THOUGHT_CHANNEL, TOKEN)
