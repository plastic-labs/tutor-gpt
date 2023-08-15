from typing import Optional

from langchain.callbacks.manager import (
    CallbackManagerForToolRun,
)
from langchain.tools import BaseTool

class Think(BaseTool):
    name="think"
    description="Think a thought about what to do next."

    def _run(self, query: str, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        return "Thought: " + query
