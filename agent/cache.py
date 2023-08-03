"""
Below is an implementation of a basic LRUcache that utilizes the built
in OrderedDict data structure.
"""
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key):
        if key not in self.cache:
            return None

        # Move the accessed key to the end to indicate it was recently used
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            # If the key already exists, move it to the end and update the value
            self.cache.move_to_end(key)
        else:
            if len(self.cache) >= self.capacity:
                # If the cache is full, remove the least recently used key-value pair (the first item in the OrderedDict)
                self.cache.popitem(last=False)

        # Add or update the key-value pair at the end of the OrderedDict
        self.cache[key] = value

"""
In this implementation, the _move_to_front method is used to move a key to the front of 
the linked list when it is accessed. The _add_to_front method is used to add a new key to the
front of the linked list. The _remove_least_recently_used method is used to remove the least recently
used key from the cache when the capacity is exceeded. The _remove_node method is a helper method that removes

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {}
        self.head = None
        self.tail = None

    def get(self, key):
        if key not in self.cache:
            return None

        # Move the accessed key to the front of the linked list
        self._move_to_front(key)

        # print(self.cache[key])

        return self.cache[key]['value']

    def put(self, key, value):
        if key in self.cache:
            # If the key already exists in the cache, move it to the front of the linked list and update the value
            self._move_to_front(key)
            # print(self.cache[key])
            self.cache[key]['value'] = value
        else:
            # If the key is not in the cache, add it to the front of the linked list
            self._add_to_front(key, value)

            # If the cache is full, remove the least recently used key from the cache
            if len(self.cache) > self.capacity:
                self._remove_least_recently_used()

    def _move_to_front(self, key):
        node = self.cache[key]

        # If the node is already at the front, do nothing
        if node is self.head:
            return

        # Remove the node from its current position
        self._remove_node(node)

        # Add the node to the front of the linked list
        self._add_node_to_front(node)

    def _add_to_front(self, key, value):
        # Create a new node
        node = {
            'key': key,
            'value': value,
            'prev': None,
            'next': None
        }

        # Add the node to the front of the linked list
        self._add_node_to_front(node)

        # Add the node to the cache
        self.cache[key] = node

    def _add_node_to_front(self, node):
        # If the linked list is empty, set the head and tail to the new node
        if not self.head:
            self.head = node
            self.tail = node
        else:
            # Add the node to the front of the linked list
            node['next'] = self.head
            self.head['prev'] = node
            self.head = node

    def _remove_least_recently_used(self):
        # Remove the least recently used node from the cache and the linked list
        del self.cache[self.tail['key']]
        self._remove_node(self.tail)

    def _remove_node(self, node):
        # If the node is the head, update the head
        if node is self.head:
            self.head = node['next']
        else:
            node['prev']['next'] = node['next']

        # If the node is the tail, update the tail
        if node is self.tail:
            self.tail = node['prev']
        else:
            node['next']['prev'] = node['prev']

"""
