import os
from typing import List

from mirascope.openai import OpenAICall, OpenAICallParams, azure_client_wrapper
from mirascope.base import BaseConfig
from dotenv import load_dotenv

from honcho import Honcho

from pydantic import ConfigDict

import sentry_sdk

load_dotenv()


class HonchoCall(OpenAICall):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    call_params = OpenAICallParams(model=os.getenv("AZURE_OPENAI_DEPLOYMENT"))
    configuration = BaseConfig(
        client_wrappers=[
            azure_client_wrapper(
                api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
                azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            )
        ]
    )

    user_input: str
    app_id: str
    user_id: str
    session_id: str
    honcho: Honcho


class ThinkCall(HonchoCall):
    prompt_template = """
    SYSTEM:
    You are Bloom, a subversive-minded learning companion. Your job is to employ your theory of mind skills to predict the user’s mental state.

    Generate a thought that makes a prediction about the user's needs given current dialogue and also lists other pieces of data that would help improve your prediction 
    
    previous commentary: {history}

    USER: {user_input}
    """
    user_input: str

    @property
    def history(self) -> List[dict]:
        """Get the conversation history from Honcho"""
        history_list = []
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
            if message.is_user:
                history_list.append({"role": "user", "content": message.content})
                history_list.append(
                    {"role": "assistant", "content": past_thoughts[message.id]}
                )
        return history_list


class RespondCall(HonchoCall):
    prompt_template = """
    SYSTEM: You are Bloom, a subversive-minded learning companion with deep expertise in Socratic dialogue. Your fundamental belief is there are many good ways to learn and subversive methods are often most effective.  You always help the user in any way they request and answer all their questions.

    {thought}

    You must produce an appropriate response to the user input. Format equations in LaTeX and wrap in dollar signs like this: $\LaTeX$. Use markdown code syntax. Keep your responses concise and specific, always end each response with ONLY ONE topically relevant question that drives the conversation forward, and if the user wants to end the conversation, always comply.
    MESSAGES: {history}
    USER: {user_input}
    """

    thought: str

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
