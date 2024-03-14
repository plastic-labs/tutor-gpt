import os
from typing import List, Union

# from langchain.chat_models import ChatOpenAI, AzureChatOpenAI
from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain.prompts import (
    SystemMessagePromptTemplate,
)
from langchain.prompts import load_prompt, ChatPromptTemplate
from langchain.schema import AIMessage, HumanMessage, BaseMessage

from openai import BadRequestError

from dotenv import load_dotenv
from honcho import Session, User, Message, Metamessage

from collections.abc import AsyncIterator

# from .cache import Conversation
from honcho import AsyncSession

import sentry_sdk

load_dotenv()

SYSTEM_THOUGHT = load_prompt(
    os.path.join(os.path.dirname(__file__), "prompts/thought.yaml")
)
SYSTEM_RESPONSE = load_prompt(
    os.path.join(os.path.dirname(__file__), "prompts/response.yaml")
)
SYSTEM_USER_PREDICTION_THOUGHT = load_prompt(
    os.path.join(os.path.dirname(__file__), "prompts/user_prediction_thought.yaml")
)


def honcho_to_langchain(
    messages: List[Message],
) -> List[Union[HumanMessage, AIMessage]]:
    results = []
    for message in messages:
        if message.is_user:
            results.append(HumanMessage(content=message.content))
        else:
            results.append(AIMessage(content=message.content))
    return results


class BloomChain:
    "Wrapper class for encapsulating the multiple different chains used in reasoning for the tutor's thoughts"

    # llm: ChatOpenAI = ChatOpenAI(model_name = "gpt-4", temperature=1.2)
    llm: AzureChatOpenAI | ChatOpenAI
    if os.environ.get("OPENAI_API_TYPE") == "azure":
        llm = AzureChatOpenAI(
            deployment_name=os.environ["OPENAI_API_DEPLOYMENT_NAME"],
            temperature=1.2,
            model_kwargs={"top_p": 0.5},
        )
    else:
        llm = ChatOpenAI(
            model_name="gpt-4", temperature=1.2, model_kwargs={"top_p": 0.5}
        )

    system_thought: SystemMessagePromptTemplate = SystemMessagePromptTemplate(
        prompt=SYSTEM_THOUGHT
    )
    system_response: SystemMessagePromptTemplate = SystemMessagePromptTemplate(
        prompt=SYSTEM_RESPONSE
    )
    system_user_prediction_thought: SystemMessagePromptTemplate = (
        SystemMessagePromptTemplate(prompt=SYSTEM_USER_PREDICTION_THOUGHT)
    )

    def __init__(self) -> None:
        pass

    # def __init__(self, llm: AzureChatOpenAI = AzureChatOpenAI(deployment_name = "vineeth-gpt35-16k-230828", temperature=1.2), verbose: bool = True) -> None:
    # self.llm = llm
    # self.verbose = verbose

    # setup prompts
    # self.system_thought = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
    # self.system_response = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)

    @classmethod
    @sentry_sdk.trace
    def think(cls, session: Session, message: Message):
        """Generate Bloom's thought on the user."""
        # load message history
        honcho_message_page = session.get_messages(page=1, page_size=10, reverse=True)
        messages: List = [
            message for message in honcho_message_page.items if message.is_user
        ]

        honcho_metamessage_page = session.get_metamessages(
            metamessage_type="thought", page=1, page_size=10, reverse=True
        )
        honcho_metamessages: List = honcho_metamessage_page.items
        messages.extend(honcho_metamessages)

        messages.sort(key=lambda message: message.created_at, reverse=False)

        final_messages = []
        for m in messages:
            if isinstance(m, Message):
                final_messages.append(HumanMessage(content=m.content))
            elif isinstance(m, Metamessage):
                final_messages.append(AIMessage(content=m.content))

        print("========================================")
        print("Line 112")
        print(final_messages)
        print("========================================")

        thought_prompt = ChatPromptTemplate.from_messages(
            [
                cls.system_thought,
                *final_messages,
                HumanMessage(content=message.content),
            ]
        )
        chain = thought_prompt | cls.llm

        def save_new_messages(ai_response):
            # message = session.add_message(content=input)
            session.create_metamessage(
                message=message, metamessage_type="thought", content=ai_response
            )

        return Streamable(
            chain.astream(
                {},
                {
                    "tags": ["thought"],
                    "metadata": {
                        "conversation_id": session.id,
                        "user_id": session.user.id,
                    },
                },
            ),
            save_new_messages,
        )

    @classmethod
    @sentry_sdk.trace
    def respond(cls, session: Session, thought: str, message: Message):
        """Generate Bloom's response to the user."""

        honcho_message_page = session.get_messages(page=1, page_size=10, reverse=True)
        messages = honcho_message_page.items

        # honcho_metamessage_page = session.get_metamessages(
        #     metamessage_type="thought", page=1, page_size=10, reverse=True
        # )
        # honcho_metamessages = honcho_metamessage_page.items
        # messages.extend(honcho_metamessages)

        # messages.sort(key=lambda message: message.created_at, reverse=False)
        final_messages = honcho_to_langchain(messages)
        final_messages = final_messages[::-1]

        print("========================================")
        print("Line 163")
        print(final_messages)
        print("========================================")

        response_prompt = ChatPromptTemplate.from_messages(
            [
                cls.system_response,
                *final_messages,
                HumanMessage(content=message.content),
            ]
        )
        chain = response_prompt | cls.llm

        def save_new_messages(ai_response):
            # session.add_message("response", HumanMessage(content=input))
            session.create_message(
                content=ai_response, is_user=False
            )  # AIMessage(content=ai_response))

        return Streamable(
            chain.astream(
                {"thought": thought},
                {
                    "tags": ["response"],
                    "metadata": {
                        "conversation_id": session.id,
                        "user_id": session.user.id,
                    },
                },
            ),
            save_new_messages,
        )

    @classmethod
    @sentry_sdk.trace
    async def think_user_prediction(cls, session: Session, message: Message):
        """Generate a thought about what the user is going to say"""

        messages = ChatPromptTemplate.from_messages(
            [
                cls.system_user_prediction_thought,
            ]
        )
        chain = messages | cls.llm

        messages = session.get_messages(page=1, page_size=10, reverse=True).items
        history = unpack_messages(honcho_to_langchain(messages))
        # history = unpack_messages(session.messages("response"))

        user_prediction_thought = await chain.ainvoke(
            {"history": history},
            {
                "tags": ["user_prediction_thought"],
                "metadata": {
                    "conversation_id": session.id,
                    "user_id": session.user.id,
                },
            },
        )

        session.create_metamessage(
            message=message,
            metamessage_type="user_prediction_thought",
            content=user_prediction_thought.content,
        )

    @classmethod
    @sentry_sdk.trace
    async def chat(cls, session: Session, message: Message) -> tuple[str, str]:
        thought_iterator = cls.think(session, message)
        thought = await thought_iterator()

        response_iterator = cls.respond(session, thought, message)
        response = await response_iterator()

        await cls.think_user_prediction(session, message)

        return thought, response


class Streamable:
    "A async iterator wrapper for langchain streams that saves on completion via callback"

    def __init__(self, iterator: AsyncIterator[BaseMessage], callback):
        self.iterator = iterator
        self.callback = callback
        self.content = ""
        self.stream_error = False

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            if self.stream_error:
                raise StopAsyncIteration

            data = await self.iterator.__anext__()
            self.content += data.content
            return data.content
        except StopAsyncIteration as e:
            self.callback(self.content)
            raise StopAsyncIteration
        except BadRequestError as e:
            if e.code == "content_filter":
                self.stream_error = True
                self.message = "Sorry, your message was flagged as inappropriate. Please try again."

                return self.message
            else:
                raise Exception(e)
        except Exception as e:
            sentry_sdk.capture_exception(e)

            self.stream_error = True
            self.message = "Sorry, an error occurred while streaming the response. Please try again."

            return self.message

    async def __call__(self):
        async for _ in self:
            pass
        return self.content


@sentry_sdk.trace
def unpack_messages(messages):
    unpacked = ""
    for message in messages:
        if isinstance(message, HumanMessage):
            unpacked += f"User: {message.content}\n"
        elif isinstance(message, AIMessage):
            unpacked += f"AI: {message.content}\n"
        # Add more conditions here if you're using other message types
    return unpacked
