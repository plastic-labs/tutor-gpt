import os
from langchain.chat_models import ChatOpenAI, AzureChatOpenAI
from langchain.llms import OpenAI
from langchain.prompts import (
    SystemMessagePromptTemplate,
)
from langchain.prompts import load_prompt, ChatPromptTemplate
from langchain.schema import AIMessage, HumanMessage, SystemMessage, BaseMessage
from dotenv import load_dotenv

from collections.abc import AsyncIterator
from .cache import Conversation

from agent.tools.search import SearchTool, search_ready_output_parser
from langchain.embeddings import HuggingFaceBgeEmbeddings, OpenAIEmbeddings

from langchain.output_parsers import CommaSeparatedListOutputParser


load_dotenv()

SYSTEM_THOUGHT = load_prompt(os.path.join(os.path.dirname(__file__), 'prompts/thought.yaml'))
SYSTEM_RESPONSE = load_prompt(os.path.join(os.path.dirname(__file__), 'prompts/response.yaml'))
SYSTEM_USER_PREDICTION_THOUGHT = load_prompt(os.path.join(os.path.dirname(__file__), 'prompts/user_prediction_thought.yaml'))



class BloomChain:
    "Wrapper class for encapsulating the multiple different chains used in reasoning for the tutor's thoughts"
    # llm: ChatOpenAI = ChatOpenAI(model_name = "gpt-4", temperature=1.2)
    llm: AzureChatOpenAI | ChatOpenAI
    if (os.environ.get("OPENAI_API_TYPE") == "azure"):
        llm = AzureChatOpenAI(deployment_name = os.environ['OPENAI_API_DEPLOYMENT_NAME'], temperature=1.2, model_kwargs={"top_p": 0.5})
    else:
        llm = ChatOpenAI(model_name = "gpt-4", temperature=1.2, model_kwargs={"top_p": 0.5})
        fast_llm = OpenAI(model_name = "gpt-3.5-turbo-instruct", temperature=0.3, top_p=0.5)

    system_thought: SystemMessagePromptTemplate = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
    system_response: SystemMessagePromptTemplate = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)
    system_user_prediction_thought: SystemMessagePromptTemplate = SystemMessagePromptTemplate(prompt=SYSTEM_USER_PREDICTION_THOUGHT)


    search_tool: SearchTool
    # Load Embeddings for search
    # model_name = "BAAI/bge-small-en-v1.5"
    # model_kwargs = {'device': 'cpu'}
    # encode_kwargs = {'normalize_embeddings': False}
    # embeddings = HuggingFaceBgeEmbeddings(
    #     model_name=model_name,
    #     model_kwargs=model_kwargs,
    #     encode_kwargs=encode_kwargs
    # )
    embeddings = OpenAIEmbeddings()
    search_tool = SearchTool.from_llm(llm=fast_llm, embeddings=embeddings)

    def __init__(self) -> None:
        pass
    # def __init__(self, llm: AzureChatOpenAI = AzureChatOpenAI(deployment_name = "vineeth-gpt35-16k-230828", temperature=1.2), verbose: bool = True) -> None:
        # self.llm = llm
        # self.verbose = verbose

        # setup prompts
        # self.system_thought = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
        # self.system_response = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)
        
    @classmethod
    def think(cls, cache: Conversation, input: str):
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
    async def respond(cls, cache: Conversation, thought: str, input: str):
        """Generate Bloom's response to the user."""
        
        messages = [
            cls.system_response,
            *cache.messages("response"),
            HumanMessage(content=input)
        ]

        search_messages = ChatPromptTemplate.from_messages(messages).format_messages(thought=thought).copy()
        search_messages.append(SystemMessage(content=f"Reason about whether or not a google search would be benificial to answer the question. Always use it if you are unsure about your knowledge.\n\nf{search_ready_output_parser.get_format_instructions()}"))

        search_ready_message = await cls.llm.apredict_messages(search_messages)
        search_ready = search_ready_output_parser.parse(search_ready_message.content)

        if search_ready["Search"].lower() == "true":
            search_messages.append(search_ready_message)
            search_messages.append(SystemMessage(content=f"Now generate a google query that would be best to find information to answer the question."))
            
            search_query_message = await cls.llm.apredict_messages(search_messages)
            search_result_summary = await cls.search_tool.arun(search_query_message.content)

            messages.append(SystemMessage(content=f"Use the information from these searchs to help answer your question.\nMake sure to not just repeat answers from sources, provide the sources justifications when possible. More detail is better.\n\nRelevant Google Search: {search_query_message.content}\n\n{search_result_summary}\n\nCite your sources via bracket notation with numbers (don't use any other special characters), and include the full links at the end."))

        response_prompt = ChatPromptTemplate.from_messages(messages)
        chain = response_prompt | cls.llm

        cache.add_message("response", HumanMessage(content=input))

        return Streamable(
            chain.astream({ "thought": thought }, {"tags": ["response"], "metadata": {"conversation_id": cache.conversation_id, "user_id": cache.user_id}}),
            lambda response: cache.add_message("response", AIMessage(content=response))
        )
    
    @classmethod
    async def think_user_prediction(cls, cache: Conversation):
        """Generate a thought about what the user is going to say"""

        messages = ChatPromptTemplate.from_messages([
            cls.system_user_prediction_thought,
        ])
        chain = messages | cls.llm

        history = unpack_messages(cache.messages('response'))

        user_prediction_thought = await chain.ainvoke(
            {"history": history}, 
            {"tags": ["user_prediction_thought"], "metadata": {"conversation_id": cache.conversation_id, "user_id": cache.user_id}}
        )

        cache.add_message("user_prediction_thought", user_prediction_thought)



    @classmethod    
    async def chat(cls, cache: Conversation, inp: str ) -> tuple[str, str]:
        thought_iterator = cls.think(cache, inp)
        thought = await thought_iterator()

        response_iterator = await cls.respond(cache, thought, inp)
        response = await response_iterator()

        await cls.think_user_prediction(cache)

        return thought, response


class Streamable:
    "A async iterator wrapper for langchain streams that saves on completion via callback"

    def __init__(self, iterator: AsyncIterator[BaseMessage], callback):
        self.iterator = iterator
        self.callback = callback
        self.content = ""
    
    def __aiter__(self):
        return self
    
    async def __anext__(self):
        try:
            data = await self.iterator.__anext__()
            self.content += data.content
            return data.content
        except StopAsyncIteration as e:
            self.callback(self.content)
            raise StopAsyncIteration
        except Exception as e:
            raise e
    
    async def __call__(self):
        async for _ in self:
            pass
        return self.content
        
def unpack_messages(messages):
    unpacked = ""
    for message in messages:
        if isinstance(message, HumanMessage):
            unpacked += f"User: {message.content}\n"
        elif isinstance(message, AIMessage):
            unpacked += f"AI: {message.content}\n"
        # Add more conditions here if you're using other message types
    return unpacked