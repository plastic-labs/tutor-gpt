from chain import load_chain, chat
import discord
import os

chain = load_chain()
history = []


token = os.environ['BOT_TOKEN']
# class Client(discord.Client):
#     async def on_ready(self):
#         print(f'Logged on as {self.user}!')
# 
#     async def on_message(self, message):
#         print(f'Message from {message.author}: {message.content}')

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f'We have logged in as {client.user}')

@client.event
async def on_message(message):
    if message.author == client.user:
        return

    if message.content.startswith('$hello'):
        await message.channel.send('Hello!')

    if message.content.startswith('$context'):
        await message.channel.send(f'Context Saved: {message.content[8:]}')

client.run(token)

 
