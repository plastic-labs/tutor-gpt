import os
import globals
import discord
from dotenv import load_dotenv


load_dotenv()
token = os.environ['BOT_TOKEN']

globals.init()

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True

bot = discord.Bot(intents=intents)


bot.load_extension("bot.core")
bot.load_extension("bot.examples")


# <<<<<<< HEAD
# @bot.command(description="Set the context for the tutor or show it")
# async def context(ctx, text: Optional[str] = None):
#     """
#     This function sets the context global var for the tutor to engage in discussion on.
#     
#     Args:
#         ctx: context, necessary for bot commands
#         text: the passage (we're also calling it "CONTEXT") to be injected into the prompt
#     """
#     global cache, thought_chain, response_chain
#     CHANNEL_CONTEXT = cache.get(ctx.channel.id)
#     if text is None:
#         # no text given, show current text to user or let them know nothing's been set
#         if CHANNEL_CONTEXT is not None:
#             await ctx.respond(f"Current context: {CHANNEL_CONTEXT}", ephemeral=True)
#             return
#         else:
#             await ctx.respond(f"You never set a context! Add some text after the `/context` command :) ")
#             return
#     else:
#         # text given, assign or update the context
#         if CHANNEL_CONTEXT is not None:
#             # updating the context, so restart conversation
#             await ctx.invoke(bot.get_command('restart'), respond=False)
#             cache.put(ctx.channel.id, text) 
#             print(f"Context updated to: {text}")
#             await ctx.respond("The context has been successfully updated and conversation restarted!")
#             return
#         else:
#             # setting context for the first time
#             cache.put(ctx.channel.id, text) 
#             print(f"Context set to: {text}")
#             await ctx.respond("The context has been successfully set!")
# 
# 
# @bot.command(description="Debug info")
# async def debug(ctx, respond: Optional[bool] = True):
#     global CONTEXT, thought_chain, response_chain
#     if CONTEXT == None and respond: 
#         await ctx.respond("Context is empty")
#     else:
#         await ctx.respond(CONTEXT)
#     print(ctx.channel.id)
# 
# 
# @bot.command(description="Restart the conversation with the tutor")
# async def restart(ctx, respond: Optional[bool] = True):
#     """
#     Clears the conversation history, context, and reloads the chains
# 
#     Args:
#         ctx: context, necessary for bot commands
#     """
#     global CONTEXT, thought_chain, response_chain, K
#     CONTEXT = None
#     thought_chain, response_chain = load_chains()
# 
#     if respond:
#         await ctx.respond("The conversation has been reset!")
#     else:
#         return
# 
# 
# @bot.listen()
# async def on_message(message):
#     if message.author == bot.user:
#         return
# 
#     global cache
#     CHANNEL_CONTEXT = cache.get(message.channel.id)
#     # if the user mentioned the bot...
#     if str(bot.user.id) in message.content:
#         print(message.channel.id)
#         if CHANNEL_CONTEXT is None:
#             await message.channel.send('Please set a context using `/context`')
#             return
#         async with message.channel.typing():
#             response, thought = await chat(
#                 CHANNEL_CONTEXT, 
#                 message.content.replace(str('<@' + str(bot.user.id) + '>'), ''), 
#                 thought_chain,
#                 response_chain
#             )
#             await message.reply(response)
#         # print("============================================")
#         # print(f'Thought: {thought}\nResponse: {response}')
#         # print("============================================")
#         # TODO uncomment
#         
# 
#     # if the message is a reply...
#     if message.reference is not None:
#         # and if the referenced message is from the bot...
#         reply_msg = await bot.get_channel(message.channel.id).fetch_message(message.reference.message_id)
#         if reply_msg.author == bot.user:
#             if message.content.startswith("!no") or message.content.startswith("!No"):
#                 return
#             async with message.channel.typing():
#                 response, thought = await chat(
#                     CHANNEL_CONTEXT, 
#                     message.content.replace(str('<@' + str(bot.user.id) + '>'), ''), 
#                     thought_chain,
#                     response_chain
#                 )
#                 await message.reply(response)
#             # print("============================================")
#             # print(f'Thought: {thought}\nResponse: {response}')
#             # print("============================================")
#             # TODO uncomment
            

# =======
# >>>>>>> origin/staging
bot.run(token)
