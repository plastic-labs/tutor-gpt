from typing import Optional, Tuple, Deque
import rollbar
import os

# import pandas as pd
from langchain import LLMChain
from langchain.chains.conversation.memory import ConversationSummaryBufferMemory
from langchain.llms import OpenAI
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

THOUGHT_PROMPT_TEMPLATE = load_prompt("data/prompts/thought_prompt.yaml")
RESPONSE_PROMPT_TEMPLATE = load_prompt("data/prompts/response_prompt.yaml")
THOUGHT_SUMMARY_TEMPLATE = load_prompt("data/prompts/thought_summary_prompt.yaml")
RESPONSE_SUMMARY_TEMPLATE = load_prompt("data/prompts/response_summary_prompt.yaml")


def load_chains():
    """Logic for loading the chain you want to use should go here."""
    llm = OpenAI(temperature=0.9)
    llm_thought_summary = OpenAI(max_tokens=75)  # how long we want our academic needs list to be
    llm_response_summary = OpenAI(max_tokens=150) # how long we want our dialogue summary to be
    thought_chain = LLMChain(
        llm=llm, 
        memory=ConversationSummaryBufferMemory(
            prompt=THOUGHT_SUMMARY_TEMPLATE,
            max_token_limit=100,  # how much of the history we're trying to summarize
            llm=llm_thought_summary,
            memory_key="history",   # when you have multiple inputs, you need to specify which inputs to record for history
            input_key="input",
            ai_prefix="Thought",
            human_prefix="Student"
        ), 
        prompt=THOUGHT_PROMPT_TEMPLATE, 
        verbose=True
    )

    response_chain = LLMChain(
        llm=llm, 
        memory=ConversationSummaryBufferMemory(
            prompt=RESPONSE_SUMMARY_TEMPLATE,
            max_token_limit=100, 
            llm=llm_response_summary,
            memory_key="history",   # when you have multiple inputs, you need to specify which inputs to record for history
            input_key="input",
            ai_prefix="Tutor",
            human_prefix="Student"
        ), 
        prompt=RESPONSE_PROMPT_TEMPLATE, 
        verbose=True
    )


    return thought_chain, response_chain


async def chat(
    context: str, 
    inp: str, 
    thought_chain: Optional[LLMChain], 
    response_chain: Optional[LLMChain]
):
    """Execute the chat functionality."""
    # history = history or []
    
    # If chain is None, that is because no API key was provided.
    if thought_chain is None:
        print("Please set your OpenAI key to use")
        return
    if response_chain is None:
        print("Please set your OpenAI key to use")
        return

    # Run chains and append input.
    try:
        thought = thought_chain.predict(
            context=context, 
            input=inp
        )
        if 'Tutor:' in thought:
            thought = thought.split('Tutor:')[0].strip()
    except Exception as e:
        rollbar.report_exc_info()
        thought = str(e)

    try:
        response = response_chain.predict(
            context=context,
            input=inp,
            thought=thought
        )
        if 'Student:' in response:
            response = response.split('Student:')[0].strip()
        if 'Studen:' in response:  # this happened once: https://discord.com/channels/1016845111637839922/1073429619639853066/1080233497073025065
            response = response.split('Studen:')[0].strip()
    except Exception as e:
        rollbar.report_exc_info()
        response = str(e)

    # log this
    # history.append((inp, thought, response))

    return response, thought


