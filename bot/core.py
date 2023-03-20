# core functionality

import discord
import globals
from discord.ext import commands
from typing import Optional
from chain import chat, ConversationCache


class Core(commands.Cog):
    def __init__(self, bot) -> None:
        self.bot = bot

    @commands.Cog.listener()
    async def on_ready(self):
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
                async with after.channel.typing():
                    thought = await chat(
                        context=LOCAL_CHAIN.context,
                        inp=i,
                        thought_chain=globals.THOUGHT_CHAIN,
                        thought_memory=LOCAL_CHAIN.thought_memory
                    )
                    LOCAL_CHAIN.thought_memory.chat_memory.add_user_message(i)
                    LOCAL_CHAIN.thought_memory.chat_memory.add_ai_message(thought)

                    response = await chat(
                        context=LOCAL_CHAIN.context,
                        inp=i,
                        thought=thought,
                        response_chain=globals.RESPONSE_CHAIN,
                        response_memory=LOCAL_CHAIN.response_memory
                    )
                    LOCAL_CHAIN.response_memory.chat_memory.add_user_message(i)
                    LOCAL_CHAIN.response_memory.chat_memory.add_ai_message(response)

                    await after.reply(response)

                print("============================================")
                print(f'Thought: {thought}\nResponse: {response}')
                print("============================================")

    @commands.slash_command(description="Set the context for the tutor or show it")
    async def context(self, ctx: discord.ApplicationContext, text: Optional[str] = None):
        """
        This function sets the context global var for the tutor to engage in discussion on.

        Args:
            ctx: context, necessary for bot commands
            text: the passage (we're also calling it "CONTEXT") to be injected into the prompt
        """
        LOCAL_CHAIN = globals.CACHE.get(ctx.channel_id)
        if text is None:
            # no text given, show current text to user or let them know nothing's been set
            if LOCAL_CHAIN is not None and LOCAL_CHAIN.context is not None:
                await ctx.respond(f"Current context: {LOCAL_CHAIN.context}", ephemeral=True)
            else:
                await ctx.respond(f"You never set a context! Add some text after the `/context` command :) ")
        else:
            # text given, assign or update the context
            if LOCAL_CHAIN is not None and LOCAL_CHAIN.context is not None:
                await ctx.response.defer()
                # updating the context, so restart conversation
                await ctx.invoke(self.bot.get_command('restart'), respond=False)
                LOCAL_CHAIN.context = text
                # globals.CONTEXT = text
                print(f"Context updated to: {LOCAL_CHAIN.context}")
                response = await chat(
                    context=LOCAL_CHAIN.context,
                    starter_chain=globals.STARTER_CHAIN
                )
                LOCAL_CHAIN.response_memory.chat_memory.add_ai_message(response)
                await ctx.followup.send(response)
            else:
                # setting context for the first time
                await ctx.response.defer()
                # Create new cache entry
                LOCAL_CHAIN = ConversationCache(text)
                globals.CACHE.put(ctx.channel_id, LOCAL_CHAIN)
                # globals.CONTEXT = text
                print(f"Context set to: {LOCAL_CHAIN.context}")
                response = await chat(
                    context=text,
                    starter_chain=globals.STARTER_CHAIN
                )
                # globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
                LOCAL_CHAIN.response_memory.chat_memory.add_ai_message(response)
                await ctx.followup.send(response)

        return

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
            async with message.channel.typing():
                thought = await chat(
                    context=LOCAL_CHAIN.context,
                    inp=i,
                    thought_chain=globals.THOUGHT_CHAIN,
                    thought_memory=LOCAL_CHAIN.thought_memory
                )
                LOCAL_CHAIN.thought_memory.chat_memory.add_user_message(i)
                LOCAL_CHAIN.thought_memory.chat_memory.add_ai_message(thought)

                response = await chat(
                    context=LOCAL_CHAIN.context,
                    inp=i,
                    thought=thought,
                    response_chain=globals.RESPONSE_CHAIN,
                    response_memory=LOCAL_CHAIN.response_memory
                )
                LOCAL_CHAIN.response_memory.chat_memory.add_user_message(i)
                LOCAL_CHAIN.response_memory.chat_memory.add_ai_message(response)

                await message.reply(response)

            print("============================================")
            print(f'Thought: {thought}\nResponse: {response}')
            print("============================================")


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
                if LOCAL_CHAIN.context is None:
                    await message.channel.send('Please set a context using `/context`')
                    return
                if message.content.startswith("!no") or message.content.startswith("!No"):
                    return
                async with message.channel.typing():
                    thought = await chat(
                        context=LOCAL_CHAIN.context,
                        inp=i,
                        thought_chain=globals.THOUGHT_CHAIN,
                        thought_memory=LOCAL_CHAIN.thought_memory
                    )
                    LOCAL_CHAIN.thought_memory.chat_memory.add_user_message(i)
                    LOCAL_CHAIN.thought_memory.chat_memory.add_ai_message(thought)

                    response = await chat(
                        context=LOCAL_CHAIN.context,
                        inp=i,
                        thought=thought,
                        response_chain=globals.RESPONSE_CHAIN,
                        response_memory=LOCAL_CHAIN.response_memory
                    )
                    LOCAL_CHAIN.response_memory.chat_memory.add_user_message(i)
                    LOCAL_CHAIN.response_memory.chat_memory.add_ai_message(response)

                    await message.reply(response)

                print("============================================")
                print(f'Thought: {thought}\nResponse: {response}')
                print("============================================")


def setup(bot):
    bot.add_cog(Core(bot))
