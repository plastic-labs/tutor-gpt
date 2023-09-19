import discord
import sentry_sdk
import os

from common import init
from dotenv import load_dotenv
    
load_dotenv()

rate = 0.2 if os.getenv("SENTRY_ENVIRONMENT") == "production" else 1.0

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN_DISCORD"),
    traces_sample_rate=rate,
    profiles_sample_rate=rate
)

CACHE, LOCK, _, (THOUGHT_CHANNEL, TOKEN) = init()

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.members = True

bot = discord.Bot(intents=intents)


bot.load_extension("bot.core")


bot.run(TOKEN)
