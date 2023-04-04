# example slash commands

import discord
import globals
from discord.commands import SlashCommandGroup
from discord.ext import commands
from chain import ConversationCache, chat
from data.examples import (
    GATSBY,
    FRANKENSTEIN,
    BROOKS,
    DIDION,
    SHAKESPEARE,
    EMERSON
)



class Examples(commands.Cog):
    def __init__(self, bot) -> None:
        self.bot = bot

    examples = SlashCommandGroup("examples", "Various example passages to discuss with Bloom!")

    async def example_factory(self, ctx: discord.ApplicationContext, title: str, passage: str):
        """
        Factory method for making it easier to plugin different example passages
        """
        LOCAL_CHAIN = globals.CACHE.get(ctx.channel_id)
        if LOCAL_CHAIN is None:
            LOCAL_CHAIN = ConversationCache()
            globals.CACHE.put(ctx.channel_id, LOCAL_CHAIN)
        if LOCAL_CHAIN.context is not None:
            await ctx.response.defer()
            # updating the context, so restart conversation
            # await ctx.invoke(self.bot.get_command('restart'), respond=False)
            LOCAL_CHAIN.restart()
            LOCAL_CHAIN.context = passage
            print(f"Context updated to: {LOCAL_CHAIN.context}")
            response = await chat(
                context=LOCAL_CHAIN.context,
                starter_chain=globals.DISCUSS_STARTER_CHAIN
            )
            LOCAL_CHAIN.response_memory.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/{title}` *command!\n\nI'll start the conversation below. If you want to read the passage I'm talking about, just enter* `/context`!\n\n{response}")
        else:
            # setting context for the first time
            await ctx.response.defer()
            LOCAL_CHAIN.context = passage
            print(f"Context updated to: {LOCAL_CHAIN.context}")
            response = await chat(
                context=LOCAL_CHAIN.context,
                starter_chain=globals.DISCUSS_STARTER_CHAIN
            )
            LOCAL_CHAIN.response_memory.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/{title}` *command!\n\nI'll start the conversation below. If you want to read the passage I'm talking about, just enter* `/context`!\n\n{response}")

    @examples.command(name="frankenstein", description="Discuss a passage from \'Frankenstein\'!")
    async def frankenstein(self, ctx: discord.ApplicationContext):
        await self.example_factory(ctx, "frankenstein", FRANKENSTEIN)

    @examples.command(name="gatsby", description="Discuss a passage from \'The Great Gatsby\'!")
    async def gatsby(self, ctx: discord.ApplicationContext):
        await self.example_factory(ctx, "gatsby", GATSBY)


    @examples.command(name="we-real-cool", description="Discuss a poem from Gwendolyn Brooks called \'We Real Cool\'!")
    async def we_real_cool(self, ctx: discord.ApplicationContext):
        await self.example_factory(ctx, "we-real-cool", BROOKS)

    @examples.command(name="self-respect", description="Discuss a passage from Joan Didion called \'Self Respect\'!")
    async def self_respect(self, ctx: discord.ApplicationContext):
        await self.example_factory(ctx, "self-respect", DIDION)


    @examples.command(name="nature", description="Discuss a passage from Ralph Waldo Emerson's essay called \'Nature\'!")
    async def nature(self, ctx: discord.ApplicationContext):
        await self.example_factory(ctx, "nature", EMERSON)


    @examples.command(name="romeo-juliet", description="Discuss a passage from William Shakespeare's play, \'Romeo and Juliet\'!")
    async def romeo_juliet(self, ctx: discord.ApplicationContext):
        await self.example_factory(ctx, "romeo-juliet", SHAKESPEARE)


def setup(bot):
    bot.add_cog(Examples(bot))
