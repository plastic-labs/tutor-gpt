# core functionality

import discord
import time
from discord_gateway import (
    OBJECTIVE_THOUGHT_CHAIN,
    OBJECTIVE_RESPONSE_CHAIN,
    CACHE,
    THOUGHT_CHANNEL,
)
from discord.ext import commands
from typing import Optional
from agent.chain import chat, ConversationCache


class Core(commands.Cog):
    def __init__(self, bot) -> None:
        self.bot = bot

    async def chat_and_save(self, local_chain: ConversationCache, input: str) -> tuple[str, str]:
        thought_chain =  OBJECTIVE_THOUGHT_CHAIN 
        response_chain = OBJECTIVE_RESPONSE_CHAIN # if local_chain.conversation_type == "discuss" else WORKSHOP_RESPONSE_CHAIN
        # response_chain = local_chain.conversation_type == "discuss" ? DISCUSS_RESPONSE_CHAIN : WORKSHOP_RESPONSE_CHAIN

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
    async def on_member_join(self, member):
        welcome_message = """
Hello! Thanks for joining the Bloom server. 

I’m your Aristotelian learning companion — here to help you follow your curiosity in whatever direction you like. My engineering makes me extremely receptive to your needs and interests. You can reply normally, and I’ll always respond!

If I'm off track, just say so! If you'd like to reset our dialogue, use the /restart  command.

Need to leave or just done chatting? Let me know! I’m conversational by design so I’ll say goodbye 😊.

If you have any further questions, use the /help command or feel free to post them in https://discord.com/channels/1076192451997474938/1092832830159065128 and someone from the Plastic Labs team will get back to you ASAP!

Enjoy!
        """
        await member.send(welcome_message)

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
            LOCAL_CHAIN = CACHE.get(message.channel.id)
            if LOCAL_CHAIN is None:
                LOCAL_CHAIN = ConversationCache()
                CACHE.put(message.channel.id, LOCAL_CHAIN)

            i = message.content.replace(str('<@' + str(self.bot.user.id) + '>'), '')
            
            start = time.time()
            async with message.channel.typing():
                thought, response = await self.chat_and_save(LOCAL_CHAIN, i)

            thought_channel = self.bot.get_channel(int(THOUGHT_CHANNEL))
            link = f"DM: {message.author.mention}"
            n = 1800
            if len(thought) > n:
                chunks = [thought[i:i+n] for i in range(0, len(thought), n)]
                for i in range(chunks):
                    await thought_channel.send(f"{link}\n```\nThought #{i}: {chunks[i]}\n```")
            else:
                await thought_channel.send(f"{link}\n```\nThought: {thought}\n```")
            if len(response) > n:
                chunks = [response[i:i+n] for i in range(0, len(response), n)]
                for chunk in chunks:
                    await message.channel.send(chunk)
            else:
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
                LOCAL_CHAIN = CACHE.get(message.channel.id)
                if LOCAL_CHAIN is None:
                    LOCAL_CHAIN = ConversationCache()
                    CACHE.put(message.channel.id, LOCAL_CHAIN)

                i = message.content.replace(str('<@' + str(self.bot.user.id) + '>'), '')

                start = time.time()
                async with message.channel.typing():
                    thought, response = await self.chat_and_save(LOCAL_CHAIN, i)

                thought_channel = self.bot.get_channel(int(THOUGHT_CHANNEL))
                link = f"https://discord.com/channels/{message.guild.id}/{message.channel.id}/{message.id}"
                n = 1800
                if len(thought) > n:
                    chunks = [thought[i:i+n] for i in range(0, len(thought), n)]
                    for i in range(chunks):
                        await thought_channel.send(f"{link}\n```\nThought #{i}: {chunks[i]}\n```")
                else:
                    await thought_channel.send(f"{link}\n```\nThought: {thought}\n```")

                if len(response) > n:
                    chunks = [response[i:i+n] for i in range(0, len(response), n)]
                    for chunk in chunks:
                        await message.reply(chunk)
                else:
                    await message.reply(response)

                end = time.time()
                print(f"Link: {link}")
                print(f"Input: {i}")
                print(f"Thought: {thought}")
                print(f"Response: {response}")
                print(f"Elapsed: {end - start}")
                print("=========================================")

        # if the user replied to the bot outside of DMs...
        if not isinstance(message.channel, discord.channel.DMChannel):
            if message.reference is not None:
                LOCAL_CHAIN = CACHE.get(message.channel.id)
                if LOCAL_CHAIN is None:
                    LOCAL_CHAIN = ConversationCache()
                    CACHE.put(message.channel.id, LOCAL_CHAIN)
                # and if the referenced message is from the bot...
                reply_msg = await self.bot.get_channel(message.channel.id).fetch_message(message.reference.message_id)
                if reply_msg.author == self.bot.user:
                    i = message.content.replace(str('<@' + str(self.bot.user.id) + '>'), '')
                    # check that the reply isn't to one of the bot's thought messages
                    if reply_msg.content.startswith("https://discord.com"):
                        return
                    if message.content.startswith("!no") or message.content.startswith("!No"):
                        return
                    start = time.time()
                    async with message.channel.typing():
                        thought, response = await self.chat_and_save(LOCAL_CHAIN, i)

                    thought_channel = self.bot.get_channel(int(THOUGHT_CHANNEL))
                    link = f"https://discord.com/channels/{message.guild.id}/{message.channel.id}/{message.id}"
                    n = 1800
                    if len(thought) > n:
                        chunks = [thought[i:i+n] for i in range(0, len(thought), n)]
                        for i in range(chunks):
                            await thought_channel.send(f"{link}\n```\nThought #{i}: {chunks[i]}\n```")
                    else:
                        await thought_channel.send(f"{link}\n```\nThought: {thought}\n```")

                    if len(response) > n:
                        chunks = [response[i:i+n] for i in range(0, len(response), n)]
                        for chunk in chunks:
                            await message.reply(chunk)
                    else:
                        await message.reply(response)

                    end = time.time()
                    print(f"Link: {link}")
                    print(f"Input: {i}")
                    print(f"Thought: {thought}")
                    print(f"Response: {response}")
                    print(f"Elapsed: {end - start}")
                    print("=========================================")

    @commands.slash_command(description="Help using the bot")
    async def help(self, ctx: discord.ApplicationContext):
        """
        Displays help message
        """
        help_message = """
Bloom is your digital learning companion. It can help you explore whatever you'd like to understand using Socratic dialogue 🏛️

Some possibilities:
🧠 Learn something new
🐇 Go down a rabbit hole
🚀 Have a stimulating conversation
⚔️ Challenge your beliefs & assumptions

You can also ask Bloom to help you with academic work, like:
✍️ Workshopping your writing
🔎 Doing research
📚 Reading comprehension
🗺️ Planning for assignments

**Instructions**
💬 You can chat with Bloom just like you'd chat with anyone else on Discord
🚧 If Bloom is going in a direction you don't like, just say so!
👋 When you're ready to end the conversation, say goodbye and Bloom will too
🔄 If you'd like to restart the conversation, use the /restart command.

**More Help**
If you're still having trouble, drop a message in https://discord.com/channels/1076192451997474938/1092832830159065128 and Bloom's builders will help you out!
        """
        await ctx.respond(help_message)

    @commands.slash_command(description="Restart the conversation with the tutor")
    async def restart(self, ctx: discord.ApplicationContext, respond: Optional[bool] = True):
        """
        Clears the conversation history and reloads the chains

        Args:
            ctx: context, necessary for bot commands
        """
        LOCAL_CHAIN = CACHE.get(ctx.channel_id)
        if LOCAL_CHAIN:
            LOCAL_CHAIN.restart()
        else:
            LOCAL_CHAIN = ConversationCache()
            CACHE.put(ctx.channel_id, LOCAL_CHAIN )

        if respond:
            msg = "Great! The conversation has been restarted. What would you like to talk about?"
            LOCAL_CHAIN.response_memory.chat_memory.add_ai_message(msg)
            await ctx.respond(msg)
        else:
            return




def setup(bot):
    bot.add_cog(Core(bot))
