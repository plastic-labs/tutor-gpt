import os
from agent.cache import LRUCache
from agent.chain import BloomChain
from agent.mediator import SupabaseMediator


def init():
    CACHE = LRUCache(1000) # Support 1000 concurrent active conversations cached in memory
    BLOOM_CHAIN = BloomChain()
    THOUGHT_CHANNEL = os.environ["THOUGHT_CHANNEL_ID"]
    TOKEN = os.environ['BOT_TOKEN']
    # MEDIATOR = PostgresChatMessageHistoryMediator()
    MEDIATOR = SupabaseMediator()

    return CACHE, BLOOM_CHAIN, MEDIATOR, (THOUGHT_CHANNEL, TOKEN)
