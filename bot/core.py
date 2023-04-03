# core functionality

import discord
import time
import globals
from discord.ext import commands
from typing import Optional
from chain import chat, ConversationCache


class Core(commands.Cog):
    def __init__(self, bot) -> None:
        self.bot = bot

    @commands.Cog.listener()
    async def on_ready(self):
        await self.bot.sync_commands()
        print(f"We have logged in as {self.bot.user}: ID = {self.bot.user.id}")

    @commands.Cog.listener()
    async def on_message_edit(self, before, after):
        # check that the edit actually changed things first
        if before.content != after.content:
            # check that the edit contains a *mention* of the bot
            if str(self.bot.user.id) in after.content:
                LOCAL_CHAIN = globals.CACHE.get(after.channel.id)
                if LOCAL_CHAIN is None:
                    LOCAL_CHAIN = ConversationCache()
                    globals.CACHE.put(after.channel.id, LOCAL_CHAIN)

                i = after.content.replace(str('<@' + str(self.bot.user.id) + '>'), '')
                if LOCAL_CHAIN.context is None:
                    await after.channel.send('Please set a context using `/context`')
                    return
                start = time.time()
                if LOCAL_CHAIN.convo_type == "discuss":
                    async with after.channel.typing():
                        thought = await chat(
                            context=LOCAL_CHAIN.context,
                            inp=i,
                            thought_chain=globals.DISCUSS_THOUGHT_CHAIN,
                            thought_memory=LOCAL_CHAIN.discuss_thought_memory
                        )
                        response = await chat(
                            context=LOCAL_CHAIN.context,
                            inp=i,
                            thought=thought,
                            response_chain=globals.DISCUSS_RESPONSE_CHAIN,
                            response_memory=LOCAL_CHAIN.discuss_response_memory
                        )
                        LOCAL_CHAIN.discuss_thought_memory.chat_memory.add_user_message(i)
                        LOCAL_CHAIN.discuss_thought_memory.chat_memory.add_ai_message(thought)
                        LOCAL_CHAIN.discuss_response_memory.chat_memory.add_user_message(i)
                        LOCAL_CHAIN.discuss_response_memory.chat_memory.add_ai_message(response)

                elif LOCAL_CHAIN.convo_type == "workshop":
                    async with after.channel.typing():
                        thought = await chat(
                            context=LOCAL_CHAIN.context,
                            inp=i,
                            thought_chain=globals.WORKSHOP_THOUGHT_CHAIN,
                            thought_memory=LOCAL_CHAIN.workshop_thought_memory
                        )
                        response = await chat(
                            context=LOCAL_CHAIN.context,
                            inp=i,
                            thought=thought,
                            response_chain=globals.WORKSHOP_RESPONSE_CHAIN,
                            response_memory=LOCAL_CHAIN.workshop_response_memory
                        )
                        LOCAL_CHAIN.workshop_thought_memory.chat_memory.add_user_message(i)
                        LOCAL_CHAIN.workshop_thought_memory.chat_memory.add_ai_message(thought)
                        LOCAL_CHAIN.workshop_response_memory.chat_memory.add_user_message(i)
                        LOCAL_CHAIN.workshop_response_memory.chat_memory.add_ai_message(response)
                
                else:
                    await after.channel.send("Missing or invalid conversation type. Reach out to someone from Plastic Labs for help.")
                    return

                thought_channel = self.bot.get_channel(int(globals.THOUGHT_CHANNEL))
                link = f"https://discord.com/channels/{after.guild.id}/{after.channel.id}/{after.id}"
                await thought_channel.send(f"{link}\n```\nThought: {thought}\n```")

                await after.reply(response)

                end = time.time()
                print(f"Link: {link}")
                print(f"Input: {i}")
                print(f"Thought: {thought}")
                print(f"Response: {response}")
                print(f"Elapsed: {end - start}")
                print("=========================================")

    @commands.slash_command(description="Restart the conversation with the tutor")
    async def restart(self, ctx: discord.ApplicationContext, respond: Optional[bool] = True):
        """
        Clears the conversation history and reloads the chains

        Args:
            ctx: context, necessary for bot commands
        """
        LOCAL_CHAIN = globals.CACHE.get(ctx.channel_id)
        if LOCAL_CHAIN:
            LOCAL_CHAIN.restart()
        else:
            LOCAL_CHAIN = ConversationCache()
            globals.CACHE.put(ctx.channel_id, LOCAL_CHAIN )
        # globals.restart()

        if respond:
            msg = "Great! The conversation has been restarted. What would you like to talk about?"
            LOCAL_CHAIN.response_memory.chat_memory.add_ai_message(msg)
            await ctx.respond(msg)
        else:
            return

    @commands.Cog.listener()
    async def on_message(self, message):
        if message.author == self.bot.user:
            return

        # if the user mentioned the bot...
        if str(self.bot.user.id) in message.content:
            LOCAL_CHAIN = globals.CACHE.get(message.channel.id)
            if LOCAL_CHAIN is None:
                LOCAL_CHAIN = ConversationCache()
                globals.CACHE.put(message.channel.id, LOCAL_CHAIN)

            i = message.content.replace(str('<@' + str(self.bot.user.id) + '>'), '')
            if LOCAL_CHAIN.context is None:
                await message.channel.send('Please set a context using `/context`')
                return
            
            start = time.time()

            if LOCAL_CHAIN.convo_type == "discuss":
                async with message.channel.typing():
                    thought = await chat(
                        context=LOCAL_CHAIN.context,
                        inp=i,
                        thought_chain=globals.DISCUSS_THOUGHT_CHAIN,
                        thought_memory=LOCAL_CHAIN.discuss_thought_memory
                    )
                    response = await chat(
                        context=LOCAL_CHAIN.context,
                        inp=i,
                        thought=thought,
                        response_chain=globals.DISCUSS_RESPONSE_CHAIN,
                        response_memory=LOCAL_CHAIN.discuss_response_memory
                    )
                    LOCAL_CHAIN.discuss_thought_memory.chat_memory.add_user_message(i)
                    LOCAL_CHAIN.discuss_thought_memory.chat_memory.add_ai_message(thought)
                    LOCAL_CHAIN.discuss_response_memory.chat_memory.add_user_message(i)
                    LOCAL_CHAIN.discuss_response_memory.chat_memory.add_ai_message(response)

            elif LOCAL_CHAIN.convo_type == "workshop":
                async with message.channel.typing():
                    thought = await chat(
                        context=LOCAL_CHAIN.context,
                        inp=i,
                        thought_chain=globals.WORKSHOP_THOUGHT_CHAIN,
                        thought_memory=LOCAL_CHAIN.workshop_thought_memory
                    )
                    response = await chat(
                        context=LOCAL_CHAIN.context,
                        inp=i,
                        thought=thought,
                        response_chain=globals.WORKSHOP_RESPONSE_CHAIN,
                        response_memory=LOCAL_CHAIN.workshop_response_memory
                    )
                    LOCAL_CHAIN.workshop_thought_memory.chat_memory.add_user_message(i)
                    LOCAL_CHAIN.workshop_thought_memory.chat_memory.add_ai_message(thought)
                    LOCAL_CHAIN.workshop_response_memory.chat_memory.add_user_message(i)
                    LOCAL_CHAIN.workshop_response_memory.chat_memory.add_ai_message(response)
            
            else:
                await message.channel.send("Missing or invalid conversation type. Reach out to someone from Plastic Labs for help.")
                return
                    

            thought_channel = self.bot.get_channel(int(globals.THOUGHT_CHANNEL))
            link = f"https://discord.com/channels/{message.guild.id}/{message.channel.id}/{message.id}"
            await thought_channel.send(f"{link}\n```\nThought: {thought}\n```")

            await message.reply(response)

            end = time.time()
            print(f"Link: {link}")
            print(f"Input: {i}")
            print(f"Thought: {thought}")
            print(f"Response: {response}")
            print(f"Elapsed: {end - start}")
            print("=========================================")



        # if the message is a reply...
        if message.reference is not None:
            LOCAL_CHAIN = globals.CACHE.get(message.channel.id)
            if LOCAL_CHAIN is None:
                LOCAL_CHAIN = ConversationCache()
                globals.CACHE.put(message.channel.id, LOCAL_CHAIN)
            # and if the referenced message is from the bot...
            reply_msg = await self.bot.get_channel(message.channel.id).fetch_message(message.reference.message_id)
            if reply_msg.author == self.bot.user:
                i = message.content.replace(str('<@' + str(self.bot.user.id) + '>'), '')
                # check that the reply isn't to one of the bot's thought messages
                if reply_msg.content.startswith("https://discord.com"):
                    return
                if LOCAL_CHAIN.context is None:
                    await message.channel.send('Please set a context using `/context`')
                    return
                if message.content.startswith("!no") or message.content.startswith("!No"):
                    return
                start = time.time()
                convo_type = LOCAL_CHAIN.convo_type

                if convo_type == "discuss":
                    async with message.channel.typing():
                        thought = await chat(
                            context=LOCAL_CHAIN.context,
                            inp=i,
                            thought_chain=globals.DISCUSS_THOUGHT_CHAIN,
                            thought_memory=LOCAL_CHAIN.discuss_thought_memory
                        )
                        response = await chat(
                            context=LOCAL_CHAIN.context,
                            inp=i,
                            thought=thought,
                            response_chain=globals.DISCUSS_RESPONSE_CHAIN,
                            response_memory=LOCAL_CHAIN.discuss_response_memory
                        )
                        LOCAL_CHAIN.discuss_thought_memory.chat_memory.add_user_message(i)
                        LOCAL_CHAIN.discuss_thought_memory.chat_memory.add_ai_message(thought)
                        LOCAL_CHAIN.discuss_response_memory.chat_memory.add_user_message(i)
                        LOCAL_CHAIN.discuss_response_memory.chat_memory.add_ai_message(response)

                elif convo_type == "workshop":
                    async with message.channel.typing():
                        thought = await chat(
                            context=LOCAL_CHAIN.context,
                            inp=i,
                            thought_chain=globals.WORKSHOP_THOUGHT_CHAIN,
                            thought_memory=LOCAL_CHAIN.workshop_thought_memory
                        )
                        response = await chat(
                            context=LOCAL_CHAIN.context,
                            inp=i,
                            thought=thought,
                            response_chain=globals.WORKSHOP_RESPONSE_CHAIN,
                            response_memory=LOCAL_CHAIN.workshop_response_memory
                        )
                        LOCAL_CHAIN.workshop_thought_memory.chat_memory.add_user_message(i)
                        LOCAL_CHAIN.workshop_thought_memory.chat_memory.add_ai_message(thought)
                        LOCAL_CHAIN.workshop_response_memory.chat_memory.add_user_message(i)
                        LOCAL_CHAIN.workshop_response_memory.chat_memory.add_ai_message(response)
                
                else:
                    await message.channel.send("Missing or invalid conversation type. Reach out to someone from Plastic Labs for help.")
                    return

                thought_channel = self.bot.get_channel(int(globals.THOUGHT_CHANNEL))
                link = f"https://discord.com/channels/{message.guild.id}/{message.channel.id}/{message.id}"
                await thought_channel.send(f"{link}\n```\nThought: {thought}\n```")

                await message.reply(response)

                end = time.time()
                print(f"Link: {link}")
                print(f"Input: {i}")
                print(f"Thought: {thought}")
                print(f"Response: {response}")
                print(f"Elapsed: {end - start}")
                print("=========================================")


def setup(bot):
    bot.add_cog(Core(bot))
