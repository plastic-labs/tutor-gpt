import discord

from common import init
from dotenv import load_dotenv
    
load_dotenv()
CACHE, LOCK, _, (THOUGHT_CHANNEL, TOKEN) = init()

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.members = True

bot = discord.Bot(intents=intents)


bot.load_extension("bot.core")


bot.run(TOKEN)
