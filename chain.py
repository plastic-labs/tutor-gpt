import os
from typing import Optional, Tuple, Deque

# import pandas as pd
from langchain import LLMChain
from langchain.chains.conversation.memory import ConversationalBufferWindowMemory
from langchain.prompts import PromptTemplate
from langchain.llms import OpenAI
from langchain.prompts import load_prompt

from dotenv import load_dotenv

load_dotenv()


PROMPT_TEMPLATE = load_prompt("data/prompts/original_prompt.yaml")

def load_chain():
    """Logic for loading the chain you want to use should go here."""
    llm = OpenAI(temperature=0.9)   # defaults to text-davinci-003 i think
    chain = LLMChain(
        llm=llm, 
        memory=ConversationalBufferWindowMemory(
            k=15, 
            memory_key="history",   # when you have multiple inputs, you need to specify which inputs to record for history
            input_key="input",
            ai_prefix="Tutor",
            human_prefix="Student"
        ), 
        prompt=PROMPT_TEMPLATE, 
        verbose=True
    )
    return chain


async def chat(
    context: str, inp: str, history: Deque[Tuple[str, str]], chain: Optional[LLMChain] 
):
    """Execute the chat functionality."""
    # history = history or []
    
    # If chain is None, that is because no API key was provided.
    if chain is None:
        history.append((inp, "Please set your OpenAI key to use"))
        return history, history

    # Run chain and append input.
    try:
        output = chain.predict(context=context, input=inp)
    except Exception as e:
        output = str(e)
    history.append((inp, output))

    return output


