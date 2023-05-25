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

    async def chat_and_save(self, local_chain: ConversationCache, input: str) -> tuple[str, str]:
        thought_chain =  globals.OBJECTIVE_THOUGHT_CHAIN 
        response_chain = globals.OBJECTIVE_RESPONSE_CHAIN # if local_chain.conversation_type == "discuss" else globals.WORKSHOP_RESPONSE_CHAIN
        # response_chain = local_chain.conversation_type == "discuss" ? globals.DISCUSS_RESPONSE_CHAIN : globals.WORKSHOP_RESPONSE_CHAIN
        
        thought = await chat(
            inp=input,
            thought_chain=thought_chain,
            thought_memory=local_chain.thought_memory
        )
        response = await chat(
            inp=input,
            thought=thought,
            response_chain=response_chain,
            response_memory=local_chain.response_memory
        )
        local_chain.thought_memory.save_context({"input":input}, {"output": thought})
        local_chain.response_memory.save_context({"input":input}, {"output": response})
        return thought, response

    @commands.Cog.listener()
    async def on_ready(self):
        await self.bot.sync_commands()
        print(f"We have logged in as {self.bot.user}: ID = {self.bot.user.id}")

    @commands.Cog.listener()
    async def on_message(self, message):
        if message.author == self.bot.user:
            return

        # if the message came from a DM channel...
        if isinstance(message.channel, discord.channel.DMChannel):
            LOCAL_CHAIN = globals.CACHE.get(message.channel.id)
            if LOCAL_CHAIN is None:
                LOCAL_CHAIN = ConversationCache()
                globals.CACHE.put(message.channel.id, LOCAL_CHAIN)

            i = message.content.replace(str('<@' + str(self.bot.user.id) + '>'), '')
            
            start = time.time()
            async with message.channel.typing():
                thought, response = await self.chat_and_save(LOCAL_CHAIN, i)

            thought_channel = self.bot.get_channel(int(globals.THOUGHT_CHANNEL))
            link = f"DM: {message.author.mention}"
            await thought_channel.send(f"{link}\n```\nInput: {i}\nThought: {thought}\n```")

            await message.channel.send(response)

            end = time.time()
            print(f"DM: {message.author.mention}")
            print(f"Input: {i}")
            print(f"Thought: {thought}")
            print(f"Response: {response}")
            print(f"Elapsed: {end - start}")
            print("=========================================")


        # if the user mentioned the bot outside of DMs...
        if not isinstance(message.channel, discord.channel.DMChannel):
            if str(self.bot.user.id) in message.content:
                response = "Hey! I can DM for now, group setting functionality coming soon."
                await message.reply(response)

        # if the user replied to the bot outside of DMs...
        if not isinstance(message.channel, discord.channel.DMChannel):
            if message.reference is not None:
                # and if the referenced message is from the bot...
                reply_msg = await self.bot.get_channel(message.channel.id).fetch_message(message.reference.message_id)
                if reply_msg.author == self.bot.user:
                    response = "Hey! I can DM for now, group setting functionality coming soon."
                    await message.reply(response)


def setup(bot):
    bot.add_cog(Core(bot))
