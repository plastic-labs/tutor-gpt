import os
import validators

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
        # self.thought_memory: ChatMessageHistory
        # self.response_memory: ChatMessageHistory
        self.thought_memory: ChatMessageHistory = ChatMessageHistory()
        self.response_memory: ChatMessageHistory = ChatMessageHistory()


    def restart(self):
       self.thought_memory.clear()
       self.response_memory.clear()

class BloomChain:
    def __init__(self, llm: ChatOpenAI, verbose: bool = False):
        self.llm = llm
        self.verbose = verbose

        # setup prompts
        self.system_thought = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
        self.system_response = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)
        

    async def think(self, thought_memory: ChatMessageHistory, input: str):
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
        thought_memory.add_message(thought_message)

        return thought_message.content
    

    async def respond(self, response_memory: ChatMessageHistory, thought: str, input: str):
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
        response_memory.add_message(response_message)

        return response_message.content
    
    async def chat(self, cache: ConversationCache, inp: str ) -> tuple[str, str]:
        thought  = await self.think(cache.thought_memory, inp)
        response = await self.respond(cache.response_memory, thought, inp)
        return thought, response
    #async def chat(self, **kwargs):
    # if we sent a thought across, generate a response
    #     if kwargs.get('thought'):
    #         assert kwargs.get('response_chain'), "Please pass the response chain."
    #         response_chain: BloomChain = kwargs.get('response_chain')
    #         response_memory: ChatMessageHistory = kwargs.get('response_memory')
    #         inp = kwargs.get('inp')
    #         thought = kwargs.get('thought')

    #         # get the history into a string
    #         # history = response_memory.load_memory_variables({})['history']

    #         # response = response_chain.apredict(
    #         #     input=inp,
    #         #     thought=thought,
    #         #     history=history
    #         # )

    #         response = response_chain.respond(response_memory, thought, inp)

    #         if 'Student:' in response:
    #             response = response.split('Student:')[0].strip()
    #         if 'Studen:' in response:
    #             response = response.split('Studen:')[0].strip()

    #         return response

    #     # otherwise, we're generating a thought
    #     else:
    #         assert kwargs.get('thought_chain'), "Please pass the thought chain."
    #         inp = kwargs.get('inp')
    #         thought_chain: BloomChain = kwargs.get('thought_chain')
    #         thought_memory: ChatMessageHistory = kwargs.get('thought_memory')

    #         # get the history into a string
    #         # history = thought_memory.load_memory_variables({})['history']
    #         
    #         # response = await thought_chain.apredict(
    #         #     input=inp,
    #         #     history=history
    #         # )

    #         response = thought_chain.think(thought_memory, inp)

    #         if 'Tutor:' in response:
    #             response = response.split('Tutor:')[0].strip()

    #         return response


# def load_memories():
#     """Load the memory objects"""
#     thought_memory: ChatMessageHistory
#     response_memory: ChatMessageHistory
# 
#     # memory definitions
#     thought_memory = ChatMessageHistory()
#     response_memory = ChatMessageHistory()
# 
# 
#     return (thought_memory, response_memory)


def load_chains():
    """Logic for loading the chain you want to use should go here."""
    llm = ChatOpenAI(model_name = "gpt-4", temperature=1.2)

    # define chain
    bloom_chain = BloomChain(
        llm=llm, 
        verbose=True
    )

    return bloom_chain


