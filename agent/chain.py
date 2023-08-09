import os

from langchain.chat_models import ChatOpenAI
from langchain.memory import ChatMessageHistory
from langchain.prompts import (
    SystemMessagePromptTemplate,
)
from langchain.prompts import load_prompt, ChatPromptTemplate
from langchain.schema import AIMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

SYSTEM_THOUGHT = load_prompt(os.path.join(os.path.dirname(__file__), 'prompts/thought.yaml'))
SYSTEM_RESPONSE = load_prompt(os.path.join(os.path.dirname(__file__), 'prompts/response.yaml'))

class ConversationCache:
    "Wrapper Class for storing contexts between channels. Using an object to pass by reference avoid additional cache hits"
    def __init__(self):
        self.thought_memory: ChatMessageHistory = ChatMessageHistory()
        self.response_memory: ChatMessageHistory = ChatMessageHistory()

    def restart(self) -> None:
       self.thought_memory.clear()
       self.response_memory.clear()


class BloomChain:
    "Wrapper class for encapsulating the multiple different chains used in reasoning for the tutor's thoughts"
    def __init__(self, llm: ChatOpenAI = ChatOpenAI(model_name = "gpt-4", temperature=1.2), verbose: bool = True) -> None:
        self.llm = llm
        self.verbose = verbose

        # setup prompts
        self.system_thought = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
        self.system_response = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)
        

    def think(self, thought_memory: ChatMessageHistory, input: str):
        """Generate Bloom's thought on the user."""

        # load message history
        thought_prompt = ChatPromptTemplate.from_messages([
            self.system_thought,
            *thought_memory.messages,
            HumanMessage(content=input)
        ])
        chain = thought_prompt | self.llm 

        thought_memory.add_message(HumanMessage(content=input))
    
        return chain.astream({})
    
    def save_thought(self, thought: str, cache: ConversationCache) -> None:
        cache.thought_memory.add_message(AIMessage(content=thought))
        if self.verbose:
            print(f"Thought: {thought}")
    

    def respond(self, response_memory: ChatMessageHistory, thought: str, input: str):
        """Generate Bloom's response to the user."""

        response_prompt = ChatPromptTemplate.from_messages([
            self.system_response,
            *response_memory.messages,
            HumanMessage(content=input)
        ])
        chain = response_prompt | self.llm

        response_memory.add_message(HumanMessage(content=input))
        return chain.astream({ "thought": thought })
    
    def save_response(self, response: str, cache: ConversationCache) -> None:
        cache.response_memory.add_message(AIMessage(content=response))
        if self.verbose:
            print(f"Response: {response}")
        

    async def chat(self, cache: ConversationCache, inp: str ) -> tuple[str, str]:
        thought_iterator = self.think(cache.thought_memory, inp)
        # save thought to string
        thought = ""
        async for t in thought_iterator:
            thought += t.content
        self.save_thought(thought, cache)


        response_iterator = self.respond(cache.response_memory, thought, inp)
        # save response to string
        response = ""
        async for r in response_iterator:
            response += r.content
        self.save_response(response, cache)
        return thought, response
    



