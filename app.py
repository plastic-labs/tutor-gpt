import os
from typing import Optional

import discord
# from discord.ext import commands

from dotenv import load_dotenv
from chain import load_chains, load_memories, chat


load_dotenv()
token = os.environ['BOT_TOKEN']

STARTER_CHAIN, THOUGHT_CHAIN, RESPONSE_CHAIN = load_chains()
THOUGHT_MEMORY, RESPONSE_MEMORY = load_memories()
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
    global CONTEXT, STARTER_CHAIN, RESPONSE_MEMORY
    if text is None:
        # no text given, show current text to user or let them know nothing's been set
        if CONTEXT is not None:
            await ctx.respond(f"Current context: {CONTEXT}", ephemeral=True)
        else:
            await ctx.respond(f"You never set a context! Add some text after the `/context` command :) ")
    else:
        # text given, assign or update the context
        if CONTEXT is not None:
            # updating the context, so restart conversation
            await ctx.invoke(bot.get_command('restart'), respond=False)
            CONTEXT = text
            print(f"Context updated to: {CONTEXT}")
            response = await chat(
                context=CONTEXT,
                starter_chain=STARTER_CHAIN
            )
            RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.respond(response)
        else:
            # setting context for the first time
            CONTEXT = text
            print(f"Context set to: {CONTEXT}")
            response = await chat(
                context=CONTEXT,
                starter_chain=STARTER_CHAIN
            )
            RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.respond(response)
    return


@bot.command(description="Restart the conversation with the tutor")
async def restart(ctx, respond: Optional[bool] = True):
    """
    Clears the conversation history and reloads the chains

    Args:
        ctx: context, necessary for bot commands
    """
    global THOUGHT_MEMORY, RESPONSE_MEMORY
    THOUGHT_MEMORY, RESPONSE_MEMORY = load_memories()

    if respond:
        msg = "Great! The conversation has been restarted. What would you like to talk about?"
        RESPONSE_MEMORY.chat_memory.add_ai_message(msg)
        await ctx.respond(msg)
    else:
        return


@bot.listen()
async def on_message(message):
    if message.author == bot.user:
        return

    
    # if the user mentioned the bot...
    if str(bot.user.id) in message.content:
        i = message.content.replace(str('<@' + str(bot.user.id) + '>'), '')
        if CONTEXT is None:
            await message.channel.send('Please set a context using `/context`')
            return
        async with message.channel.typing():
            thought = await chat(
                context=CONTEXT,
                inp=i,
                thought_chain=THOUGHT_CHAIN,
                thought_memory=THOUGHT_MEMORY
            )
            THOUGHT_MEMORY.chat_memory.add_user_message(i)
            THOUGHT_MEMORY.chat_memory.add_ai_message(thought)

            response = await chat(
                context=CONTEXT,
                inp=i,
                thought=thought,
                response_chain=RESPONSE_CHAIN,
                response_memory=RESPONSE_MEMORY
            )
            RESPONSE_MEMORY.chat_memory.add_user_message(i)
            RESPONSE_MEMORY.chat_memory.add_ai_message(response)

            await message.reply(response)

        print("============================================")
        print(f'Thought: {thought}\nResponse: {response}')
        print("============================================")
        

    # if the message is a reply...
    if message.reference is not None:
        # and if the referenced message is from the bot...
        reply_msg = await bot.get_channel(message.channel.id).fetch_message(message.reference.message_id)
        if reply_msg.author == bot.user:
            i = message.content.replace(str('<@' + str(bot.user.id) + '>'), '')
            if message.content.startswith("!no") or message.content.startswith("!No"):
                return
            async with message.channel.typing():
                thought = await chat(
                    context=CONTEXT,
                    inp=i,
                    thought_chain=THOUGHT_CHAIN,
                    thought_memory=THOUGHT_MEMORY
                )
                THOUGHT_MEMORY.chat_memory.add_user_message(i)
                THOUGHT_MEMORY.chat_memory.add_ai_message(thought)

                response = await chat(
                    context=CONTEXT,
                    inp=i,
                    thought=thought,
                    response_chain=RESPONSE_CHAIN,
                    response_memory=RESPONSE_MEMORY
                )
                RESPONSE_MEMORY.chat_memory.add_user_message(i)
                RESPONSE_MEMORY.chat_memory.add_ai_message(response)

                await message.reply(response)
                
            print("============================================")
            print(f'Thought: {thought}\nResponse: {response}')
            print("============================================")
            

bot.run(token)
