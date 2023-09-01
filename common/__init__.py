import os
from agent.cache import LRUCache, LayeredLRUCache
from agent.chain import BloomChain
from agent.mediator import SupabaseMediator


def init():
    THOUGHT_CHANNEL = os.environ["THOUGHT_CHANNEL_ID"]
    TOKEN = os.environ['BOT_TOKEN']
    # MEDIATOR = PostgresChatMessageHistoryMediator()
    MEDIATOR = SupabaseMediator()
    CACHE = LayeredLRUCache(50, MEDIATOR) # Support 1000 concurrent active conversations cached in memory 

    return CACHE, (THOUGHT_CHANNEL, TOKEN)
