import os
import validators

from langchain.chat_models import ChatOpenAI
from langchain import LLMChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain.prompts import load_prompt

from dotenv import load_dotenv

load_dotenv()


OBJECTIVE_SYSTEM_THOUGHT = load_prompt("data/prompts/objective/system/thought.yaml")
OBJECTIVE_SYSTEM_RESPONSE = load_prompt("data/prompts/objective/system/response.yaml")
OBJECTIVE_HUMAN_THOUGHT = load_prompt("data/prompts/objective/human/thought.yaml")
OBJECTIVE_HUMAN_RESPONSE = load_prompt("data/prompts/objective/human/response.yaml")
# OBJECTIVE_SUMMARY_THOUGHT = load_prompt("data/prompts/objective/summaries/thought.yaml")
# OBJECTIVE_SUMMARY_RESPONSE = load_prompt("data/prompts/objective/summaries/response.yaml")


def load_memories(conversation_type: str = "objective"):
    """Load the memory objects"""
    thought_defaults = {
        "memory_key":"history",
        "input_key":"input",
        "ai_prefix":"Thought",
        "human_prefix":"User",
    }
    response_defaults = {
        "memory_key":"history",
        "input_key":"input",
        "ai_prefix":"Bloom",
        "human_prefix":"User",
    }
    thought_memory: ConversationBufferMemory
    response_memory: ConversationBufferMemory
    # memory definitions
    if conversation_type == "objective":
        thought_memory = ConversationBufferMemory(
            **thought_defaults
        )

        response_memory = ConversationBufferMemory(
            **response_defaults
        )
    else:
        print("Conversation type didn't default to objective")
        raise

    return (thought_memory, response_memory)


def load_chains():
    """Logic for loading the chain you want to use should go here."""
    llm = ChatOpenAI(model_name = "gpt-4", temperature=1.2)

    # chatGPT prompt formatting
    objective_system_thought = SystemMessagePromptTemplate(prompt=OBJECTIVE_SYSTEM_THOUGHT)
    objective_system_response = SystemMessagePromptTemplate(prompt=OBJECTIVE_SYSTEM_RESPONSE)

    objective_human_thought = HumanMessagePromptTemplate(prompt=OBJECTIVE_HUMAN_THOUGHT)
    objective_human_response = HumanMessagePromptTemplate(prompt=OBJECTIVE_HUMAN_RESPONSE)

    objective_thought_chat_prompt = ChatPromptTemplate.from_messages([objective_system_thought, objective_human_thought])
    objective_response_chat_prompt = ChatPromptTemplate.from_messages([objective_system_response, objective_human_response])

    # define chains
    objective_thought_chain = LLMChain(
        llm=llm,
        prompt=objective_thought_chat_prompt,
        verbose=True
    )

    objective_response_chain = LLMChain(
        llm=llm,
        prompt=objective_response_chat_prompt,
        verbose=True
    )

    return ( 
        objective_thought_chain, 
        objective_response_chain,
    )


async def chat(**kwargs):
    # if we sent a thought across, generate a response
    if kwargs.get('thought'):
        assert kwargs.get('response_chain'), "Please pass the response chain."
        response_chain = kwargs.get('response_chain')
        response_memory = kwargs.get('response_memory')
        inp = kwargs.get('inp')
        thought = kwargs.get('thought')

        # get the history into a string
        history = response_memory.load_memory_variables({})['history']

        response = await response_chain.apredict(
            input=inp,
            thought=thought,
            history=history
        )
        if 'Student:' in response:
            response = response.split('Student:')[0].strip()
        if 'Studen:' in response:
            response = response.split('Studen:')[0].strip()

        return response

    # otherwise, we're generating a thought
    else:
        assert kwargs.get('thought_chain'), "Please pass the thought chain."
        inp = kwargs.get('inp')
        thought_chain = kwargs.get('thought_chain')
        thought_memory = kwargs.get('thought_memory')

        # get the history into a string
        history = thought_memory.load_memory_variables({})['history']
        
        response = await thought_chain.apredict(
            input=inp,
            history=history
        )

        if 'Tutor:' in response:
            response = response.split('Tutor:')[0].strip()

        return response


class ConversationCache:
    "Wrapper Class for storing contexts between channels. Using an object to pass by reference avoid additional cache hits"
    def __init__(self, conversation_type="objective"):
        self.thought_memory, self.response_memory = load_memories(conversation_type)
        self.conversation_type = conversation_type


    def restart(self):
       self.thought_memory.clear()
       self.response_memory.clear()
       self.convo_type = None
