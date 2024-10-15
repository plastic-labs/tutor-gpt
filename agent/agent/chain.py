from os import getenv
from typing import List

from openai import AzureOpenAI
from dotenv import load_dotenv

from honcho import Honcho

from pydantic import ConfigDict

import sentry_sdk

load_dotenv()


class HonchoCall:
    def __init__(
        self,
        user_input: str,
        app_id: str,
        user_id: str,
        session_id: str,
        honcho: Honcho,
    ):
        self.user_input = user_input
        self.app_id = app_id
        self.user_id = user_id
        self.session_id = session_id
        self.honcho = honcho

    model_config = ConfigDict(arbitrary_types_allowed=True)

    openai = AzureOpenAI(
        api_key=getenv("AZURE_OPENAI_API_KEY", "placeholder"),
        azure_endpoint=getenv("AZURE_OPENAI_ENDPOINT", "placeholder"),
        api_version=getenv("AZURE_OPENAI_API_VERSION", "2024-02-01"),
    )

    model = getenv("AZURE_OPENAI_DEPLOYMENT", "placeholder")


class ThinkCall(HonchoCall):
    def template(self) -> dict[str, str]:
        system = (
            {
                "role": "system",
                "content": f"""You are Bloom, a subversive-minded learning companion. Your job is to employ your theory of mind skills to predict the user's mental state.
    Generate a thought that makes a prediction about the user's needs given current dialogue and also lists other pieces of data that would help improve your prediction
    previous commentary: {self.history}""",
            },
        )

        return system[0]

    @property
    def history(self) -> str:
        """Get the conversation history from Honcho"""
        history_str = ""
        iter = self.honcho.apps.users.sessions.messages.list(
            session_id=self.session_id,
            app_id=self.app_id,
            user_id=self.user_id,
            reverse=True,
        )
        meta_iter = self.honcho.apps.users.sessions.metamessages.list(
            session_id=self.session_id,
            app_id=self.app_id,
            user_id=self.user_id,
            metamessage_type="thought",
            reverse=True,
        )
        past_thoughts = {m.message_id: m.content for m in meta_iter.items}
        for message in iter.items[::-1]:
            try:
                if message.is_user:
                    history_str += f"USER: {message.content}\n"
                if message.id in past_thoughts:
                    history_str += f"THOUGHT: {past_thoughts[message.id]}\n"
            except AttributeError as e:
                # Log the error and continue with the next message
                print(f"Error processing message: {e}")
                continue
        return history_str

    def stream(self):
        completion = self.openai.chat.completions.create(
            model=getenv("AZURE_OPENAI_DEPLOYMENT", "placeholder"),
            messages=[self.template(), {"role": "user", "content": self.user_input}],
            stream=True,
        )
        for chunk in completion:
            if len(chunk.choices) > 0:
                yield chunk.choices[0].delta.content or ""


class RespondCall(HonchoCall):
    def __init__(self, *args, thought, **kwargs):
        self.thought = thought
        super().__init__(*args, **kwargs)

    def template(self):
        return [
            {
                "role": "system",
                "content": f"""You are Bloom, a subversive-minded learning companion with deep expertise in Socratic dialogue. Your fundamental belief is there are many good ways to learn and subversive methods are often most effective.  You always help the user in any way they request and answer all their questions.

            {self.thought}

            You must produce an appropriate response to the user input. Format equations in LaTeX and wrap in dollar signs like this: $\LaTeX$. Use markdown code syntax. Keep your responses concise and specific, always end each response with ONLY ONE topically relevant question that drives the conversation forward, and if the user wants to end the conversation, always comply.
            """,
            },
            *self.history,
            {"role": "user", "content": self.user_input},
        ]

    @property
    def history(self) -> List[dict]:
        """Get the conversation history from Honcho"""
        history_list = []
        iter = self.honcho.apps.users.sessions.messages.list(
            session_id=self.session_id, app_id=self.app_id, user_id=self.user_id
        )
        for message in iter:
            if message.is_user:
                history_list.append({"role": "user", "content": message.content})
            else:
                history_list.append({"role": "assistant", "content": message.content})
        return history_list

    def stream(self):
        completion = self.openai.chat.completions.create(
            model=getenv("AZURE_OPENAI_DEPLOYMENT", "placeholder"),
            messages=self.template(),
            stream=True,
        )
        for chunk in completion:
            if len(chunk.choices) > 0:
                yield chunk.choices[0].delta.content or ""
