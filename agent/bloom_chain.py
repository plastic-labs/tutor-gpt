import os

from langchain.chat_models import ChatOpenAI
from langchain.memory import ChatMessageHistory
from langchain.prompts import (
    SystemMessagePromptTemplate,
)
from langchain.prompts import load_prompt
from langchain.schema import AIMessage, HumanMessage


OBJECTIVE_SYSTEM_THOUGHT = load_prompt(os.path.join(os.path.dirname(__file__), 'data/prompts/objective/system/thought.yaml'))
OBJECTIVE_SYSTEM_RESPONSE = load_prompt(os.path.join(os.path.dirname(__file__), 'data/prompts/objective/system/response.yaml'))

class BloomChain:
    def __init__(self, llm: ChatOpenAI, verbose: bool = False):
        self.llm = llm
        self.verbose = verbose

        # setup prompts
        self.system_thought = SystemMessagePromptTemplate(prompt=OBJECTIVE_SYSTEM_THOUGHT)
        self.system_response = SystemMessagePromptTemplate(prompt=OBJECTIVE_SYSTEM_RESPONSE)
        

    def think(self, thought_memory: ChatMessageHistory, input: str):
        """Generate Bloom's thought on the user."""

        # load message history
        messages = [self.system_thought.format(), *thought_memory.messages, HumanMessage(content=input)]
        thought_message = self.llm.predict_messages(messages)

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
    

    def respond(self, response_memory: ChatMessageHistory, thought: str, input: str):
        """Generate Bloom's response to the user."""

        # load message history
        messages = [self.system_response.format(), *response_memory.messages, HumanMessage(content=input), AIMessage(content=f"Thought: {thought}")]
        response_message = self.llm.predict_messages(messages)

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
    