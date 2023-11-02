from typing import Tuple, List, Dict, Union
from abc import ABC, abstractmethod

class IMediator(ABC):
    
    @abstractmethod
    def messages(self, session_id: str, user_id: str, message_type: str, limit: Tuple[bool, Union[int, None]] = (True,10)) -> List[str]:
        pass

    @abstractmethod
    def add_message(self, session_id: str, user_id: str, message_type: str, message: str) -> None:
        pass

    @abstractmethod
    def conversations(self, location_id: str, user_id: str, single: bool = True) -> Union[List[Dict], None]:
        pass

    @abstractmethod
    def conversation(self, session_id: str) -> Union[Dict, None]:
        pass

    @abstractmethod
    def _cleanup_conversations(self, conversation_ids: List[str]) -> None:
        pass

    @abstractmethod
    def add_conversation(self, location_id: str, user_id: str, metadata: Dict = {}) -> Dict:
        pass

    @abstractmethod
    def delete_conversation(self, conversation_id: str) -> None:
        pass

    @abstractmethod
    def update_conversation(self, conversation_id: str, metadata: Dict) -> None:
        pass
