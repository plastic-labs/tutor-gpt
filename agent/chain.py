import os
from langchain.chat_models import ChatOpenAI, AzureChatOpenAI
from langchain.prompts import (
    SystemMessagePromptTemplate,
)
from langchain.prompts import load_prompt, ChatPromptTemplate
from langchain.schema import AIMessage, HumanMessage, BaseMessage
from dotenv import load_dotenv

from collections.abc import AsyncIterator
from .cache import ConversationCache

load_dotenv()

SYSTEM_THOUGHT = load_prompt(os.path.join(os.path.dirname(__file__), 'prompts/thought.yaml'))
SYSTEM_RESPONSE = load_prompt(os.path.join(os.path.dirname(__file__), 'prompts/response.yaml'))


class BloomChain:
    "Wrapper class for encapsulating the multiple different chains used in reasoning for the tutor's thoughts"
    # llm: ChatOpenAI = ChatOpenAI(model_name = "gpt-4", temperature=1.2)
    llm: AzureChatOpenAI | ChatOpenAI
    if (os.environ.get("OPENAI_API_TYPE") == "azure"):
        llm = AzureChatOpenAI(deployment_name = os.environ['OPENAI_API_DEPLOYMENT_NAME'], temperature=1.2, model_kwargs={"top_p": 0.5})
    else:
        llm = ChatOpenAI(model_name = "gpt-4", temperature=1.2, model_kwargs={"top_p": 0.5})

    system_thought: SystemMessagePromptTemplate = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
    system_response: SystemMessagePromptTemplate = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)


    def __init__(self) -> None:
        pass
    # def __init__(self, llm: AzureChatOpenAI = AzureChatOpenAI(deployment_name = "vineeth-gpt35-16k-230828", temperature=1.2), verbose: bool = True) -> None:
        # self.llm = llm
        # self.verbose = verbose

        # setup prompts
        # self.system_thought = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
        # self.system_response = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)
        
    @classmethod
    def think(cls, cache: ConversationCache, input: str):
        """Generate Bloom's thought on the user."""
        # load message history
        thought_prompt = ChatPromptTemplate.from_messages([
            cls.system_thought,
            *cache.messages("thought"),
            HumanMessage(content=input)
        ])
        chain = thought_prompt | cls.llm 

        cache.add_message("thought", HumanMessage(content=input))

        return Streamable(
                chain.astream({}, {"tags": ["thought"], "metadata": {"conversation_id": cache.conversation_id, "user_id": cache.user_id}}),
            lambda thought: cache.add_message("thought", AIMessage(content=thought))
        )
        
    @classmethod
    def respond(cls, cache: ConversationCache, thought: str, input: str):
        """Generate Bloom's response to the user."""
        response_prompt = ChatPromptTemplate.from_messages([
            cls.system_response,
            *cache.messages("response"),
            HumanMessage(content=input)
        ])
        chain = response_prompt | cls.llm

        cache.add_message("response", HumanMessage(content=input))

        return Streamable(
            chain.astream({ "thought": thought }, {"tags": ["response"], "metadata": {"conversation_id": cache.conversation_id, "user_id": cache.user_id}}),
            lambda response: cache.add_message("response", AIMessage(content=response))
        )


    @classmethod    
    async def chat(cls, cache: ConversationCache, inp: str ) -> tuple[str, str]:
        thought_iterator = cls.think(cache, inp)
        thought = await thought_iterator()

        response_iterator = cls.respond(cache, thought, inp)
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
        
