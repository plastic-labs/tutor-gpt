"""
Below is an implementation of a basic LRUcache that utilizes the built
in OrderedDict data structure.
"""
from collections import OrderedDict

from typing import Dict
import sentry_sdk
from honcho import AsyncSession, AsyncHoncho as Honcho


class LRUCache:
    @sentry_sdk.trace
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = OrderedDict()

    @sentry_sdk.trace
    def get(self, key: str):
        if key not in self.cache:
            return None

        # Move the accessed key to the end to indicate it was recently used
        self.cache.move_to_end(key)
        return self.cache[key]

    @sentry_sdk.trace
    def put(self, key: str, value: AsyncSession):
        if key in self.cache:
            # If the key already exists, move it to the end and update the value
            self.cache.move_to_end(key)
        else:
            if len(self.cache) >= self.capacity:
                # If the cache is full, remove the least recently used key-value pair (the first item in the OrderedDict)
                self.cache.popitem(last=False)

        # Add or update the key-value pair at the end of the OrderedDict
        self.cache[key] = value


class LayeredLRUCache:
    """A Conversation LRU Cache that bases keys on the location of a conversation. The assumption is that the location is a unique identifier"""

    @sentry_sdk.trace
    def __init__(self, capacity: int, honcho: Honcho):  # TODO add type indicator
        # def __init__(self, capacity, mediator: SupabaseMediator):
        self.capacity = capacity
        self.memory_cache = OrderedDict()
        self.honcho = honcho
        # self.mediator = mediator

    @sentry_sdk.trace
    def get(self, user_id: str, location_id: str) -> None | AsyncSession:
        key = location_id + user_id
        if key in self.memory_cache:
            return self.memory_cache[key]
        conversation = self.mediator.conversations(
            location_id=location_id, user_id=user_id
        )
        if conversation:
            conversation_id = conversation[0]["id"]
            metadata = conversation[0]["metadata"]
            # Add the conversation data to the memory_cache
            if len(self.memory_cache) >= self.capacity:
                self.memory_cache.popitem(last=False)
            self.memory_cache[key] = AsyncSession(
                location_id=location_id,
                user_id=user_id,
                conversation_id=conversation_id,
                metadata=metadata,
            )
            return self.memory_cache[key]
        return None

    @sentry_sdk.trace
    def put(self, user_id: str, location_id: str) -> AsyncSession:
        # Add the conversation data to the postgres via the mediator
        representation: Dict = self.mediator.add_conversation(
            location_id=location_id, user_id=user_id
        )
        conversation_id = representation["id"]
        metadata = representation["metadata"]
        key: str = location_id + user_id

        if len(self.memory_cache) >= self.capacity:
            # Remove the least recently used item from the memory cache
            self.memory_cache.popitem(last=False)
        self.memory_cache[key] = AsyncSession(
            location_id=location_id,
            user_id=user_id,
            conversation_id=conversation_id,
            metadata=metadata,
        )
        return self.memory_cache[key]

    @sentry_sdk.trace
    def get_or_create(
        self, user_id: str, location_id: str, restart: bool = False
    ) -> AsyncSession:
        cache: None | AsyncSession = self.get(location_id=location_id, user_id=user_id)
        if cache is None:
            cache = self.put(location_id=location_id, user_id=user_id)
        elif restart:
            cache.restart()
        return cache
