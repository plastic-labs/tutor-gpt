import os

from langchain.chat_models import ChatOpenAI
from langchain.memory import ChatMessageHistory
from langchain.prompts import (
    SystemMessagePromptTemplate,
    ChatPromptTemplate,
)
from langchain.prompts import load_prompt
from langchain.schema import AIMessage, HumanMessage, BaseMessage

from langchain.vectorstores import FAISS
from langchain.embeddings import OpenAIEmbeddings
from langchain.schema import Document

from langchain.agents import load_tools, initialize_agent, AgentType
from langchain.tools import format_tool_to_openai_function
from langchain.tools.python.tool import PythonREPLTool

from agent.langchain_agents.react_openai_functions_agent import initialize_react_openai_agent

from agent.tools.askquestion import AskQuestion
from agent.tools.wolframalphafull import WolframAlphaFull

from dotenv import load_dotenv

from collections.abc import AsyncIterator, Awaitable
from typing import Any, List
import asyncio


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
    def __init__(self, llm: ChatOpenAI = ChatOpenAI(model_name = "gpt-4", temperature=1.2), fast_llm: ChatOpenAI = ChatOpenAI(model_name = "gpt-4-0613", temperature=0.3), verbose: bool = True) -> None:
        self.llm = llm
        self.fast_llm = fast_llm
        self.verbose = verbose

        # setup prompts
        self.system_thought = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
        self.system_response = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)

        wolframalpha = WolframAlphaFull()
        self.tools = load_tools(["google-serper", "wikipedia", "arxiv"], llm=self.llm) + [PythonREPLTool(), wolframalpha]
        tool_documents = [Document(page_content=tool.description, metadata={"index": index}) for index, tool in enumerate(self.tools)]
        tool_vectorstore = FAISS.from_documents(tool_documents, OpenAIEmbeddings())
        self.tool_retriever = tool_vectorstore.as_retriever()
        self.functions = [format_tool_to_openai_function(tool) for tool in self.tools]

        

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

        return Streamable(
            chain.astream({}, {"tags": ["thought"]}),
            lambda thought: thought_memory.add_message(AIMessage(content=thought))
        )
    
    async def gather_info(self, response_memory: ChatMessageHistory, input: str, thought: str) -> str:
        """Collect information via tool."""
        tool_thought = thought.split("Tooling:")[1].split("Data:")[0].strip() # separate tool information from thought
        ready = "true" in thought.split("Ready:")[1].strip().lower()
        print("Ready:", ready)
        if not ready:
            return "Not ready to gather information"

        relevant_tools = self.tool_retriever.get_relevant_documents(tool_thought)
        print("Relevant Tools: ", relevant_tools)
        actual_tools = [self.tools[tool.metadata["index"]] for tool in relevant_tools]
        actual_tools.append(AskQuestion())

        # agent = initialize_agent(actual_tools, self.llm, AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=self.verbose)
        # information = agent.run(f"gather relevant information to this user's question: {input}", fun) 
        history = "\n".join([f"{message.type}: {message.content}" for message in response_memory.messages])
        # agent = initialize_agent(actual_tools, self.fast_llm, AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=self.verbose)
        agent = initialize_react_openai_agent(tools=actual_tools, llm=self.fast_llm, verbose=self.verbose)
        
        
        # TODO: Handle the agent formatting it's response incorrectly
        information = agent.run(f"""Here is the conversation history:
```
{history}
```

Gather relevant information to this user's question, utilizing the conversation history: {input}

Here is your thought on the user's question:
```
{thought}
```""")
        print("Information: ", information)

        return information
    

    def respond(self, response_memory: ChatMessageHistory, thought: str, input: str, info: str):
        """Generate Bloom's response to the user."""

        response_prompt = ChatPromptTemplate.from_messages([
            self.system_response,
            *response_memory.messages,
            HumanMessage(content=input)
        ])
        chain = response_prompt | self.llm

        response_memory.add_message(HumanMessage(content=input))

        return Streamable(
            chain.astream({ "thought": thought, "info": info }, {"tags": ["response"]}),
            lambda response: response_memory.add_message(AIMessage(content=response))
        )
    
        

    async def chat(self, cache: ConversationCache, inp: str ) -> tuple[str, str]:
        thought_iterator = self.think(cache.thought_memory, inp)
        thought = await thought_iterator()
        
        info = await self.gather_info(cache.response_memory, inp, thought)

        response_iterator = self.respond(cache.response_memory, thought, inp, info)
        response = await response_iterator()

        return thought, response
    



class Streamable:
    "A async iterator wrapper for langchain streams that saves on completion via callback"

    def __init__(self, iterator: AsyncIterator[BaseMessage], callback):
        self.iterator = iterator
        self.callback = callback
        # self.content: List[Awaitable[BaseMessage]] = []
        self.content = ""
    
    def __aiter__(self):
        return self
    
    async def __anext__(self):
        try:
            data = await self.iterator.__anext__()
            self.content += data.content
            return self.content
        except StopAsyncIteration as e:
            self.callback(self.content)
            raise StopAsyncIteration
        except Exception as e:
            raise e
    
    async def __call__(self):
        async for _ in self:
            pass
        return self.content
        