"""Module implements a ReACT agent that uses OpenAI Function Calling for more robust tool usage."""
from typing import Any, List, Optional, Sequence, Union

from langchain.agents import BaseSingleActionAgent
from langchain.callbacks.base import BaseCallbackManager
from langchain.callbacks.manager import Callbacks
from langchain.chat_models.openai import ChatOpenAI
from langchain.prompts.chat import (
    BaseMessagePromptTemplate,
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
)
from langchain.schema import BasePromptTemplate
from langchain.schema.language_model import BaseLanguageModel
from langchain.schema.messages import (
    BaseMessage,
    SystemMessage,
)
from langchain.tools import BaseTool
from langchain.agents import OpenAIFunctionsAgent, AgentExecutor

from agent.tools.think import Think

def initialize_react_openai_agent(
    llm: ChatOpenAI,
    tools: Sequence[BaseTool],
    **kwargs: Any,
) -> BaseSingleActionAgent:
    """Construct an agent from an LLM and tools."""
    # add think tool
    tools = [Think()] + list(tools)

    agent = ReactOpenAIFunctionsAgent.from_llm_and_tools(
        llm=llm,
        tools=tools,
    )
    return AgentExecutor.from_agent_and_tools(agent=agent, tools=tools, **kwargs)

SYSTEM_MESSAGE = """You are a helpful AI assistant.

ALWAYS use the following format:

Question: the input question you must answer
Thought: you should always think about what to do.
function_call:
Observation: the result of the function call
... (this Thought/Function Call/Observation can repeat N times)
Thought: I now know the final answer
the final answer to the original input question
"""
SYSTEM_MESSAGE_SUFFIX = """You MUST use the "think" tool to reason about what to do next. 
When you have the final answer, return a normal message with the answer!"""


class ReactOpenAIFunctionsAgent(OpenAIFunctionsAgent):
    
    @classmethod
    def create_prompt(
        cls,
        system_message: Optional[SystemMessage] = SystemMessage(
            content="You are a helpful AI assistant."
        ),
        extra_prompt_messages: Optional[List[BaseMessagePromptTemplate]] = None,
    ) -> BasePromptTemplate:
        """Create prompt for this agent.

        Args:
            system_message: Message to use as the system message that will be the
                first in the prompt.
            extra_prompt_messages: Prompt messages that will be placed between the
                system message and the new human input.

        Returns:
            A prompt template to pass into this agent.
        """
        _prompts = extra_prompt_messages or []
        messages: List[Union[BaseMessagePromptTemplate, BaseMessage]]
        if system_message:
            messages = [system_message]
        else:
            messages = []

        messages.extend(
            [
                *_prompts,
                HumanMessagePromptTemplate.from_template("{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
                SystemMessage(content=SYSTEM_MESSAGE_SUFFIX)
            ]
        )
        return ChatPromptTemplate(messages=messages)
    
    @classmethod
    def from_llm_and_tools(
        cls,
        llm: BaseLanguageModel,
        tools: Sequence[BaseTool],
        callback_manager: Optional[BaseCallbackManager] = None,
        extra_prompt_messages: Optional[List[BaseMessagePromptTemplate]] = None,
        system_message: Optional[SystemMessage] = SystemMessage(
            content=SYSTEM_MESSAGE
        ),
        **kwargs: Any,
    ) -> BaseSingleActionAgent:
        """Construct an agent from an LLM and tools."""
        
        if not isinstance(llm, ChatOpenAI):
            raise ValueError("Only supported with ChatOpenAI models.")
        prompt = cls.create_prompt(
            extra_prompt_messages=extra_prompt_messages,
            system_message=system_message,
        )
        return cls(
            llm=llm,
            prompt=prompt,
            tools=tools,
            callback_manager=callback_manager,
            **kwargs,
        )
    
