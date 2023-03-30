import discord
import time
import globals
from typing import Optional
from discord.ext import commands


class Context(commands.Cog):
    @commands.slash_command(description="Set the context for the tutor or show it")
    async def context(self, ctx: discord.ApplicationContext, text: Optional[str] = None):
        """
        This function sets the context global var for the tutor to engage in discussion on.

        Args:
            ctx: context, necessary for bot commands
            text: the passage (we're also calling it "CONTEXT") to be injected into the prompt
        """
        await ctx.response.defer()
        await ctx.respond("What would you like to do with the text you provided?", view=ContextView())
        # LOCAL_CHAIN = globals.CACHE.get(ctx.channel_id)
        # if text is None:
        #     # no text given, show current text to user or let them know nothing's been set
        #     if LOCAL_CHAIN is not None and LOCAL_CHAIN.context is not None:
        #         await ctx.respond(f"Current context: {LOCAL_CHAIN.context}", ephemeral=True)
        #     else:
        #         await ctx.respond(f"You never set a context! Add some text after the `/context` command :) ")
        # else:
        #     # text given, assign or update the context
        #     if LOCAL_CHAIN is not None and LOCAL_CHAIN.context is not None:
        #         start = time.time()
        #         await ctx.response.defer()
        #         # updating the context, so restart conversation
        #         await ctx.invoke(self.bot.get_command('restart'), respond=False)
        #         LOCAL_CHAIN.context = text
        #         # globals.CONTEXT = text
        #         print(f"Context updated to: {LOCAL_CHAIN.context}")
        #         response = await chat(
        #             context=LOCAL_CHAIN.context,
        #             starter_chain=globals.STARTER_CHAIN
        #         )
        #         LOCAL_CHAIN.response_memory.chat_memory.add_ai_message(response)
        #         await ctx.followup.send(response)
        #         end = time.time()
        #         print(f"Elapsed: {end - start}")
        #     else:
        #         # setting context for the first time
        #         await ctx.response.defer()
        #         start = time.time()
        #         # respond with a message and show buttons
        #         # await ctx.respond("What would you like to do with the text you provided?", view=ConversationButtons())

        #         # Create new cache entry
        #         # LOCAL_CHAIN = ConversationCache(text)
        #         # globals.CACHE.put(ctx.channel_id, LOCAL_CHAIN)
        #         # # globals.CONTEXT = text
        #         # print(f"Context set to: {LOCAL_CHAIN.context}")
        #         # response = await chat(
        #         #     context=text,
        #         #     starter_chain=globals.STARTER_CHAIN
        #         # )
        #         # # globals.RESPONSE_MEMORY.chat_memory.add_ai_message(response)
        #         # LOCAL_CHAIN.response_memory.chat_memory.add_ai_message(response)
        #         # await ctx.followup.send(response)
        #         end = time.time()
        #         print(f"Elapsed: {end - start}")

class ContextView(discord.ui.View):
    @discord.ui.button(label="Discuss", row = 0, style=discord.ButtonStyle.primary, emoji="💬")
    async def discuss_button_callback(self, button, interaction):
        await interaction.response.send_message("discuss")

    @discord.ui.button(label="Workshop", row = 1, style=discord.ButtonStyle.primary, emoji="✍️")
    async def workshop_button_callback(self, button, interaction):
        await interaction.response.send_message("workshop")


def setup(bot):
    bot.add_cog(Context(bot))