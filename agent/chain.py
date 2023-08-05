import os
import validators

from langchain.chat_models import ChatOpenAI
from langchain.memory import ChatMessageHistory
from langchain.prompts import load_prompt

from agent.bloom_chain import BloomChain

from dotenv import load_dotenv

load_dotenv()

OBJECTIVE_SYSTEM_THOUGHT = load_prompt(os.path.join(os.path.dirname(__file__), 'data/prompts/objective/system/thought.yaml'))
OBJECTIVE_SYSTEM_RESPONSE = load_prompt(os.path.join(os.path.dirname(__file__), 'data/prompts/objective/system/response.yaml'))
# OBJECTIVE_HUMAN_THOUGHT = load_prompt(os.path.join(os.path.dirname(__file__), 'data/prompts/objective/human/thought.yaml'))
# OBJECTIVE_HUMAN_RESPONSE = load_prompt(os.path.join(os.path.dirname(__file__), 'data/prompts/objective/human/response.yaml'))

# OBJECTIVE_SYSTEM_THOUGHT = load_prompt("./data/prompts/objective/system/thought.yaml")
# OBJECTIVE_SYSTEM_RESPONSE = load_prompt("./data/prompts/objective/system/response.yaml")
# OBJECTIVE_HUMAN_THOUGHT = load_prompt("./data/prompts/objective/human/thought.yaml")
# OBJECTIVE_HUMAN_RESPONSE = load_prompt("./data/prompts/objective/human/response.yaml")
# OBJECTIVE_SUMMARY_THOUGHT = load_prompt("data/prompts/objective/summaries/thought.yaml")
# OBJECTIVE_SUMMARY_RESPONSE = load_prompt("data/prompts/objective/summaries/response.yaml")


def load_memories(conversation_type: str = "objective"):
    """Load the memory objects"""
    thought_memory: ChatMessageHistory
    response_memory: ChatMessageHistory

    # memory definitions
    if conversation_type == "objective":
        # thought_memory = ConversationBufferMemory(
        #     **thought_defaults
        # )

        # response_memory = ConversationBufferMemory(
        #     **response_defaults
        # )
        thought_memory = ChatMessageHistory()
        response_memory = ChatMessageHistory()
    else:
        print("Conversation type didn't default to objective")
        raise

    return (thought_memory, response_memory)


def load_chains():
    """Logic for loading the chain you want to use should go here."""
    llm = ChatOpenAI(model_name = "gpt-4", temperature=1.2)

    # define chain
    bloom_chain = BloomChain(
        llm=llm, 
        verbose=True
    )

    return bloom_chain


async def chat(**kwargs):
    # if we sent a thought across, generate a response
    if kwargs.get('thought'):
        assert kwargs.get('response_chain'), "Please pass the response chain."
        response_chain: BloomChain = kwargs.get('response_chain')
        response_memory: ChatMessageHistory = kwargs.get('response_memory')
        inp = kwargs.get('inp')
        thought = kwargs.get('thought')

        # get the history into a string
        # history = response_memory.load_memory_variables({})['history']

        # response = response_chain.apredict(
        #     input=inp,
        #     thought=thought,
        #     history=history
        # )

        response = response_chain.respond(response_memory, thought, inp)

        if 'Student:' in response:
            response = response.split('Student:')[0].strip()
        if 'Studen:' in response:
            response = response.split('Studen:')[0].strip()

        return response

    # otherwise, we're generating a thought
    else:
        assert kwargs.get('thought_chain'), "Please pass the thought chain."
        inp = kwargs.get('inp')
        thought_chain: BloomChain = kwargs.get('thought_chain')
        thought_memory: ChatMessageHistory = kwargs.get('thought_memory')

        # get the history into a string
        # history = thought_memory.load_memory_variables({})['history']
        
        # response = await thought_chain.apredict(
        #     input=inp,
        #     history=history
        # )

        response = thought_chain.think(thought_memory, inp)

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
