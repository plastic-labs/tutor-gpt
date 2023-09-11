from typing import Optional, Type

from langchain.callbacks.manager import (
    AsyncCallbackManagerForToolRun,
    CallbackManagerForToolRun,
)
from langchain.tools.base import BaseTool
from langchain.document_loaders import AsyncChromiumLoader
from langchain.document_transformers import BeautifulSoupTransformer
from langchain.utilities import GoogleSerperAPIWrapper

from langchain.chat_models.base import BaseChatModel

import pprint

from langchain.retrievers.web_research import WebResearchRetriever
from langchain.document_transformers import Html2TextTransformer

from langchain.chains import LLMChain
from langchain.prompts import Prompt

from langchain.output_parsers import StructuredOutputParser, ResponseSchema

from langchain.text_splitter import TokenTextSplitter
from langchain.vectorstores import FAISS
from langchain.embeddings.base import Embeddings
from langchain.embeddings import OpenAIEmbeddings

from dotenv import load_dotenv

load_dotenv()
pp = pprint.PrettyPrinter(indent=4)


class SearchTool(BaseTool):
    name = "search"
    description = "useful for when you need to search for something on the internet"
    llm: BaseChatModel
    embeddings: Embeddings

    @classmethod
    def from_llm(cls, llm: BaseChatModel, embeddings: Embeddings):
        """Return a tool from a chat model."""
        return cls(llm=llm, embeddings=embeddings)

    def _run(
        self, query: str, run_manager: Optional[CallbackManagerForToolRun] = None
    ) -> str:
        """Use the tool."""
        search = GoogleSerperAPIWrapper()
        search.k = 4

        results = search.results(query=query)
        organic_results = results["organic"]

        # TODO: Make this async for speed!!
        relevant_results = [
            {
                "title": result["title"],
                "snippet": result["snippet"],
                "link": result["link"],
                "summary": self._research_url(result["link"], query),
            } for result in organic_results
        ]

        formatted_results = [
            f"{result['title']} - {result['link']}\nSnippet: {result['snippet']}\nPage Summary: {result['summary']}" for result in relevant_results
        ]
        formatted_results = "Search Results:\n" + "\n----------------------\n\n".join(formatted_results)

        # pp.pprint(formatted_results)
        # print(formatted_results)
        return self._summarize_results(formatted_results)


        

    async def _arun(
        self, query: str, run_manager: Optional[AsyncCallbackManagerForToolRun] = None
    ) -> str:
        """Use the tool asynchronously."""
        raise NotImplementedError("custom_search does not support async")

    
    def _research_url(self, url: str, query: str):
        prompt = Prompt.from_template("Your job is to write a summary of a web page containing the most essential information to answer a specific question. You will be given a few selected sections of the web page to base your summary off of. \n\nQuestion: {query}\n\nBEGIN SELECTIONS\n{doc}\nEND SELECTIONS")
        llm_chain = LLMChain(llm=self.llm, prompt=prompt)

        try:
            # Load HTML
            loader = AsyncChromiumLoader([url])
            html2text = Html2TextTransformer()
            text_splitter = TokenTextSplitter(chunk_size=300, chunk_overlap=0)

            html = loader.load()
            docs = html2text.transform_documents(html)
            docs = text_splitter.split_documents(docs)

            db = FAISS.from_documents(docs, self.embeddings)
            relevant_sections = db.similarity_search(query=query, k=3)
            relevant_sections = "\n".join([f'"{section.page_content}"' for section in relevant_sections])

            # doc = doc[0].page_content[:5000]

            summary = llm_chain.run({"query": query, "doc": relevant_sections})
            return summary
        except Exception as e:
            print(e)
            return "Error loading HTML"

    def _summarize_results(self, search_results: str):
        search_result_summary_prompt = Prompt.from_template("Summarize the following search results the relevant information for answering the question. Make sure to not just repeat answers from sources, provide the sources justifications when possible. More detail is better.\n\nBe specific instead of vague whenever possible.\n\nQuestion: {query}\n\n{search_results}\n\n\n\nYOU MUST cite your sources using bracket notation with numbers, and you must include the full links at the end.")
        search_result_summary_chain = LLMChain(llm=llm_fast, prompt=search_result_summary_prompt)

        return search_result_summary_chain.run({"query": query, "search_results": search_results})


search_generation_schemas = [
    ResponseSchema(name="Reasoning", description="Reasoning behind what google query would be best to find information to answer the question"),
    ResponseSchema(name="Search Query", description="The google query that would be best to find information to answer the question"),
]
search_generation_output_parser = StructuredOutputParser.from_response_schemas(search_generation_schemas)

# For testing
if __name__ == "__main__":
    query = "What are the differences between Llama 1 and 2?"

    from langchain.chat_models.openai import ChatOpenAI
    from dotenv import load_dotenv

    load_dotenv()
    llm_fast = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.0)
    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.0)
    embeddings = OpenAIEmbeddings()

    search_generation_prompt = Prompt.from_template("Your job is to generate a google query that would be best to find information to answer the question.\n\nQuestion: {query}\n\n{format_instructions}")
    format_instructions = search_generation_output_parser.get_format_instructions()
    search_generation_chain = LLMChain(llm=llm, prompt=search_generation_prompt, output_parser=search_generation_output_parser)

    google_query = search_generation_chain.run({"query": query, "format_instructions": format_instructions})["Search Query"]
    
    search_tool = SearchTool.from_llm(llm=llm_fast, embeddings=embeddings)
    search_result_summary = search_tool.run(google_query)

    print(search_result_summary)
