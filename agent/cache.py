"""
Below is an implementation of a basic LRUcache that utilizes the built
in OrderedDict data structure.
"""
from collections import OrderedDict
from .supbase_mediator import SupabaseMediator
import uuid
from typing import List, Tuple, Dict
from langchain.schema import BaseMessage
import sentry_sdk

class Conversation:
    "Wrapper Class for storing contexts between channels. Using an object to pass by reference avoid additional cache hits"
    @sentry_sdk.trace
    def __init__(self, mediator: SupabaseMediator, user_id: str, conversation_id: str = str(uuid.uuid4()), location_id: str = "web", metadata: Dict = {}):
        self.mediator: SupabaseMediator = mediator
        self.user_id: str = user_id
        self.conversation_id: str = conversation_id 
        self.location_id: str = location_id
        self.metadata: Dict = metadata

    @sentry_sdk.trace
    def add_message(self, message_type: str, message: BaseMessage,) -> None:
        self.mediator.add_message(self.conversation_id, self.user_id, message_type, message)

    @sentry_sdk.trace
    def messages(self, message_type: str, limit: Tuple[bool, int | None] = (True, 10)) -> List[BaseMessage]:
        return self.mediator.messages(self.conversation_id, self.user_id, message_type, limit=limit)

    @sentry_sdk.trace
    def delete(self) -> None:
        self.mediator.delete_conversation(self.conversation_id)

    @sentry_sdk.trace
    def messages(self, message_type: str, limit: Tuple[bool, int | None] = (True, 10)) -> List[BaseMessage]:
        return self.mediator.messages(self.conversation_id, self.user_id, message_type, limit=limit)

    @sentry_sdk.trace
    def restart(self) -> None:
        self.delete()
        representation = self.mediator.add_conversation(user_id=self.user_id, location_id=self.location_id)
        self.conversation_id: str = representation["id"]
        self.metadata = representation["metadata"]


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
    def put(self, key: str, value: Conversation):
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
    def __init__(self, capacity, mediator: SupabaseMediator):
        self.capacity = capacity
        self.memory_cache = OrderedDict()
        self.mediator = mediator

    @sentry_sdk.trace
    def get(self, user_id: str, location_id: str) -> None | Conversation:
        key = location_id+user_id
        if key in self.memory_cache:
            return self.memory_cache[key]
        conversation = self.mediator.conversations(location_id=location_id, user_id=user_id)
        if conversation:
            conversation_id = conversation[0]["id"]
            metadata = conversation[0]["metadata"]
            # Add the conversation data to the memory_cache
            if len(self.memory_cache) >= self.capacity:
                self.memory_cache.popitem(last=False)
            self.memory_cache[key] = Conversation(self.mediator, location_id=location_id, user_id=user_id, conversation_id=conversation_id, metadata=metadata)
            return self.memory_cache[key]
        return None

    @sentry_sdk.trace
    def put(self, user_id: str, location_id: str) -> Conversation:
        # Add the conversation data to the postgres via the mediator
        representation: Dict = self.mediator.add_conversation(location_id=location_id, user_id=user_id)
        conversation_id = representation["id"]
        metadata = representation["metadata"]
        key: str = location_id+user_id   

        if len(self.memory_cache) >= self.capacity:
            # Remove the least recently used item from the memory cache
            self.memory_cache.popitem(last=False)
        self.memory_cache[key] = Conversation(self.mediator, location_id=location_id, user_id=user_id, conversation_id=conversation_id, metadata=metadata)
        return self.memory_cache[key]

    @sentry_sdk.trace
    def get_or_create(self, user_id: str, location_id: str, restart: bool = False) -> Conversation:
        cache: None | Conversation = self.get(location_id=location_id, user_id=user_id)
        if cache is None:
            cache = self.put(location_id=location_id, user_id=user_id)
        elif restart:
            cache.restart()
        return cache
