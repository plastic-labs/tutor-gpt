import rollbar
import os

from langchain.chat_models import ChatOpenAI
from langchain import LLMChain
from langchain.memory import ConversationSummaryBufferMemory
from langchain.prompts.chat import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain.prompts import load_prompt

from dotenv import load_dotenv

load_dotenv()

rollbar_token = os.environ['ROLLBAR_TOKEN']
rollbar_env = os.environ['ROLLBAR_ENV']

rollbar.init(
    access_token=rollbar_token,
    environment=rollbar_env,
    code_version='1.0'
)

STARTER_PROMPT_TEMPLATE = load_prompt("data/prompts/starter_prompt.yaml")
THOUGHT_PROMPT_TEMPLATE = load_prompt("data/prompts/thought_prompt.yaml")
RESPONSE_PROMPT_TEMPLATE = load_prompt("data/prompts/response_prompt.yaml")
THOUGHT_SUMMARY_TEMPLATE = load_prompt("data/prompts/thought_summary_prompt.yaml")
RESPONSE_SUMMARY_TEMPLATE = load_prompt("data/prompts/response_summary_prompt.yaml")


def load_memories():
    """Load the memory objects"""
    llm = ChatOpenAI() 
    
    # memory definitions
    thought_memory = ConversationSummaryBufferMemory(
        llm=llm,
        memory_key="history",
        input_key="input",
        ai_prefix="Thought",
        human_prefix="Student",
        max_token_limit=1000
    )

    response_memory = ConversationSummaryBufferMemory(
        llm=llm,
        memory_key="history",
        input_key="input",
        ai_prefix="Tutor",
        human_prefix="Student",
        max_token_limit=1000
    )

    return thought_memory, response_memory


def load_chains(thought_memory, response_memory):
    """Logic for loading the chain you want to use should go here."""
    llm = ChatOpenAI(temperature=0.9)

    # chatGPT prompt formatting
    starter_message_prompt = HumanMessagePromptTemplate(prompt=STARTER_PROMPT_TEMPLATE)
    thought_message_prompt = HumanMessagePromptTemplate(prompt=THOUGHT_PROMPT_TEMPLATE)
    response_message_prompt = HumanMessagePromptTemplate(prompt=RESPONSE_PROMPT_TEMPLATE)

    starter_chat_prompt = ChatPromptTemplate.from_messages([starter_message_prompt])
    thought_chat_prompt = ChatPromptTemplate.from_messages([thought_message_prompt])
    response_chat_prompt = ChatPromptTemplate.from_messages([response_message_prompt])

    # define chains
    starter_chain = LLMChain(
        llm=llm,
        prompt=starter_chat_prompt,
        verbose=True
    )

    thought_chain = LLMChain(
        llm=llm,
        prompt=thought_chat_prompt,
        memory=thought_memory,
        verbose=True
    )

    response_chain = LLMChain(
        llm=llm, 
        prompt=response_chat_prompt, 
        memory=response_memory,
        verbose=True
    )

    return starter_chain, thought_chain, response_chain


async def chat(**kwargs):
    # if there's no input, generate a starter
    if kwargs.get('inp') is None:
        assert kwargs.get('starter_chain'), "Please pass the starter chain."
        starter_chain = kwargs.get('starter_chain')
        context = kwargs.get('context')

        response = starter_chain.predict(
            context=context
        )
        
        return response
    
    # if we sent a thought across, generate a response
    if kwargs.get('thought'):
        assert kwargs.get('response_chain'), "Please pass the response chain."
        response_chain = kwargs.get('response_chain')
        response_memory = kwargs.get('response_memory')
        context = kwargs.get('context')
        inp = kwargs.get('inp')
        thought = kwargs.get('thought')

        # get the history into a string
        history = response_memory.load_memory_variables({})['history']

        response = response_chain.predict(
            context=context,
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
        context = kwargs.get('context')

        # get the history into a string
        history = thought_memory.load_memory_variables({})['history']
        
        response = thought_chain.predict(
            context=context,
            input=inp,
            history=history
        )
        
        if 'Tutor:' in response:
            response = response.split('Tutor:')[0].strip()
        
        return response


