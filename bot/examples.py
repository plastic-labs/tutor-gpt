# example slash commands

import discord
import globals
from discord.ext import commands
from chain import chat
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

    @commands.slash_command(name="frankenstein", description="Discuss a passage from \'Frankenstein\'!")
    async def frankenstein(self, ctx: discord.ApplicationContext):
        """
        This function starts the conversation with an example passage from Frankenstein
        """
        # context already set, update the context
        if globals.CONTEXT is not None:
            await ctx.response.defer()
            # updating the context, so restart conversation
            await ctx.invoke(self.bot.get_command('restart'), respond=False)
            globals.CONTEXT = FRANKENSTEIN
            print(f"Context updated to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/frankenstein` *command!\n\nI'll start the conversation below. If you want to read the passage I'm talking about, just enter* `/context`!\n\n{response}")
        else:
            # setting context for the first time
            await ctx.response.defer()
            globals.CONTEXT = FRANKENSTEIN
            print(f"Context set to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/frankenstein` *command!\n\nI'll start the conversation below. If you want to read the passage I'm talking about, just enter* `/context`!\n\n{response}")


    @commands.slash_command(name="gatsby", description="Discuss a passage from \'The Great Gatsby\'!")
    async def gatsby(self, ctx: discord.ApplicationContext):
        """
        This function starts the conversation with an example passage from Frankenstein
        """
        # context already set, update the context
        if globals.CONTEXT is not None:
            await ctx.response.defer()
            # updating the context, so restart conversation
            await ctx.invoke(self.bot.get_command('restart'), respond=False)
            globals.CONTEXT = GATSBY
            print(f"Context updated to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/gatsby` *command!\n\nI'll start the conversation below. If you want to read the text I'm talking about, just enter* `/context`!\n\n{response}")
        else:
            # setting context for the first time
            await ctx.response.defer()
            globals.CONTEXT = GATSBY
            print(f"Context set to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/gatsby` *command!\n\nI'll start the conversation below. If you want to read the text I'm talking about, just enter* `/context`!\n\n{response}")

    
    @commands.slash_command(name="we-real-cool", description="Discuss a poem from Gwendolyn Brooks called \'We Real Cool\'!")
    async def we_real_cool(self, ctx: discord.ApplicationContext):
        """
        This function starts the conversation with an example poem from Gwendolyn Brooks called We Real Cool
        """
        # context already set, update the context
        if globals.CONTEXT is not None:
            await ctx.response.defer()
            # updating the context, so restart conversation
            await ctx.invoke(self.bot.get_command('restart'), respond=False)
            globals.CONTEXT = BROOKS
            print(f"Context updated to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/we-real-cool` *command!\n\nI'll start the conversation below. If you want to read the text I'm talking about, just enter* `/context`!\n\n{response}")
        else:
            # setting context for the first time
            await ctx.response.defer()
            globals.CONTEXT = BROOKS
            print(f"Context set to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/we-real-cool` *command!\n\nI'll start the conversation below. If you want to read the text I'm talking about, just enter* `/context`!\n\n{response}")


    @commands.slash_command(name="self-respect", description="Discuss a passage from Joan Didion called \'Self Respect\'!")
    async def self_respect(self, ctx: discord.ApplicationContext):
        """
        This function starts the conversation with an example passage from Joan Didion called \'Self Respect\'
        """
        # context already set, update the context
        if globals.CONTEXT is not None:
            await ctx.response.defer()
            # updating the context, so restart conversation
            await ctx.invoke(self.bot.get_command('restart'), respond=False)
            globals.CONTEXT = DIDION
            print(f"Context updated to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/self-respect` *command!\n\nI'll start the conversation below. If you want to read the text I'm talking about, just enter* `/context`!\n\n{response}")
        else:
            # setting context for the first time
            await ctx.response.defer()
            globals.CONTEXT = DIDION
            print(f"Context set to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/self-respect` *command!\n\nI'll start the conversation below. If you want to read the text I'm talking about, just enter* `/context`!\n\n{response}")


    @commands.slash_command(name="nature", description="Discuss a passage from Ralph Waldo Emerson's essay called \'Nature\'!")
    async def nature(self, ctx: discord.ApplicationContext):
        """
        This function starts the conversation with an example passage from Ralph Waldo Emerson's essay called \'Nature\'
        """
        # context already set, update the context
        if globals.CONTEXT is not None:
            await ctx.response.defer()
            # updating the context, so restart conversation
            await ctx.invoke(self.bot.get_command('restart'), respond=False)
            globals.CONTEXT = EMERSON
            print(f"Context updated to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/nature` *command!\n\nI'll start the conversation below. If you want to read the text I'm talking about, just enter* `/context`!\n\n{response}")
        else:
            # setting context for the first time
            await ctx.response.defer()
            globals.CONTEXT = EMERSON
            print(f"Context set to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/nature` *command!\n\nI'll start the conversation below. If you want to read the text I'm talking about, just enter* `/context`!\n\n{response}")


    @commands.slash_command(name="romeo-juliet", description="Discuss a passage from William Shakespeare's play, \'Romeo and Juliet\'!")
    async def romeo_juliet(self, ctx: discord.ApplicationContext):
        """
        This function starts the conversation with an example passage from William Shakespeare's play, \'Romeo and Juliet\'
        """
        # context already set, update the context
        if globals.CONTEXT is not None:
            await ctx.response.defer()
            # updating the context, so restart conversation
            await ctx.invoke(self.bot.get_command('restart'), respond=False)
            globals.CONTEXT = SHAKESPEARE
            print(f"Context updated to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/romeo-juliet` *command!\n\nI'll start the conversation below. If you want to read the text I'm talking about, just enter* `/context`!\n\n{response}")
        else:
            # setting context for the first time
            await ctx.response.defer()
            globals.CONTEXT = SHAKESPEARE
            print(f"Context set to: {globals.CONTEXT}")
            response = await chat(
                context=globals.CONTEXT,
                starter_chain=globals.STARTER_CHAIN
            )
            globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
            await ctx.followup.send(f"*You used the* `/romeo-juliet` *command!\n\nI'll start the conversation below. If you want to read the text I'm talking about, just enter* `/context`!\n\n{response}")



def setup(bot):
    bot.add_cog(Examples(bot))