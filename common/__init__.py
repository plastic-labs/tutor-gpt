import os
from agent.cache import LRUCache
from agent.chain import BloomChain


def init():
    CACHE = LRUCache(50)
    BLOOM_CHAIN = BloomChain()
    THOUGHT_CHANNEL = os.environ["THOUGHT_CHANNEL_ID"]
    TOKEN = os.environ['BOT_TOKEN']

    return CACHE, BLOOM_CHAIN, (THOUGHT_CHANNEL, TOKEN)