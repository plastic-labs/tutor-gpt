from langchain.schema.messages import BaseMessage, _message_to_dict, messages_from_dict
import uuid
import os
import sentry_sdk
from dotenv import load_dotenv
# Supabase for Postgres Management
from supabase.client import create_client, Client
from typing import List, Tuple, Dict
load_dotenv()

class SupabaseMediator:
    @sentry_sdk.trace
    def __init__(self):
        self.supabase: Client = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])
        self.memory_table = os.environ["MEMORY_TABLE"]
        self.conversation_table = os.environ["CONVERSATION_TABLE"]

    @sentry_sdk.trace
    def messages(self, session_id: str, user_id: str, message_type: str, limit: Tuple[bool, int | None] = (True,10)) -> List[BaseMessage]:  # type: ignore
        query = self.supabase.table(self.memory_table).select("message").eq("session_id", session_id).eq("user_id", user_id).eq("message_type", message_type).order("id", desc=True)
        if limit[0]:
            query = query.limit(limit[1])
        response = query.execute()
        items = [record["message"] for record in response.data]
        messages = messages_from_dict(items)
        return messages[::-1]

    @sentry_sdk.trace
    def add_message(self, session_id: str, user_id: str, message_type: str, message: BaseMessage) -> None:
        payload =  {
                 "session_id": session_id, 
                 "user_id": user_id, 
                 "message_type": message_type, 
                 "message": _message_to_dict(message)
                }
        self.supabase.table(self.memory_table).insert(payload).execute()

    @sentry_sdk.trace
    def conversations(self, location_id: str, user_id: str, single: bool = True) -> List[Dict] | None:
        try:
            response = self.supabase.table(self.conversation_table).select(*["id", "metadata"], count="exact").eq("location_id", location_id).eq("user_id", user_id).eq("isActive", True).order("created_at", desc=True).execute()
            if response is not None and response.count is not None:
                if (response.count > 1) and single:
                    # If there is more than 1 active conversation mark the rest for deletion
                    conversation_ids = [record["id"] for record in response.data[1:]]
                    self._cleanup_conversations(conversation_ids) # type: ignore
                    return [response.data[0]]
                else:
                    return response.data
            return None
        except Exception as e:
            print("========================================")
            print(e)
            print("========================================")
            return None


    @sentry_sdk.trace
    def conversation(self, session_id: str) -> Dict | None:
        response = self.supabase.table(self.conversation_table).select("*").eq("id", session_id).eq("isActive", True).maybe_single().execute()
        if response:
           return response.data
        return None

    @sentry_sdk.trace
    def _cleanup_conversations(self, conversation_ids: List[str]) -> None:
        for conversation_id in conversation_ids:
            self.supabase.table(self.conversation_table).update({"isActive": False}).eq("id", conversation_id).execute()
    
    @sentry_sdk.trace
    def add_conversation(self, location_id: str, user_id: str, metadata: Dict = {}) -> Dict:
        conversation_id = str(uuid.uuid4())
        payload = {
                "id": conversation_id, 
                "user_id": user_id, 
                "location_id": location_id,
                "metadata": metadata,
        }
        representation = self.supabase.table(self.conversation_table).insert(payload, returning="representation").execute() # type: ignore
        print("========================================")
        print(representation)
        print("========================================")
        return representation.data[0]

    @sentry_sdk.trace
    def delete_conversation(self, conversation_id: str) -> None:
        self.supabase.table(self.conversation_table).update({"isActive": False}).eq("id", conversation_id).execute()

    @sentry_sdk.trace
    def update_conversation(self, conversation_id: str, metadata: Dict) -> None:
       cur =  self.supabase.table(self.conversation_table).select("metadata").eq("id", conversation_id).single().execute()
       if cur.data['metadata'] is not None:
           new_metadata = cur.data['metadata'].copy()
           new_metadata.update(metadata)
       else:
           new_metadata = metadata
       self.supabase.table(self.conversation_table).update({"metadata": new_metadata}, returning="representation").eq("id", conversation_id).execute() # type: ignore
