import os
from agent.cache import LayeredLRUCache
from agent.mediator import SupabaseMediator
import asyncio


def init():
    THOUGHT_CHANNEL = os.environ["THOUGHT_CHANNEL_ID"]
    TOKEN = os.environ["BOT_TOKEN"]
    # MEDIATOR = SupabaseMediator()
    CACHE = LayeredLRUCache(
        50, MEDIATOR
    )  # Support 50 concurrent active conversations cached in memory
    LOCK = asyncio.Lock()

    return CACHE, LOCK, MEDIATOR, (THOUGHT_CHANNEL, TOKEN)
