import os, re
from typing import Optional, Tuple, Deque

# import pandas as pd
from langchain import LLMChain
from langchain.chains.conversation.memory import ConversationSummaryBufferMemory
from langchain.chains import SimpleSequentialChain
from langchain.prompts import PromptTemplate
from langchain.llms import OpenAI
from langchain.prompts import load_prompt

from dotenv import load_dotenv

load_dotenv()


THOUGHT_PROMPT_TEMPLATE = load_prompt("data/prompts/thought_prompt.yaml")
RESPONSE_PROMPT_TEMPLATE = load_prompt("data/prompts/response_prompt.yaml")


def load_chains():
    """Logic for loading the chain you want to use should go here."""
    llm = OpenAI(temperature=0.9)   # defaults to text-davinci-003
    thought_chain = LLMChain(
        llm=llm, 
        memory=ConversationSummaryBufferMemory(
            max_token_limit=250,
            llm=llm,
            memory_key="history",
            input_key="input",
            ai_prefix="Thought",
            human_prefix="Student",
        ), 
        prompt=THOUGHT_PROMPT_TEMPLATE, 
        verbose=True
    )

    response_chain = LLMChain(
        llm=llm, 
        memory=ConversationSummaryBufferMemory(
            max_token_limit=250, 
            llm=llm,
            memory_key="history",
            input_key="thought",
            ai_prefix="Tutor",
            human_prefix="Student",
        ), 
        prompt=RESPONSE_PROMPT_TEMPLATE, 
        verbose=True
    )


    return thought_chain, response_chain


async def chat(
    context: str, 
    inp: str, 
    thought_history: Deque[Tuple[str, str, str]], 
    response_history: Deque[Tuple[str, str, str]], 
    thought_chain: Optional[LLMChain], 
    response_chain: Optional[LLMChain]
):
    """Execute the chat functionality."""
    # history = history or []
    
    # If chain is None, that is because no API key was provided.
    if thought_chain is None:
        thought_history.append((str("Student: " + inp), "Please set your OpenAI key to use"))
        return thought_history, thought_history
    if response_chain is None:
        response_history.append((str("Student: " + inp), "Please set your OpenAI key to use"))
        return response_history, response_history

    # Run chains and append input.
    try:
        thought = thought_chain.predict(
            context=context, 
            history=response_history, 
            input=inp
        )
        if 'Tutor:' in thought:
            thought = thought.split('Tutor:')[0].strip()
        print(f"Thought: {thought}")
    except Exception as e:
        thought = str(e)

    try:
        response = response_chain.predict(
            context=context,
            history=response_history,
            input=inp,
            thought=thought
        )
        if 'Student:' in response:
            response = response.split('Student:')[0].strip()
        print(f"Response: {response}")
    except Exception as e:
        response = str(e)

    #thought_history.append((inp, thought))
    response_history.append((inp, thought, response))

    return response, thought


