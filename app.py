import collections
import os
from typing import Optional

import discord
# from discord.ext import commands

from dotenv import load_dotenv
from chain import load_chain, chat


load_dotenv()
token = os.environ['BOT_TOKEN']

K=15  # create a constants file so we can ref this in chain.py too
chain = load_chain()
history = collections.deque(maxlen=K)

CONTEXT = None

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True

bot = discord.Bot(intents=intents)

@bot.event
async def on_ready():
    print(f"We have logged in as {bot.user}: ID = {bot.user.id}")


@bot.command(description="Set the context for the tutor")
async def context(ctx, text: Optional[str] = None):
    global CONTEXT
    if text is None:
        if CONTEXT is not None:
            await ctx.respond(f"Current context: {CONTEXT}")
            return
        else:
            await ctx.respond(f"You never set a context! Add some text after the `/context` command :) ")
            return
    CONTEXT = text
    print(f"Context set to: {CONTEXT}")
    await ctx.respond("The context has been successfully set!")

@bot.listen()
async def on_message(message):
    if message.author == bot.user:
        return

    # print(message.content)
    history.append(message.content)

    if str(bot.user.id) in message.content:
        if CONTEXT is None:
            await message.channel.send('Please set a context using `/context`')
            return
        response = await chat(CONTEXT, message.content, history, chain)
        print("============================================")
        print(response)
        print("============================================")
        # await message.channel.send(response)
        await message.reply(response)


bot.run(token)
