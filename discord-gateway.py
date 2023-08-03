import os
import globals
import discord
from dotenv import load_dotenv
    
load_dotenv()
token = os.environ['BOT_TOKEN']

globals.init()

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.members = True

bot = discord.Bot(intents=intents)


bot.load_extension("bot.core")


bot.run(token)
