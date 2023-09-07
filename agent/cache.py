"""
Below is an implementation of a basic LRUcache that utilizes the built
in OrderedDict data structure.
"""
from collections import OrderedDict
from .mediator import SupabaseMediator
import uuid
from typing import List, Tuple
from langchain.schema import BaseMessage

class Conversation:
    "Wrapper Class for storing contexts between channels. Using an object to pass by reference avoid additional cache hits"
    def __init__(self, mediator: SupabaseMediator, user_id: str, conversation_id: str = str(uuid.uuid4()), location_id: str = "web"):
        self.mediator: SupabaseMediator = mediator
        self.user_id: str = user_id
        self.conversation_id: str = conversation_id 
        self.location_id: str = location_id

    def add_message(self, message_type: str, message: BaseMessage,) -> None:
        self.mediator.add_message(self.conversation_id, self.user_id, message_type, message)

    def messages(self, message_type: str, limit: Tuple[bool, int | None] = (True, 10)) -> List[BaseMessage]:
        return self.mediator.messages(self.conversation_id, self.user_id, message_type, limit=limit)

    def delete(self) -> None:
        self.mediator.delete_conversation(self.conversation_id)

    def restart(self) -> None:
        self.delete()
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
    def __init__(self, capacity, mediator: SupabaseMediator):
        self.capacity = capacity
        self.memory_cache = OrderedDict()
        self.mediator = mediator

    def get(self, user_id: str, location_id: str) -> None | Conversation:
        key = location_id+user_id
        if key in self.memory_cache:
            return self.memory_cache[key]

        conversation = self.mediator.conversations(location_id=location_id, user_id=user_id)
        if conversation:
            conversation_id = conversation[0]["id"]
            # Add the conversation data to the memory_cache
            if len(self.memory_cache) >= self.capacity:
                self.memory_cache.popitem(last=False)
            self.memory_cache[key] = Conversation(self.mediator, location_id=location_id, user_id=user_id, conversation_id=conversation_id)
            return self.memory_cache[key]

        return None

    def put(self, user_id: str, location_id: str) -> Conversation:
        # Add the conversation data to the postgres via the mediator
        conversation_id = self.mediator.add_conversation(location_id=location_id, user_id=user_id)
        key: str = location_id+user_id   

        if len(self.memory_cache) >= self.capacity:
            # Remove the least recently used item from the memory cache
            self.memory_cache.popitem(last=False)
        self.memory_cache[key] = Conversation(self.mediator, location_id=location_id, user_id=user_id, conversation_id=conversation_id)
        return self.memory_cache[key]

    def get_or_create(self, user_id: str, location_id: str, restart: bool = False) -> Conversation:
        cache: None | Conversation = self.get(location_id=location_id, user_id=user_id)
        if cache is None:
            cache = self.put(location_id=location_id, user_id=user_id)
        elif restart:
            cache.restart()
        return cache
    
# class LayeredLRUConversationCache:
#     """A Conversation LRU Cache that bases keys on the conversation_id of a conversation. The assumption is that the conversation is the unique identifier"""
#     def __init__(self, capacity, mediator: SupabaseMediator):
#         self.capacity = capacity
#         self.memory_cache = OrderedDict()
#         self.mediator = mediator
# 
#     def get(self, user_id: str, conversation_id: str) -> None | Conversation:
#         key = conversation_id+user_id
#         if key in self.memory_cache:
#             return self.memory_cache[key]
# 
#         location_id = self.mediator.conversation(conversation_id)
#         if location_id:
#             # Add the conversation data to the memory_cache
#             if len(self.memory_cache) >= self.capacity:
#                 self.memory_cache.popitem(last=False)
#             self.memory_cache[key] = Conversation(self.mediator, location_id=location_id, user_id=user_id, conversation_id=conversation_id)
#             return self.memory_cache[key]
# 
#         return None
# 
#     def put(self, user_id: str, location_id: str) -> Conversation:
#         # Add the conversation data to the postgres via the mediator
#         conversation_id = self.mediator.add_conversation(location_id=location_id, user_id=user_id)
#         key: str = conversation_id+user_id   
# 
#         if len(self.memory_cache) >= self.capacity:
#             # Remove the least recently used item from the memory cache
#             self.memory_cache.popitem(last=False)
#         self.memory_cache[key] = Conversation(self.mediator, location_id=location_id, user_id=user_id, conversation_id=conversation_id)
#         return self.memory_cache[key]
# 
# 
#     def hard_delete(self, user_id: str, conversation_id: str) -> None:
#         key = conversation_id+user_id
#         if key in self.memory_cache:
#             self.memory_cache.pop(key)
#         self.mediator.delete_conversation(conversation_id)
# 
