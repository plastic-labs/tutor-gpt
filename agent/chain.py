import os

from langchain.chat_models import ChatOpenAI
from langchain.memory import ChatMessageHistory
from langchain.prompts import (
    SystemMessagePromptTemplate,
)
from langchain.prompts import load_prompt
from langchain.schema import AIMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

SYSTEM_THOUGHT = load_prompt(os.path.join(os.path.dirname(__file__), 'data/prompts/system/thought.yaml'))
SYSTEM_RESPONSE = load_prompt(os.path.join(os.path.dirname(__file__), 'data/prompts/system/response.yaml'))

class ConversationCache:
    "Wrapper Class for storing contexts between channels. Using an object to pass by reference avoid additional cache hits"
    def __init__(self):
        self.thought_memory: ChatMessageHistory = ChatMessageHistory()
        self.response_memory: ChatMessageHistory = ChatMessageHistory()


    def restart(self) -> None:
       self.thought_memory.clear()
       self.response_memory.clear()

class BloomChain:
    "Wrapper class for encapsulating the multiple different chains used in reasoning for the tutor's thoughts"
    def __init__(self, llm: ChatOpenAI, verbose: bool = False) -> None:
        self.llm = llm
        self.verbose = verbose

        # setup prompts
        self.system_thought = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
        self.system_response = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)
        

    async def think(self, thought_memory: ChatMessageHistory, input: str) -> str:
        """Generate Bloom's thought on the user."""

        # load message history
        messages = [self.system_thought.format(), *thought_memory.messages, HumanMessage(content=input)]
        thought_message = await self.llm.apredict_messages(messages)

        # verbose logging
        if self.verbose:
            # Seralize messages to strings
            message_strings = [f"{message.type}: {message.content}" for message in messages]
            print("Thought Conversation: ```\n", "\n\n".join(message_strings), "\n```\n")

            print("New Thought: ```\n", thought_message.content, "\n```\n")

        # update chat memory
        thought_memory.add_message(HumanMessage(content=input))
        thought_memory.add_message(thought_message) # apredict_messages returns AIMessage so can add directly

        return thought_message.content
    

    async def respond(self, response_memory: ChatMessageHistory, thought: str, input: str) -> str:
        """Generate Bloom's response to the user."""

        # load message history
        messages = [self.system_response.format(thought=thought), *response_memory.messages, HumanMessage(content=input)]
        response_message = await self.llm.apredict_messages(messages)

        # verbose logging
        if self.verbose:
            # Seralize messages to strings
            message_strings = [f"{message.type}: {message.content}" for message in messages]
            print("Response Conversation: ```\n", "\n\n".join(message_strings), "\n```\n")

            print("New Response: ```\n", response_message.content, "\n```\n")

        # update chat memory
        response_memory.add_message(HumanMessage(content=input))
        response_memory.add_message(response_message) # apredict_messages returns AIMessage so can add directly

        return response_message.content
    
    async def chat(self, cache: ConversationCache, inp: str ) -> tuple[str, str]:
        thought  = await self.think(cache.thought_memory, inp)
        response = await self.respond(cache.response_memory, thought, inp)
        return thought, response

def load_chains() -> BloomChain:
    """Logic for loading the chain you want to use should go here."""
    llm = ChatOpenAI(model_name = "gpt-4", temperature=1.2)

    # define chain
    bloom_chain = BloomChain(
        llm=llm, 
        verbose=True
    )

    return bloom_chain


