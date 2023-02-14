import os, re
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

    # parse output for just the response, thought
    thought = ''
    tutor_text = ''
    student_text = ''
    if 'Tutor:' in output:
        thought = output.split('Tutor:')[0].strip()
        tutor_text = output.split('Tutor:')[1]
        if 'Student:' in tutor_text:
            student_text = tutor_text.split('Student:')[1].strip()
            tutor_text = tutor_text.split('Student:')[0].strip()
        else:
            tutor_text = tutor_text.strip()

    history.append((inp, tutor_text))

    return output, tutor_text, thought


