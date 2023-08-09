import os

from langchain.chat_models import ChatOpenAI
from langchain.memory import ChatMessageHistory
from langchain.prompts import (
    SystemMessagePromptTemplate,
)
from langchain.prompts import load_prompt
from langchain.schema import AIMessage, HumanMessage

from langchain.vectorstores import FAISS
from langchain.embeddings import OpenAIEmbeddings
from langchain.schema import Document

from langchain.agents import load_tools, initialize_agent, AgentType
from langchain.tools import format_tool_to_openai_function

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
    def __init__(self, llm: ChatOpenAI, verbose: bool = False) -> None:
        self.llm = llm
        self.verbose = verbose

        # setup prompts
        self.system_thought = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
        self.system_response = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)

        self.tools = load_tools(["google-serper", "wolfram-alpha", "wikipedia", "arxiv"], llm=self.llm)
        tool_documents = [Document(page_content=tool.description, metadata={"index": index}) for index, tool in enumerate(self.tools)]
        tool_vectorstore = FAISS.from_documents(tool_documents, OpenAIEmbeddings())
        self.tool_retriever = tool_vectorstore.as_retriever()
        self.functions = [format_tool_to_openai_function(tool) for tool in self.tools]

        

    async def think(self, thought_memory: ChatMessageHistory, input: str) -> str:
        """Generate Bloom's thought on the user."""

        # load message history
        messages = [self.system_thought.format(), *thought_memory.messages, HumanMessage(content=input)]
        thought_message = await self.llm.apredict_messages(messages)

        # update chat memory
        thought_memory.add_message(HumanMessage(content=input))
        thought_memory.add_message(thought_message) # apredict_messages returns AIMessage so can add directly

        return thought_message.content
    
    async def gather_info(self, response_memory: ChatMessageHistory, input: str, thought: str) -> str:
        """Collect information via tool."""
        tool_thought = thought.split("Tooling:")[1].split("Data:")[0].strip() # separate tool information from thought
        relevant_tools = self.tool_retriever.get_relevant_documents(tool_thought)
        print("Relevant Tools: ", relevant_tools)
        actual_tools = [self.tools[tool.metadata["index"]] for tool in relevant_tools]

        # agent = initialize_agent(actual_tools, self.llm, AgentType.CHAT_ZERO_SHOT_REACT_DESCRIPTION, verbose=self.verbose)
        # information = agent.run(f"gather relevant information to this user's question: {input}", fun) 
        history = "\n".join([f"{message.type}: {message.content}" for message in response_memory.messages])
        agent = initialize_agent(actual_tools, self.llm, AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=self.verbose)
        information = agent.run(f"Here is the conversation history: \n```\n{history}\n```\nGather relevant information to this user's question, utilizing the conversation history: {input}")
        print("Information: ", information)

        return information
    

    async def respond(self, response_memory: ChatMessageHistory, thought: str, input: str, info: str) -> str:
        """Generate Bloom's response to the user."""

        # load message history
        messages = [self.system_response.format(thought=thought, info=info), *response_memory.messages, HumanMessage(content=input)]
        response_message = await self.llm.apredict_messages(messages)

        # update chat memory
        response_memory.add_message(HumanMessage(content=input))
        response_memory.add_message(response_message) # apredict_messages returns AIMessage so can add directly

        return response_message.content
    

    async def chat(self, cache: ConversationCache, inp: str ) -> tuple[str, str]:
        thought  = await self.think(cache.thought_memory, inp)
        info = await self.gather_info(cache.response_memory, inp, thought)
        response = await self.respond(cache.response_memory, thought, inp, info)
        return thought, response


def load_chains() -> BloomChain:
    """Logic for loading the chain you want to use should go here."""
    llm = ChatOpenAI(model_name = "gpt-4", temperature=1.2)

    # define chain
    bloom_chain = BloomChain(
        llm=llm, 
        verbose=True
    )

    return bloom_chain


