import discord
import sentry_sdk
import os
from honcho import Honcho

from dotenv import load_dotenv

load_dotenv()

rate = 0.2 if os.getenv("SENTRY_ENVIRONMENT") == "production" else 1.0

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN_DISCORD"),
    traces_sample_rate=rate,
    profiles_sample_rate=rate,
)

THOUGHT_CHANNEL = os.environ["THOUGHT_CHANNEL_ID"]
TOKEN = os.environ["BOT_TOKEN"]
honcho = Honcho()
app = honcho.apps.get_or_create("Tutor-GPT")  # TODO use environment variable

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
intents.members = True

bot = discord.Bot(intents=intents)


bot.load_extension("core")


bot.run(TOKEN)
