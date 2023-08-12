from typing import Optional, Type

from langchain.callbacks.manager import (
    CallbackManagerForToolRun,
)
from langchain.tools import BaseTool

class AskQuestion(BaseTool):
    name="ask_question"
    description="Ask the user a question to help them think through their problem or obtain any information you need to help them."

    def _run(self, query: str, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        return f"""Return this string as the final answer: ```
You must ask the student this question to gather information needed for your response: "{query}"
```"""
