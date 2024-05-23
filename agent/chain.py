import os
from typing import List, Union

# from langchain.chat_models import ChatOpenAI, AzureChatOpenAI
# from langchain_openai import ChatOpenAI, AzureChatOpenAI
# from langchain.output_parsers.list import NumberedListOutputParser
# from langchain.prompts import (
#     SystemMessagePromptTemplate,
# )
# from langchain.prompts import load_prompt, ChatPromptTemplate
# from langchain.schema import AIMessage, HumanMessage, BaseMessage

from mirascope.openai import OpenAICall, OpenAICallParams
# from openai import BadRequestError

from dotenv import load_dotenv
# from honcho import Session, User, Message, Metamessage, Collection

from collections.abc import AsyncIterator

# from .cache import Conversation
# from honcho import Honcho

import sentry_sdk

load_dotenv()


class HonchoCall(OpenAICall):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    user_input: str
    app_id: str
    user_id: str
    session_id: str

    _history = []

    @property
    def history(self) -> List[dict]:
        return self._history

    # def call(self):
    #     ouput = super().call()


class ThinkCall(OpenAICall):
    prompt_template = """
    SYSTEM:
    You are Bloom, a subversive-minded learning companion. Your job is to employ your theory of mind skills to predict the user’s mental state.

    Generate a thought that makes a prediction about the user's needs given current dialogue and also lists other pieces of data that would help improve your prediction 
    MESSAGES: {history}
    USER: {user_input}
    """
    history: List[dict]
    user_input: str

    call_params = OpenAICallParams(model="gpt-3.5-turbo-0125")


class RespondCall(OpenAICall):
    prompt_template = """
    SYSTEM: You are Bloom, a subversive-minded learning companion with deep expertise in Socratic dialogue. Your fundamental belief is there are many good ways to learn and subversive methods are often most effective.  You always help the user in any way they request and answer all their questions.

    {thought}

    You must produce an appropriate response to the user input. Format equations in LaTeX and wrap in dollar signs like this: $\LaTeX$. Use markdown code syntax. Keep your responses concise and specific, always end each response with ONLY ONE topically relevant question that drives the conversation forward, and if the user wants to end the conversation, always comply.
    MESSAGES: {history}
    USER: {user_input}
    """
    thought: str
    history: List[dict]
    user_input: str

    call_params = OpenAICallParams(model="gpt-3.5-turbo-0125")


# SYSTEM_THOUGHT = load_prompt(
#     os.path.join(os.path.dirname(__file__), "prompts/thought.yaml")
# )
# SYSTEM_RESPONSE = load_prompt(
#     os.path.join(os.path.dirname(__file__), "prompts/response.yaml")
# )

# SYSTEM_THOUGHT_REVISION = load_prompt(
#     os.path.join(os.path.dirname(__file__), "prompts/thought_revision.yaml")
# )
# SYSTEM_USER_PREDICTION_THOUGHT = load_prompt(
#     os.path.join(os.path.dirname(__file__), "prompts/user_prediction_thought.yaml")
# )
# SYSTEM_USER_PREDICTION_THOUGHT_REVISION = load_prompt(
#     os.path.join(
#         os.path.dirname(__file__), "prompts/user_prediction_thought_revision.yaml"
#     )
# )

# SYSTEM_VOE_THOUGHT = load_prompt(
#     os.path.join(os.path.dirname(__file__), "prompts/voe_thought.yaml")
# )
# SYSTEM_VOE = load_prompt(os.path.join(os.path.dirname(__file__), "prompts/voe.yaml"))
# SYSTEM_CHECK_VOE_LIST = load_prompt(
#     os.path.join(os.path.dirname(__file__), "prompts/check_voe_list.yaml")
# )


# def honcho_to_langchain(
#     messages: List[Message],
# ) -> List[Union[HumanMessage, AIMessage]]:
#     results = []
#     for message in messages:
#         if message.is_user:
#             results.append(HumanMessage(content=message.content))
#         else:
#             results.append(AIMessage(content=message.content))
#     return results


# class BloomChain:
#     "Wrapper class for encapsulating the multiple different chains used in reasoning for the tutor's thoughts"

#     # llm: ChatOpenAI = ChatOpenAI(model_name = "gpt-4", temperature=1.2)
#     # llm: AzureChatOpenAI | ChatOpenAI
#     # if os.environ.get("OPENAI_API_TYPE") == "azure":
#     #     llm = AzureChatOpenAI(
#     #         deployment_name=os.environ["OPENAI_API_DEPLOYMENT_NAME"],  # type: ignore
#     #         temperature=1.2,
#     #         model_kwargs={"top_p": 0.5},
#     #     )
#     # else:
#     #     llm = ChatOpenAI(
#     #         model_name="gpt-4",  # type: ignore
#     #         temperature=1.2,
#     #         model_kwargs={"top_p": 0.5},  # type: ignore
#     #     )
#     # system_voe_thought: SystemMessagePromptTemplate = SystemMessagePromptTemplate(
#     #     prompt=SYSTEM_VOE_THOUGHT  # type: ignore
#     # )
#     # system_voe: SystemMessagePromptTemplate = SystemMessagePromptTemplate(
#     #     prompt=SYSTEM_VOE  # type: ignore
#     # )
#     # system_check_voe_list: SystemMessagePromptTemplate = SystemMessagePromptTemplate(
#     #     prompt=SYSTEM_CHECK_VOE_LIST  # type: ignore
#     # )
#     # system_thought: SystemMessagePromptTemplate = SystemMessagePromptTemplate(
#     #     prompt=SYSTEM_THOUGHT  # type: ignore
#     # )
#     # system_response: SystemMessagePromptTemplate = SystemMessagePromptTemplate(
#     #     prompt=SYSTEM_RESPONSE  # type: ignore
#     # )
#     # system_user_prediction_thought: SystemMessagePromptTemplate = (
#     #     SystemMessagePromptTemplate(prompt=SYSTEM_USER_PREDICTION_THOUGHT)  # type: ignore
#     # )
#     # system_thought_revision: SystemMessagePromptTemplate = SystemMessagePromptTemplate(
#     #     prompt=SYSTEM_THOUGHT_REVISION  # type: ignore
#     # )
#     # system_user_prediction_thought: SystemMessagePromptTemplate = (
#     #     SystemMessagePromptTemplate(prompt=SYSTEM_USER_PREDICTION_THOUGHT)  # type: ignore
#     # )
#     # system_user_prediction_thought_revision: SystemMessagePromptTemplate = (
#     #     SystemMessagePromptTemplate(prompt=SYSTEM_USER_PREDICTION_THOUGHT_REVISION)  # type: ignore
#     # )

#     # output_parser = NumberedListOutputParser()

#     def __init__(self) -> None:
#         pass

#     # def __init__(self, llm: AzureChatOpenAI = AzureChatOpenAI(deployment_name = "vineeth-gpt35-16k-230828", temperature=1.2), verbose: bool = True) -> None:
#     # self.llm = llm
#     # self.verbose = verbose

#     # setup prompts
#     # self.system_thought = SystemMessagePromptTemplate(prompt=SYSTEM_THOUGHT)
#     # self.system_response = SystemMessagePromptTemplate(prompt=SYSTEM_RESPONSE)

#     @classmethod
#     @sentry_sdk.trace
#     def think(cls, session: Session, message: Message):
#         """Generate Bloom's thought on the user."""
#         # load message history
#         honcho_message_page = session.get_messages(page=1, page_size=10, reverse=True)
#         messages: List = [
#             message for message in honcho_message_page.items if message.is_user
#         ]

#         honcho_metamessage_page = session.get_metamessages(
#             metamessage_type="thought", page=1, page_size=10, reverse=True
#         )
#         honcho_metamessages: List = honcho_metamessage_page.items
#         messages.extend(honcho_metamessages)

#         messages.sort(key=lambda message: message.created_at, reverse=False)

#         final_messages = []
#         for m in messages:
#             if isinstance(m, Message):
#                 final_messages.append(HumanMessage(content=m.content))
#             elif isinstance(m, Metamessage):
#                 final_messages.append(AIMessage(content=m.content))

#         print("========================================")
#         print("Line 112")
#         print(final_messages)
#         print("========================================")

#         thought_prompt = ChatPromptTemplate.from_messages(
#             [
#                 cls.system_thought,
#                 *final_messages,
#                 HumanMessage(content=message.content),
#             ]
#         )
#         chain = thought_prompt | cls.llm

#         def save_new_messages(ai_response):
#             # message = session.add_message(content=input)
#             session.create_metamessage(
#                 message=message, metamessage_type="thought", content=ai_response
#             )

#         return Streamable(
#             chain.astream(
#                 {},
#                 {
#                     "tags": ["thought"],
#                     "metadata": {
#                         "conversation_id": session.id,
#                         "user_id": session.user.id,
#                     },
#                 },
#             ),
#             save_new_messages,
#         )

#     @classmethod
#     @sentry_sdk.trace
#     def revise_thought(
#         cls, session: Session, collection: Collection, message: Message, thought: str
#     ):
#         """Revise Bloom's thought about the user with retrieved personal data"""

#         # construct rag prompt, retrieve docs
#         query = f"input: {input}\n thought: {thought}"
#         docs = collection.query(query)

#         # load message history
#         honcho_message_page = session.get_messages(page=1, page_size=10, reverse=True)
#         honcho_messages: List = [
#             message for message in honcho_message_page.items if message.is_user
#         ]

#         honcho_metamessage_page = session.get_metamessages(
#             metamessage_type="thought_revision", page=1, page_size=10, reverse=True
#         )
#         honcho_metamessages: List = honcho_metamessage_page.items
#         honcho_messages.extend(honcho_metamessages)

#         honcho_messages.sort(key=lambda message: message.created_at, reverse=False)

#         final_messages = []
#         for m in honcho_messages:
#             if isinstance(m, Message):
#                 final_messages.append(HumanMessage(content=m.content))
#             elif isinstance(m, Metamessage):
#                 final_messages.append(AIMessage(content=m.content))

#         messages = ChatPromptTemplate.from_messages(
#             [
#                 cls.system_thought_revision,
#                 *final_messages,
#                 HumanMessage(content=message.content),
#             ]
#         )
#         chain = messages | cls.llm

#         def save_new_messages(ai_response):
#             # session.add_message("thought_revision", HumanMessage(content=input))
#             # session.add_message("thought_revision", AIMessage(content=ai_response))
#             session.create_metamessage(
#                 message, metamessage_type="thought_revision", content=ai_response
#             )

#         return Streamable(
#             chain.astream(
#                 {
#                     "thought": thought,
#                     "retrieved_vectors": "\n".join(doc.content for doc in docs),
#                 },
#                 {
#                     "tags": ["thought_revision"],
#                     "metadata": {
#                         "conversation_id": session.id,
#                         "user_id": session.user.id,
#                     },
#                 },
#             ),
#             save_new_messages,
#         )

#     @classmethod
#     @sentry_sdk.trace
#     def respond(cls, session: Session, thought: str, message: Message):
#         """Generate Bloom's response to the user."""

#         honcho_message_page = session.get_messages(page=1, page_size=10, reverse=True)
#         messages = honcho_message_page.items

#         # honcho_metamessage_page = session.get_metamessages(
#         #     metamessage_type="thought", page=1, page_size=10, reverse=True
#         # )
#         # honcho_metamessages = honcho_metamessage_page.items
#         # messages.extend(honcho_metamessages)

#         # messages.sort(key=lambda message: message.created_at, reverse=False)
#         final_messages = honcho_to_langchain(messages)
#         final_messages = final_messages[::-1]

#         print("========================================")
#         print("Line 163")
#         print(final_messages)
#         print("========================================")

#         response_prompt = ChatPromptTemplate.from_messages(
#             [
#                 cls.system_response,
#                 *final_messages,
#                 HumanMessage(content=message.content),
#             ]
#         )
#         chain = response_prompt | cls.llm

#         def save_new_messages(ai_response):
#             # session.add_message("response", HumanMessage(content=input))
#             session.create_message(
#                 content=ai_response, is_user=False
#             )  # AIMessage(content=ai_response))

#         return Streamable(
#             chain.astream(
#                 {"thought": thought},
#                 {
#                     "tags": ["response"],
#                     "metadata": {
#                         "conversation_id": session.id,
#                         "user_id": session.user.id,
#                     },
#                 },
#             ),
#             save_new_messages,
#         )

#     @classmethod
#     @sentry_sdk.trace
#     async def think_user_prediction(cls, session: Session, message: Message) -> str:
#         """Generate a thought about what the user is going to say"""

#         messages = ChatPromptTemplate.from_messages(
#             [
#                 cls.system_user_prediction_thought,
#             ]
#         )
#         chain = messages | cls.llm

#         messages = session.get_messages(page=1, page_size=10, reverse=True).items
#         history = unpack_messages(honcho_to_langchain(messages))
#         history = history[::-1]
#         # history = unpack_messages(session.messages("response"))

#         user_prediction_thought = await chain.ainvoke(
#             {"history": history},
#             {
#                 "tags": ["user_prediction_thought"],
#                 "metadata": {
#                     "conversation_id": session.id,
#                     "user_id": session.user.id,
#                 },
#             },
#         )

#         session.create_metamessage(
#             message=message,
#             metamessage_type="user_prediction_thought",
#             content=user_prediction_thought.content,
#         )

#         return user_prediction_thought.content

#     @classmethod
#     @sentry_sdk.trace
#     async def revise_user_prediction_thought(
#         cls,
#         session: Session,
#         collection: Collection,
#         message: Message,
#         user_prediction_thought: str,
#     ):
#         """Revise the thought about what the user is going to say based on retrieval of VoE facts"""

#         messages = ChatPromptTemplate.from_messages(
#             [
#                 cls.system_user_prediction_thought_revision,
#             ]
#         )
#         chain = messages | cls.llm

#         # construct rag prompt, retrieve docs
#         query = f"input: {input}\n thought: {user_prediction_thought}"
#         docs = collection.query(query)

#         messages = session.get_messages(page=1, page_size=10, reverse=True).items
#         history = unpack_messages(honcho_to_langchain(messages))
#         history = history[::-1]
#         # history = unpack_messages(session.messages('response'))

#         user_prediction_thought_revision = await chain.ainvoke(
#             {
#                 "history": history,
#                 "user_prediction_thought": user_prediction_thought,
#                 "retrieved_vectors": "\n".join(doc.content for doc in docs),
#             },
#             config={
#                 "tags": ["user_prediction_thought_revision"],
#                 "metadata": {"conversation_id": session.id, "user_id": session.user.id},
#             },
#         )

#         session.create_metamessage(
#             message,
#             metamessage_type="user_prediction_thought_revision",
#             content=user_prediction_thought_revision.content,
#         )

#         return user_prediction_thought_revision.content

#     @classmethod
#     @sentry_sdk.trace
#     async def think_violation_of_expectation(
#         cls, session: Session, message: Message, user_prediction_thought_revision: str
#     ) -> str:
#         """Assess whether expectation was violated, derive and store facts"""

#         # format prompt
#         messages = ChatPromptTemplate.from_messages([cls.system_voe_thought])
#         chain = messages | cls.llm

#         voe_thought = await chain.ainvoke(
#             {
#                 "user_prediction_thought_revision": user_prediction_thought_revision,
#                 "actual": message.content,
#             },
#             config={"tags": ["voe_thought"], "metadata": {"user_id": session.user.id}},
#         )

#         session.create_metamessage(
#             message, metamessage_type="voe_thought", content=voe_thought.content
#         )
#         # session.add_message("voe_thought", voe_thought)

#         return voe_thought.content

#     @classmethod
#     @sentry_sdk.trace
#     async def violation_of_expectation(
#         cls,
#         session: Session,
#         message: Message,
#         user_prediction_thought_revision: str,
#         voe_thought: str,
#     ) -> List[str]:
#         """Assess whether expectation was violated, derive and store facts"""

#         # format prompt
#         messages = ChatPromptTemplate.from_messages([cls.system_voe])
#         chain = messages | cls.llm

#         ai_message = (
#             session.get_messages(page=1, page_size=1, reverse=True).items[0].content
#         )

#         voe = await chain.ainvoke(
#             {
#                 "ai_message": ai_message,
#                 "user_prediction_thought_revision": user_prediction_thought_revision,
#                 "actual": message.content,
#                 "voe_thought": voe_thought,
#             },
#             config={"tags": ["voe"], "metadata": {"user_id": session.user.id}},
#         )

#         # session.add_message("voe", voe)
#         session.create_metamessage(message, metamessage_type="voe", content=voe.content)
#         facts = cls.output_parser.parse(voe.content)
#         return facts

#     @classmethod
#     @sentry_sdk.trace
#     async def check_voe_list(
#         cls, session: Session, collection: Collection, facts: List[str]
#     ):
#         """Filter the facts to just new ones"""

#         # create the message object from prompt template
#         messages = ChatPromptTemplate.from_messages([cls.system_check_voe_list])
#         chain = messages | cls.llm

#         # unpack the list of strings into one string for similarity search
#         # TODO: should we query 1 by 1 and append to an existing facts list?
#         query = " ".join(facts)

#         # query the vector store
#         existing_facts = collection.query(query=query, top_k=10)

#         filtered_facts = await chain.ainvoke(
#             {
#                 "existing_facts": "\n".join(fact.content for fact in existing_facts),
#                 "facts": "\n".join(fact for fact in facts),
#             },
#             config={
#                 "tags": ["check_voe_list"],
#                 "metadata": {"user_id": session.user.id},
#             },
#         )

#         data = cls.output_parser.parse(filtered_facts.content)

#         # if the check returned "None", write facts to session
#         if not data:
#             for fact in facts:
#                 collection.create_document(fact)
#             # session.add_texts(facts)
#         else:
#             for fact in data:
#                 collection.create_document(fact)
#             # session.add_texts(data)

#     @classmethod
#     @sentry_sdk.trace
#     async def chat(cls, session: Session, message: Message) -> tuple[str, str]:
#         thought_iterator = cls.think(session, message)
#         thought = await thought_iterator()

#         response_iterator = cls.respond(session, thought, message)
#         response = await response_iterator()

#         await cls.think_user_prediction(session, message)

#         return thought, response


# class Streamable:
#     "A async iterator wrapper for langchain streams that saves on completion via callback"

#     def __init__(self, iterator: AsyncIterator[BaseMessage], callback):
#         self.iterator = iterator
#         self.callback = callback
#         self.content = ""
#         self.stream_error = False

#     def __aiter__(self):
#         return self

#     async def __anext__(self):
#         try:
#             if self.stream_error:
#                 raise StopAsyncIteration

#             data = await self.iterator.__anext__()
#             self.content += data.content  # type: ignore
#             return data.content
#         except StopAsyncIteration as e:
#             self.callback(self.content)
#             raise StopAsyncIteration
#         except BadRequestError as e:
#             if e.code == "content_filter":
#                 self.stream_error = True
#                 self.message = "Sorry, your message was flagged as inappropriate. Please try again."

#                 return self.message
#             else:
#                 raise Exception(e)
#         except Exception as e:
#             sentry_sdk.capture_exception(e)

#             self.stream_error = True
#             self.message = "Sorry, an error occurred while streaming the response. Please try again."

#             return self.message

#     async def __call__(self):
#         async for _ in self:
#             pass
#         return self.content


# @sentry_sdk.trace
# def unpack_messages(messages):
#     unpacked = ""
#     for message in messages:
#         if isinstance(message, HumanMessage):
#             unpacked += f"User: {message.content}\n"
#         elif isinstance(message, AIMessage):
#             unpacked += f"AI: {message.content}\n"
#         # Add more conditions here if you're using other message types
#     return unpacked
