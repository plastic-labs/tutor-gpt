from typing import Optional, Type

import asyncio
import os
import logging

from langchain.callbacks.manager import (
    AsyncCallbackManagerForToolRun,
    CallbackManagerForToolRun,
)
from langchain.tools.base import BaseTool
from langchain.document_loaders import AsyncChromiumLoader
from langchain.utilities import GoogleSerperAPIWrapper

from langchain.llms.base import BaseLLM

from langchain.document_transformers import Html2TextTransformer

from langchain.chains import LLMChain
from langchain.prompts import Prompt

from langchain.output_parsers import StructuredOutputParser, ResponseSchema

from langchain.text_splitter import TokenTextSplitter
from langchain.vectorstores import FAISS
from langchain.embeddings.base import Embeddings

from langchain.docstore.document import Document

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()


# TODO: Store search results for entire conversation in vector store
# TODO: Add answerbox to search results when available

class SearchTool(BaseTool):
    name = "search"
    description = "useful for when you need to search for something on the internet"
    llm: BaseLLM
    embeddings: Embeddings
    search: GoogleSerperAPIWrapper

    @classmethod
    def from_llm(cls, llm: BaseLLM, embeddings: Embeddings):
        """Return a tool from a chat model."""
        search = GoogleSerperAPIWrapper()
        search.k = 3

        if os.environ.get("USE_RERANKER") == "true":
            from FlagEmbedding import FlagReranker
            model = 'BAAI/bge-reranker-base'

            cls.reranker = FlagReranker(model)
            logger.info(f"Loaded reranker \"{model}\" for webpage search")

        return cls(llm=llm, embeddings=embeddings, search=search)

    def _run(
        self, query: str, run_manager: Optional[CallbackManagerForToolRun] = None
    ) -> str:
        """Use the tool."""
        results = self.search.results(query=query)
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

        return formatted_results
        # return self._summarize_results(query, formatted_results)


        

    async def _arun(
        self, query: str, run_manager: Optional[AsyncCallbackManagerForToolRun] = None
    ) -> str:
        """Use the tool asynchronously."""

        # remove quotes from query if present
        if query[0] == '"' and query[-1] == '"':
            query = query[1:-1]

        results = await self.search.aresults(query=query)
        organic_results = results["organic"]

        summaries = await asyncio.gather(*[self._aresearch_url(result["link"], query) for result in organic_results])
        relevant_results = [
            {
                "title": result["title"],
                "snippet": result["snippet"],
                "link": result["link"],
                "summary": summary,
            } for result, summary in zip(organic_results, summaries)
        ]

        formatted_results = [
            f"{result['title']} - {result['link']}\nSnippet: {result['snippet']}\nPage Summary: {result['summary']}" for result in relevant_results
        ]
        formatted_results = "Search Results:\n" + "\n----------------------\n\n".join(formatted_results)

        return formatted_results
        # return self._summarize_results(query, formatted_results)

    
    def _research_url(self, url: str, query: str):
        """Research a URL by embedding the web page and then using the most relevant sections to the query to generate a summary of the most important information on the page."""

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

            # embedding search
            db = FAISS.from_documents(docs, self.embeddings)
            relevant_sections = db.similarity_search(query=query, k=8)

            # rerank
            if self.reranker:
                scores = self.reranker.compute_score([[query, section.page_content] for section in relevant_sections])
                scores_with_index = zip(scores, range(len(scores)))
                scores_with_index = sorted(scores_with_index, key=lambda x: x[0], reverse=True)
                relevant_sections = [relevant_sections[index] for _score, index in scores_with_index[:3]]

                logger.info("Reranked webpage sections, different from original order: " + str([index for _score, index in scores_with_index]) + "Chunk count:" + len(docs))

            # format sections together to be used as input to the LLM
            relevant_sections = "\n".join([f'"{section.page_content}"' for section in relevant_sections])

            # summarize the relevant sections
            summary = llm_chain.run({"query": query, "doc": relevant_sections})
            return summary
        except Exception as e:
            logger.error("Error loading HTML:", e)
            return "Error loading HTML: " + e

    async def _aresearch_url(self, url: str, query: str):
        """Research a URL by embedding the web page and then using the most relevant sections to the query to generate a summary of the most important information on the page."""

        prompt = Prompt.from_template("Your job is to summarize the information on the web page AS IT PERTAINS TO THE QUERY. You will be given a few selected sections of the web page to base your answer off of. \n\nQuestion: {query}\n\nBEGIN SELECTIONS\n{doc}\nEND SELECTIONS")
        llm_chain = LLMChain(llm=self.llm, prompt=prompt)

        try:
            # Load HTML
            loader = AsyncChromiumLoader([url])
            html2text = Html2TextTransformer()
            text_splitter = TokenTextSplitter(chunk_size=300, chunk_overlap=0)

            # html = await loader.aload()
            html = [Document(page_content=await loader.ascrape_playwright(url), metadata={"source": url})] 
            docs = html2text.transform_documents(html)
            docs = text_splitter.split_documents(docs)

            # embedding search
            db = FAISS.from_documents(docs, self.embeddings)
            # query prefix is used per instructions https://github.com/FlagOpen/FlagEmbedding
            relevant_sections = await db.asimilarity_search(query=("Represent this sentence for searching relevant passages: " + query), k=12)

            # rerank
            if hasattr(self, "reranker"):
                scores = self.reranker.compute_score([[query, section.page_content] for section in relevant_sections])
                # if there's only section, scores is a single score, not a list
                if isinstance(scores, float):
                    scores = [scores]

                scores_with_index = zip(scores, range(len(scores)))
                scores_with_index = sorted(scores_with_index, key=lambda x: x[0], reverse=True)
                relevant_sections = [relevant_sections[index] for _score, index in scores_with_index]

                logger.info("Reranked webpage sections, different from original order: " + str([index for _score, index in scores_with_index]) + " Chunk count: " + str(len(docs)))

            # format sections together to be used as input to the LLM
            relevant_sections = "\n".join([f'"{section.page_content}"' for section in relevant_sections[:3]])

            # summarize the relevant sections
            summary = await llm_chain.arun({"query": query, "doc": relevant_sections})
            return summary
        except Exception as e:
            logger.error("Error loading HTML:", e)
            return "Error loading HTML: " + e


    def _summarize_results(self, query: str, search_results: str):
        search_result_summary_prompt = Prompt.from_template("Summarize the following search results the relevant information for answering the question. Make sure to not just repeat answers from sources, provide the sources justifications when possible. More detail is better.\n\nBe specific instead of vague whenever possible.\n\nQuestion: {query}\n\n{search_results}\n\n\n\nYOU MUST cite your sources using bracket notation with numbers, and you must include the full links at the end. Do not cite sources that are not listed here.")
        search_result_summary_chain = LLMChain(llm=self.llm, prompt=search_result_summary_prompt)

        return search_result_summary_chain.run({"query": query, "search_results": search_results})


search_generation_schemas = [
    ResponseSchema(name="Reasoning", description="Reasoning behind what google query would be best to find information to answer the question"),
    ResponseSchema(name="Search Query", description="The google query that would be best to find information to answer the question. DO NOT USE ANY QUOTES OR OTHER SPECIAL CHARACTERS ANYWHERE."),
]
search_generation_output_parser = StructuredOutputParser.from_response_schemas(search_generation_schemas)

search_ready_schemas = [
    ResponseSchema(name="Reasoning", description="Reasoning behind whether or not a google search would be necessary to effectively answer the question."),
    ResponseSchema(name="Search", description="<true/false> whether or not a google search should be used to find information to answer the question."),
]
search_ready_output_parser = StructuredOutputParser.from_response_schemas(search_ready_schemas)
