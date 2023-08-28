import os
from langchain.chat_models import ChatOpenAI
from langchain.prompts import (
    SystemMessagePromptTemplate,
)
from langchain.prompts import load_prompt, ChatPromptTemplate
from langchain.schema import AIMessage, HumanMessage, BaseMessage
from dotenv import load_dotenv
from collections.abc import AsyncIterator, Awaitable
from typing import Any, List
import asyncio
import uuid
from .mediator import SupabaseMediator


load_dotenv()

SYSTEM_THOUGHT = load_prompt(os.path.join(os.path.dirname(__file__), 'prompts/thought.yaml'))
SYSTEM_RESPONSE = load_prompt(os.path.join(os.path.dirname(__file__), 'prompts/response.yaml'))

class ConversationCache:
    "Wrapper Class for storing contexts between channels. Using an object to pass by reference avoid additional cache hits"
    def __init__(self, mediator):
        self.conversation_id: str = str(uuid.uuid4())
        self.mediator: SupabaseMediator = mediator
        self.user_id: str

    def add_message(self, message_type: str, message: BaseMessage,) -> None:
        self.mediator.add_message(self.conversation_id, self.user_id, message_type, message)

    def messages(self, message_type: str) -> List[BaseMessage]:
        return self.mediator.messages(self.conversation_id, self.user_id, message_type)

    def restart(self) -> None:
       self.conversation_id: str = str(uuid.uuid4()) # New Conversation Id 

class BloomChain:
    "Wrapper class for encapsulating the multiple different chains used in reasoning for the tutor's thoughts"
    def __init__(self, llm: ChatOpenAI = ChatOpenAI(model_name = "gpt-4", temperature=1.2), verbose: bool = True) -> None:
        self.llm = llm
        self.verbose = verbose

        # setup prompts
        self.system_thought = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
        self.system_response = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)
        

    def think(self, cache: ConversationCache, input: str):
        """Generate Bloom's thought on the user."""

        # load message history
        thought_prompt = ChatPromptTemplate.from_messages([
            self.system_thought,
            *cache.messages("thought"),
            HumanMessage(content=input)
        ])
        chain = thought_prompt | self.llm 

        cache.add_message("thought", HumanMessage(content=input))

        return Streamable(
                chain.astream({}, {"tags": ["thought"], "metadata": {"conversation_id": cache.conversation_id, "user_id": cache.user_id}}),
            lambda thought: cache.add_message("thought", AIMessage(content=thought))
        )

    def respond(self, cache: ConversationCache, thought: str, input: str):
        """Generate Bloom's response to the user."""

        response_prompt = ChatPromptTemplate.from_messages([
            self.system_response,
            *cache.messages("response"),
            HumanMessage(content=input)
        ])
        chain = response_prompt | self.llm

        cache.add_message("response", HumanMessage(content=input))

        return Streamable(
            chain.astream({ "thought": thought }, {"tags": ["response"], "metadata": {"conversation_id": cache.conversation_id, "user_id": cache.user_id}}),
            lambda response: cache.add_message("response", AIMessage(content=response))
        )
    
        

    async def chat(self, cache: ConversationCache, inp: str ) -> tuple[str, str]:
        thought_iterator = self.think(cache, inp)
        thought = await thought_iterator()

        response_iterator = self.respond(cache, thought, inp)
        response = await response_iterator()

        return thought, response


class Streamable:
    "A async iterator wrapper for langchain streams that saves on completion via callback"

    def __init__(self, iterator: AsyncIterator[BaseMessage], callback):
        self.iterator = iterator
        self.callback = callback
        # self.content: List[Awaitable[BaseMessage]] = []
        self.content = ""
    
    def __aiter__(self):
        return self
    
    async def __anext__(self):
        try:
            data = await self.iterator.__anext__()
            self.content += data.content
            return self.content
        except StopAsyncIteration as e:
            self.callback(self.content)
            raise StopAsyncIteration
        except Exception as e:
            raise e
    
    async def __call__(self):
        async for _ in self:
            pass
        return self.content
        
