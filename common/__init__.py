import os
from agent.cache import LRUCache
from agent.chain import BloomChain
from agent.conversation import PostgresChatMessageHistoryMediator


def init():
    CACHE = LRUCache(50)
    BLOOM_CHAIN = BloomChain()
    THOUGHT_CHANNEL = os.environ["THOUGHT_CHANNEL_ID"]
    TOKEN = os.environ['BOT_TOKEN']
    MEDIATOR = PostgresChatMessageHistoryMediator()

    return CACHE, BLOOM_CHAIN, MEDIATOR, (THOUGHT_CHANNEL, TOKEN)
