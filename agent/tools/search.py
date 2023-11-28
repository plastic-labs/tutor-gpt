import asyncio
import logging
import os
from typing import Optional, Type

from dotenv import load_dotenv
from langchain.callbacks.manager import (
    AsyncCallbackManagerForToolRun,
    CallbackManagerForToolRun,
)
from langchain.chains import LLMChain
from langchain.docstore.document import Document
from langchain.document_loaders import AsyncChromiumLoader
from langchain.document_transformers import Html2TextTransformer
from langchain.embeddings.base import Embeddings
from langchain.llms.base import BaseLLM
from langchain.output_parsers import ResponseSchema, StructuredOutputParser
from langchain.prompts import Prompt
from langchain.text_splitter import TokenTextSplitter
from langchain.tools.base import BaseTool
from langchain.utilities import GoogleSerperAPIWrapper
from langchain.vectorstores import FAISS

logger = logging.getLogger(__name__)
load_dotenv() # Load environment variables


# import nest_asyncio
# nest_asyncio.apply() # https://github.com/erdewit/nest_asyncio

# TODO: Store search results for entire conversation in vector store
# TODO: Add answerbox to search results when available

class SearchTool(BaseTool):
    name: str = "search"
    description: str = "useful for when you need to search for something on the internet"
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
        return asyncio.run(self._arun(query=query))

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

    async def _aresearch_url(self, url: str, query: str):
        """Research a URL by embedding the web page and then using the most relevant sections to the query to generate a summary of the most important information on the page."""

        prompt = Prompt.from_template("Your job is to summarize the information on the web page AS IT PERTAINS TO THE QUERY. You will be given a few selected sections of the web page to base your answer off of. \n\nQuestion: {query}\n\nBEGIN SELECTIONS\n{doc}\nEND SELECTIONS")
        llm_chain = LLMChain(llm=self.llm, prompt=prompt)

        try:
            # Load HTML
            loader = AsyncChromiumLoader([url])
            html2text = Html2TextTransformer()
            text_splitter = TokenTextSplitter(chunk_size=300, chunk_overlap=0)

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
            return f"Error loading HTML: {e}"


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
