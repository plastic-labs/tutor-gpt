import discord
from agent.chain import BloomChain
from agent.cache import LRUCache

from common import init
from dotenv import load_dotenv
    
load_dotenv()
CACHE, BLOOM_CHAIN, MEDIATOR, (THOUGHT_CHANNEL, TOKEN) = init()

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.members = True

bot = discord.Bot(intents=intents)


bot.load_extension("bot.core")


bot.run(TOKEN)
