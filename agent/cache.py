"""
Below is an implementation of a basic LRUcache that utilizes the built
in OrderedDict data structure.
"""
from collections import OrderedDict
from .mediator import SupabaseMediator
import uuid
from typing import List
from langchain.schema import BaseMessage

class ConversationCache:
    "Wrapper Class for storing contexts between channels. Using an object to pass by reference avoid additional cache hits"
    def __init__(self, mediator: SupabaseMediator, location_id: str, user_id: str, conversation_id: str = str(uuid.uuid4())):
        self.mediator: SupabaseMediator = mediator
        self.user_id: str = user_id
        self.conversation_id: str = conversation_id 
        self.location_id: str = location_id

    def add_message(self, message_type: str, message: BaseMessage,) -> None:
        self.mediator.add_message(self.conversation_id, self.user_id, message_type, message)

    def messages(self, message_type: str) -> List[BaseMessage]:
        return self.mediator.messages(self.conversation_id, self.user_id, message_type)

    def restart(self) -> None:
        # TODO use mediator to mark conversation as done
        self.mediator.delete_conversation(self.conversation_id)
        # call mediator.add_conversation
        self.conversation_id: str = self.mediator.add_conversation(self.location_id, self.user_id)


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key: str):
        if key not in self.cache:
            return None

        # Move the accessed key to the end to indicate it was recently used
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: str, value: ConversationCache):
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
    def __init__(self, capacity, mediator: SupabaseMediator):
        self.capacity = capacity
        self.memory_cache = OrderedDict()
        self.mediator = mediator

    def get(self, location_id, user_id) -> None | ConversationCache:
        key = location_id+user_id
        if key in self.memory_cache:
            return self.memory_cache[key]
        
        conversation_id = self.mediator.conversations(location_id=location_id, user_id=user_id)
        if conversation_id:
            # Add the conversation data to the memory_cache
            if len(self.memory_cache) >= self.capacity:
                self.memory_cache.popitem(last=False)
            self.memory_cache[key] = ConversationCache(self.mediator, location_id=location_id, user_id=user_id, conversation_id=conversation_id[0])
            return self.memory_cache[key]

        return None

    def put(self, location_id, user_id) -> ConversationCache:
        # Add the conversation data to the postgres via the mediator
        conversation_id = self.mediator.add_conversation(location_id=location_id, user_id=user_id)
        key = location_id+user_id

        if len(self.memory_cache) >= self.capacity:
            # Remove the least recently used item from the memory cache
            self.memory_cache.popitem(last=False)
        self.memory_cache[key] = ConversationCache(self.mediator, location_id=location_id, user_id=user_id, conversation_id=conversation_id)
        return self.memory_cache[key]
    
    def get_or_create(self, location_id: str, user_id: str, restart: bool = False) -> ConversationCache:
        cache: None | ConversationCache = self.get(location_id=location_id, user_id=user_id)
        if cache is None:
            cache = self.put(location_id=location_id, user_id=user_id)
        elif restart:
            cache.restart()
        return cache
    
