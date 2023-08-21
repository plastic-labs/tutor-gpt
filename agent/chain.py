import os

from langchain.chat_models import ChatOpenAI
from langchain.memory import ChatMessageHistory, PostgresChatMessageHistory
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
import urllib


load_dotenv()

SYSTEM_THOUGHT = load_prompt(os.path.join(os.path.dirname(__file__), 'prompts/thought.yaml'))
SYSTEM_RESPONSE = load_prompt(os.path.join(os.path.dirname(__file__), 'prompts/response.yaml'))

class InMemoryConversationCache:
    "Wrapper Class for storing contexts between channels. Using an object to pass by reference avoid additional cache hits"
    def __init__(self):
        self.thought_memory: ChatMessageHistory = ChatMessageHistory()
        self.response_memory: ChatMessageHistory = ChatMessageHistory()
        self.conversation_id: str = str(uuid.uuid4())


    def restart(self) -> None:
       self.thought_memory.clear()
       self.response_memory.clear()
       self.conversation_id: str = str(uuid.uuid4()) # New Conversation Id 

class ConversationCache:
    "Wrapper Class for storing contexts between channels. Using an object to pass by reference avoid additional cache hits"
    def __init__(self):
        # Eventually could mix this with a summary memory object: https://python.langchain.com/docs/modules/memory/agent_with_memory_in_db
        # self.thought_history = PostgresChatMessageHistory()
        # self.response_history = PostgresChatMessageHistory()
        self.conversation_id: str = str(uuid.uuid4())
        # Note the importance of escaping for the connection string make sure that "/:@" are all considered safe
        self.thought_memory: PostgresChatMessageHistory = PostgresChatMessageHistory(
                connection_string=urllib.parse.quote(os.environ["SUPABASE_CONNECTION_URL"], safe='/:@', encoding=None, errors=None),
            session_id=self.conversation_id
        )
        self.response_memory: PostgresChatMessageHistory = PostgresChatMessageHistory(
            connection_string=urllib.parse.quote(os.environ["SUPABASE_CONNECTION_URL"], safe='/:@', encoding=None, errors=None),
            session_id=self.conversation_id
        )

    def restart(self):
        self.conversation_id: str = str(uuid.uuid4())
        self.thought_memory.session_id = self.conversation_id
        self.response_memory.session_id = self.conversation_id

class BloomChain:
    "Wrapper class for encapsulating the multiple different chains used in reasoning for the tutor's thoughts"
    def __init__(self, llm: ChatOpenAI = ChatOpenAI(model_name = "gpt-4", temperature=1.2), verbose: bool = True) -> None:
        self.llm = llm
        self.verbose = verbose

        # setup prompts
        self.system_thought = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
        self.system_response = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)
        

    def think(self, thought_memory: ChatMessageHistory, conversation_id: str, input: str):
        """Generate Bloom's thought on the user."""

        # load message history
        thought_prompt = ChatPromptTemplate.from_messages([
            self.system_thought,
            *thought_memory.messages,
            HumanMessage(content=input)
        ])
        chain = thought_prompt | self.llm 

        thought_memory.add_message(HumanMessage(content=input))

        return Streamable(
                chain.astream({}, {"tags": ["thought"], "metadata": {"conversation_id": conversation_id}}),
            lambda thought: thought_memory.add_message(AIMessage(content=thought))
        )

    def respond(self, response_memory: ChatMessageHistory, thought: str, conversation_id: str, input: str):
        """Generate Bloom's response to the user."""

        response_prompt = ChatPromptTemplate.from_messages([
            self.system_response,
            *response_memory.messages,
            HumanMessage(content=input)
        ])
        chain = response_prompt | self.llm

        response_memory.add_message(HumanMessage(content=input))

        return Streamable(
            chain.astream({ "thought": thought }, {"tags": ["response"], "metadata": {"conversation_id": conversation_id}}),
            lambda response: response_memory.add_message(AIMessage(content=response))
        )
    
        

    async def chat(self, cache: ConversationCache, inp: str ) -> tuple[str, str]:
        conversation_id = cache.conversation_id
        thought_iterator = self.think(cache.thought_memory, conversation_id, inp)
        thought = await thought_iterator()


        response_iterator = self.respond(cache.response_memory, thought, conversation_id, inp)
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
        
