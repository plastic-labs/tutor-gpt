from typing import List

from openai import OpenAI
from dotenv import load_dotenv

from honcho import Honcho

from pydantic import ConfigDict

import json
import re
import os
import sentry_sdk
from pprint import pprint

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

    openai = OpenAI(
        base_url="https://openrouter.ai/api/v1"
    )

    model = "nousresearch/hermes-3-llama-3.1-405b:free"
    file_path = ""
    history = []

    def get_prompt(self) -> list[dict[str, str]]:
        """Parse a markdown file into a list of messages."""
        with open(self.file_path, "r") as f:
            response_prompt = f.readlines()

        messages = []
        n = ""
        content = ""

        while len(response_prompt) > 0:
            line = response_prompt.pop(0)
            if line == "USER:\n":
                n = "user"
            elif line == "ASSISTANT:\n":
                n = "assistant"
            elif line == "" or line == "\n":
                messages.append({"role": n, "content": content})
                content = ""
            elif line.startswith("MESSAGES:"):
                messages.extend(self.history)
            else:
                content += line.strip()

        return messages

    def parse_xml_content(self, content: str, tag: str) -> str:
        """Parse content between specified XML tags from the input content."""
        pattern = f'<{tag}>(.*?)</{tag}>'
        match = re.search(pattern, content, re.DOTALL)
        return match.group(1).strip() if match else ""


class ThinkCall(HonchoCall):
    file_path = os.path.join(os.path.dirname(__file__), "./prompts/thought.md")

    @property
    def history(self) -> list[dict]:
        """Get the thought history from Honcho"""
        history = []
        iter = self.honcho.apps.users.sessions.metamessages.list(
            app_id=self.app_id,
            user_id=self.user_id,
            session_id=self.session_id,
            metamessage_type="thought",
            filter=json.dumps({"type": "user"}),
        )
        for metamessage in iter:
            if metamessage.metadata.get("type") == "user":
                history.append({"role": "user", "content": metamessage.content})
            else:
                history.append({"role": "assistant", "content": metamessage.content})
        return history

    @property
    def most_recent_honcho_response(self) -> str:
        """Get the most recent honcho response from Honcho"""
        most_recent_response_metamessage = self.honcho.apps.users.sessions.metamessages.list(
            app_id=self.app_id,
            user_id=self.user_id,
            session_id=self.session_id,
            metamessage_type="response",
            filter=json.dumps({"type": "user"}),
            reverse=True,
            size=1
        )
        most_recent_response_metamessage = list(most_recent_response_metamessage)
        if most_recent_response_metamessage:
            assert most_recent_response_metamessage[0].metadata.get("type") == "user", "some logic issue -- most recent response metamessage is not from the user"
            most_recent_honcho_response = self.parse_xml_content(most_recent_response_metamessage[0].content, "honcho")
        else:
            most_recent_honcho_response = "None"

        return most_recent_honcho_response
    
    @property
    def most_recent_bloom_response(self) -> str:
        """Get the most recent bloom response from Honcho"""
        most_recent_response_metamessage = self.honcho.apps.users.sessions.metamessages.list(
            app_id=self.app_id,
            user_id=self.user_id,
            session_id=self.session_id,
            metamessage_type="response",
            filter=json.dumps({"type": "user"}),
            reverse=True,
            size=1
        )
        most_recent_response_metamessage = list(most_recent_response_metamessage)
        if most_recent_response_metamessage:
            assert most_recent_response_metamessage[0].metadata.get("type") == "user", "some logic issue -- most recent response metamessage is not from the user"
            most_recent_bloom_response = self.parse_xml_content(most_recent_response_metamessage[0].content, "bloom")
        else:
            most_recent_bloom_response = "None"

        return most_recent_bloom_response

    def call(self):
        messages = [
            *self.get_prompt(),
            {
                "role": "user",
                "content": f"<honcho-response>{self.most_recent_honcho_response}<honcho-response>\n<bloom>{self.most_recent_bloom_response}</bloom>\n{self.user_input}"
            }
        ]
        response = self.openai.chat.completions.create(
            model=self.model,
            messages=messages,
        )
        return response.choices[0].message


    def stream(self):
        messages = [
            *self.get_prompt(),
            {
                "role": "user",
                "content": f"<honcho-response>{self.most_recent_honcho_response}<honcho-response>\n<bloom>{self.most_recent_bloom_response}</bloom>\n{self.user_input}"
            }
        ]
        completion = self.openai.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True,
        )
        for chunk in completion:
            if len(chunk.choices) > 0:
                yield chunk.choices[0].delta.content or ""


class RespondCall(HonchoCall):
    file_path = os.path.join(os.path.dirname(__file__), "./prompts/response.md")

    def __init__(self, *args, thought, honcho_content, **kwargs):
        self.thought = thought
        self.honcho_content = honcho_content
        super().__init__(*args, **kwargs)

    @property
    def history(self) -> List[dict]:
        """Get the conversation history from Honcho"""
        history = []
        iter = self.honcho.apps.users.sessions.metamessages.list(
            app_id=self.app_id,
            user_id=self.user_id,
            session_id=self.session_id,
            metamessage_type="response"
        )
        for metamessage in iter:
            associated_message = self.honcho.apps.users.sessions.messages.get(
                app_id=self.app_id,
                user_id=self.user_id,
                session_id=self.session_id,
                message_id=metamessage.message_id,
            )

            history.append({"role": "user", "content": metamessage.content})
            history.append({"role": "assistant", "content": associated_message.content})

        return history

    def call(self):
        response = self.openai.chat.completions.create(
            model=self.model,
            messages=[
                *self.get_prompt(),
                {
                    "role": "user",
                    "content": f"<honcho-response>{self.honcho_content}</honcho-response>\n{self.user_input}"
                }
            ],
        )
        return response.choices[0].message

    def stream(self):
        messages = [
            *self.get_prompt(),
            {
                "role": "user",
                "content": f"<honcho-response>{self.honcho_content}</honcho-response>\n{self.user_input}"
            }
        ]
        completion = self.openai.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True,
        )
        for chunk in completion:
            if len(chunk.choices) > 0:
                yield chunk.choices[0].delta.content or ""
