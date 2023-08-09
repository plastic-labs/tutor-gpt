import os
import discord
from dotenv import load_dotenv
from agent.chain import BloomChain
from agent.cache import LRUCache
    
load_dotenv()
token = os.environ['BOT_TOKEN']

def init():
    global BLOOM_CHAIN, \
    CACHE, \
    THOUGHT_CHANNEL
    
    CACHE = LRUCache(50)
    THOUGHT_CHANNEL = os.environ["THOUGHT_CHANNEL_ID"]
    BLOOM_CHAIN = BloomChain()

init()

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.members = True

bot = discord.Bot(intents=intents)


bot.load_extension("bot.core")


bot.run(token)
