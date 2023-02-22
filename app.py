import collections
import os
from typing import Optional

import discord
# from discord.ext import commands

from dotenv import load_dotenv
from chain import load_chains, chat


load_dotenv()
token = os.environ['BOT_TOKEN']

K=15  # create a constants file so we can ref this in chain.py too
thought_chain, response_chain = load_chains()
response_history = collections.deque(maxlen=K)
thought_history = collections.deque(maxlen=K)
CONTEXT = None

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True

bot = discord.Bot(intents=intents)

@bot.event
async def on_ready():
    print(f"We have logged in as {bot.user}: ID = {bot.user.id}")


@bot.command(description="Set the context for the tutor or show it")
async def context(ctx, text: Optional[str] = None):
    """
    This function sets the context global var for the tutor to engage in discussion on.
    
    Args:
        ctx: context, necessary for bot commands
        text: the passage (we're also calling it "CONTEXT") to be injected into the prompt
    """
    global CONTEXT
    if text is None:
        if CONTEXT is not None:
            await ctx.respond(f"Current context: {CONTEXT}", ephemeral=True)
            return
        else:
            await ctx.respond(f"You never set a context! Add some text after the `/context` command :) ")
            return
    CONTEXT = text
    print(f"Context set to: {CONTEXT}")
    await ctx.respond("The context has been successfully set!")


@bot.command(description="Restart the conversation with the tutor")
async def restart(ctx):
    """
    Clears the conversation history, context, and reloads the chains

    Args:
        ctx: context, necessary for bot commands
    """
    global CONTEXT, chain, history, K
    CONTEXT = None
    thought_chain, response_chain = load_chains()
    response_history = collections.deque(maxlen=K)
    thought_history = collections.deque(maxlen=K)

    await ctx.respond("The conversation has been reset!")


@bot.listen()
async def on_message(message):
    if message.author == bot.user:
        return

    # if the user mentioned the bot...
    if str(bot.user.id) in message.content:
        if CONTEXT is None:
            await message.channel.send('Please set a context using `/context`')
            return
        async with message.channel.typing():
            response, thought = await chat(
                CONTEXT, 
                message.content.replace(str('<@' + str(bot.user.id) + '>'), ''), 
                thought_history, 
                response_history,
                thought_chain,
                response_chain
            )
        print("============================================")
        print(f'Thought: {thought}\nResponse: {response}')
        print("============================================")
        # await message.channel.send(response)
        await message.reply(f'Thought: {thought}\nResponse: {response}')

    # if the message is a reply...
    if message.reference is not None:
        # and if the referenced message is from the bot...
        reply_msg = await bot.get_channel(message.channel.id).fetch_message(message.reference.message_id)
        if reply_msg.author == bot.user:
            if message.content.startswith("!no"):
                return
            async with message.channel.typing():
                response, thought = await chat(
                    CONTEXT, 
                    message.content.replace(str('<@' + str(bot.user.id) + '>'), ''), 
                    thought_history, 
                    response_history,
                    thought_chain,
                    response_chain
                )
            print("============================================")
            print(f'Thought: {thought}\nResponse: {response}')
            print("============================================")
            # await message.channel.send(response)
            await message.reply(f'Thought: {thought}\nResponse: {response}')


    

bot.run(token)
