# core functionality

import discord
from __main__ import THOUGHT_CHANNEL, honcho, app
from discord.ext import commands
from typing import Optional

from agent.chain import ThinkCall, RespondCall
from honcho.types.apps import User
from honcho.types.apps.users import Session

import sentry_sdk


def chat(message: str, user: User, session: Session):
    thought: str = (
        ThinkCall(
            user_input=message,
            app_id=app.id,
            user_id=user.id,
            session_id=session.id,
            honcho=honcho,
        )
        .call()
        .content
    )
    yield thought
    response = (
        RespondCall(
            user_input=message,
            thought=thought,
            app_id=app.id,
            user_id=user.id,
            session_id=session.id,
            honcho=honcho,
        )
        .call()
        .content
    )
    yield response
    new_message = honcho.apps.users.sessions.messages.create(
        is_user=True,
        session_id=session.id,
        app_id=app.id,
        user_id=user.id,
        content=message,
    )
    honcho.apps.users.sessions.metamessages.create(
        app_id=app.id,
        session_id=session.id,
        user_id=user.id,
        message_id=new_message.id,
        metamessage_type="thought",
        content=thought,
    )
    honcho.apps.users.sessions.messages.create(
        is_user=False,
        session_id=session.id,
        app_id=app.id,
        user_id=user.id,
        content=response,
    )


class Core(commands.Cog):
    def __init__(self, bot) -> None:
        self.bot = bot

    @commands.Cog.listener()
    async def on_member_join(self, member):
        with sentry_sdk.start_transaction(
            op="on_member_join", name="discord.on_member_join"
        ):
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
        with sentry_sdk.start_transaction(op="on_message", name="discord.on_message"):
            # Don't let the bot reply too itself
            if message.author == self.bot.user:
                return

            user_id = f"discord_{str(message.author.id)}"
            user = honcho.apps.users.get_or_create(name=user_id, app_id=app.id)
            # Get cache for conversation
            # async with LOCK:
            #     CONVERSATION = CACHE.get_or_create(
            #         location_id=str(message.channel.id), user_id=user_id
            #     )

            # Use the channel ID as the location_id (for DMs, this will be unique to the user)
            location_id = str(message.channel.id)

            sessions_iter = honcho.apps.users.sessions.list(
                app_id=app.id, user_id=user.id, reverse=True
            )
            sessions = list(sessions_iter)
            session = None
            if sessions:
                # find the right session
                for s in sessions:
                    if s.metadata.get("location_id") == location_id:
                        session = s
                        print(session.id)
                        break
                # if no session is found after the for loop, create a new one
                if not session:
                    print("No session found amongst existing ones, creating new one")
                    session = honcho.apps.users.sessions.create(
                        user_id=user.id,
                        app_id=app.id,
                        metadata={"location_id": location_id},
                    )
                    print(session.id)
            else:
                print("No active session found")
                session = honcho.apps.users.sessions.create(
                    user_id=user.id,
                    app_id=app.id,
                    metadata={"location_id": location_id},
                )
                print(session.id)

            # Get the message content but remove any mentions
            inp = message.content.replace(str("<@" + str(self.bot.user.id) + ">"), "")
            n = 1800

            async def respond(reply=True, forward_thought=True):
                "Generate response too user"
                async with message.channel.typing():
                    turn = chat(inp, user, session)

                    thought = next(turn)
                    # sanitize thought by adding zero width spaces to triple backticks
                    thought = thought.replace("```", "`\u200b`\u200b`")

                    thought_channel = self.bot.get_channel(int(THOUGHT_CHANNEL))

                    # Thought Forwarding
                    if forward_thought:
                        link = f"https://discord.com/channels/{message.guild.id}/{message.channel.id}/{message.id}"
                        if len(thought) > n:
                            chunks = [
                                thought[i : i + n] for i in range(0, len(thought), n)
                            ]
                            for i in range(len(chunks)):
                                await thought_channel.send(
                                    f"{link}\n```\nThought #{i}: {chunks[i]}\n```"
                                )
                        else:
                            await thought_channel.send(
                                f"{link}\n```\nThought: {thought}\n```"
                            )

                    response = next(turn)

                    # Response Forwarding
                    if len(response) > n:
                        chunks = [
                            response[i : i + n] for i in range(0, len(response), n)
                        ]
                        for chunk in chunks:
                            if reply:
                                await message.reply(chunk)
                            else:
                                await message.channel.send(chunk)
                    else:
                        if reply:
                            await message.reply(response)
                        else:
                            await message.channel.send(response)

            # if the message came from a DM channel...
            if isinstance(message.channel, discord.DMChannel):
                await respond(reply=False, forward_thought=False)

            # If the bot was mentioned in the message
            if not isinstance(message.channel, discord.DMChannel):
                if str(self.bot.user.id) in message.content:
                    await respond(forward_thought=True)

            # If the bot was replied to in the message
            if not isinstance(message.channel, discord.DMChannel):
                if message.reference is not None:
                    reply_msg = await self.bot.get_channel(
                        message.channel.id
                    ).fetch_message(message.reference.message_id)
                    if reply_msg.author == self.bot.user:
                        if reply_msg.content.startswith("https://discord.com"):
                            return
                        if message.content.startswith(
                            "!no"
                        ) or message.content.startswith("!No"):
                            return
                        await respond(forward_thought=True)

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
    async def restart(
        self, ctx: discord.ApplicationContext, respond: Optional[bool] = True
    ):
        with sentry_sdk.start_transaction(op="restart", name="discord.restart"):
            """
            Clears the conversation history and reloads the chains

            Args:
                ctx: context, necessary for bot commands
            """
            user_id = f"discord_{str(ctx.author.id)}"
            user = honcho.apps.users.get_or_create(name=user_id, app_id=app.id)
            location_id = str(ctx.channel_id)

            sessions = honcho.apps.users.sessions.list(
                app_id=app.id, user_id=user.id, reverse=True
            )

            sessions_list = list(sessions)
            if sessions_list:
                # find the right session to delete
                for session in sessions_list:
                    if session.metadata.get("location_id") == location_id:
                        honcho.apps.users.sessions.delete(
                            app_id=app.id, user_id=user.id, session_id=session.id
                        )
                        break
                msg = "The conversation has been restarted."
            else:
                msg = "No active conversation found to restart."

            await ctx.respond(msg)


def setup(bot):
    bot.add_cog(Core(bot))
