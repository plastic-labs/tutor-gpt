import redis

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.redis = redis.Redis()
        self.key_value_hash = "lru_cache_key_value"
        self.key_accessed_time_zset = "lru_cache_key_accessed_time"

    def get(self, key):
        value = self.redis.hget(self.key_value_hash, key)

        if value is not None:
            # Update the last accessed time of the key
            self.redis.zadd(self.key_accessed_time_zset, {key: self.redis.time()[0]})

        return value

    def put(self, key, value):
        # Add the key-value pair to the hash
        self.redis.hset(self.key_value_hash, key, value)

        # Add the key and its accessed time to the zset
        self.redis.zadd(self.key_accessed_time_zset, {key: self.redis.time()[0]})

        # If the cache is full, remove the least recently used key
        if self.redis.zcard(self.key_accessed_time_zset) > self.capacity:
            oldest_key = self.redis.zrange(self.key_accessed_time_zset, 0, 0)[0]
            self.redis.hdel(self.key_value_hash, oldest_key)
            self.redis.zrem(self.key_accessed_time_zset, oldest_key)

"""
To implement an LRU cache using Python and Redis, you can use the Redis zset
data structure to store the cache keys and their last accessed time, and a
Redis hash data structure to store the actual key-value pairs.

In this implementation, the get method retrieves the value from the hash and
updates the accessed time of the key in the zset. The put method adds the
key-value pair to the hash and the key and its accessed time to the zset. If
the cache is full, the least recently used key is removed from both the hash
and the zset.

Note that this implementation assumes that the Redis server is running locally
with default settings. If you are using a remote Redis server or need to
configure the Redis connection settings, you can pass the appropriate
parameters to the redis.Redis constructor.
"""
