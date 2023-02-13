import collections
import os
from typing import Optional

import discord
from discord.ext import commands

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
    print(f"We have logged in as {bot.user}")


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


@bot.event
async def on_message(ctx, message: Optional[discord.Message] = None):
    if message.author == ctx.user:
        return

    print("We're listening...")
    
    history.append(message.content)

    if message.content.startswith('@tutor-gpt'):
        if CONTEXT is None:
            await message.channel.send('Please set a context using `/context`')
        response = await chat(CONTEXT, message.content[10:], history, chain)
        await message.channel.send(response)

    print(f'Message from {ctx.author}: {message.content}')
    await bot.process_commands(message)

# @bot.command(description="Chat with the tutor")
# async def chat(ctx, message: discord.Message):
#     if CONTEXT is None:
#         await ctx.respond("Please set a context using `/context`.")
#         return

#     history.append(message.content)
#     response = await chat(CONTEXT, message.content[10:], history, chain)
#     await ctx.respond(response)

bot.run(token)
