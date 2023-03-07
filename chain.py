from typing import Optional
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

STARTER_PROMPT_TEMPLATE = load_prompt("data/prompts/starter_prompt.yaml")
THOUGHT_PROMPT_TEMPLATE = load_prompt("data/prompts/thought_prompt.yaml")
RESPONSE_PROMPT_TEMPLATE = load_prompt("data/prompts/response_prompt.yaml")
THOUGHT_SUMMARY_TEMPLATE = load_prompt("data/prompts/thought_summary_prompt.yaml")
RESPONSE_SUMMARY_TEMPLATE = load_prompt("data/prompts/response_summary_prompt.yaml")


def load_chains():
    """Logic for loading the chain you want to use should go here."""
    llm = OpenAI(temperature=0.9)
    llm_thought_summary = OpenAI(max_tokens=75)  # how long we want our academic needs list to be
    llm_response_summary = OpenAI(max_tokens=150) # how long we want our dialogue summary to be

    starter_chain = LLMChain(
        llm=llm,
        prompt=STARTER_PROMPT_TEMPLATE,
        verbose=True
    )

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


    return starter_chain, thought_chain, response_chain


async def chat(**kwargs):
    # if there's no input, generate a starter
    if kwargs.get('inp') is None:
        assert kwargs.get('starter_chain'), "Please pass the starter chain."
        response = kwargs.get('starter_chain').predict(
            context=kwargs.get('context')
        )
        
        return response
    # if we sent a thought across, generate a response
    if kwargs.get('thought'):
        assert kwargs.get('response_chain'), "Please pass the response chain."
        response = kwargs.get('response_chain').predict(
            context=kwargs.get('context'),
            input=kwargs.get('inp'),
            thought=kwargs.get('thought')
        )
        if 'Student:' in response:
            response = response.split('Student:')[0].strip()
        if 'Studen:' in response:
            response = response.split('Studen:')[0].strip()
        
        return response
    # otherwise, we're generating a thought
    else:
        assert kwargs.get('thought_chain'), "Please pass the thought chain."
        if kwargs.get('inp').isspace() or kwargs.get('inp') == '':
            response = "Yes? How can I help?"
            return response
        
        response = kwargs.get('thought_chain').predict(
            context=kwargs.get('context'),
            input=kwargs.get('inp')
        )
        
        if 'Tutor:' in response:
            response = response.split('Tutor:')[0].strip()
        
        
        return response


