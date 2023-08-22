from langchain.memory import PostgresChatMessageHistory
from langchain.schema.messages import BaseMessage, _message_to_dict, messages_from_dict
import uuid
import urllib
import os
from dotenv import load_dotenv
# Pyscopg For Postgres Management
import psycopg
from psycopg.rows import dict_row
# Supabase for Postgres Management
from supabase import create_client, Client
from typing import List
import json

load_dotenv()

class SupabaseMediator:
    def __init__(self):
        self.supabase: Client = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])
        self.table = os.environ["MEMORY_TABLE"]

    def messages(self, session_id: str, user_id: str, message_type: str) -> List[BaseMessage]:  # type: ignore
        response = self.supabase.table(self.table).select("message").eq("session_id", session_id).eq("user_id", user_id).eq("message_type", message_type).order("id", desc=True).limit(10).execute()
        items = [record["message"] for record in response.data]
        messages = messages_from_dict(items)
        return messages

    def add_message(self, session_id: str, user_id: str, message_type: str, message: BaseMessage) -> None:
        self.supabase.table(self.table).insert({"session_id": session_id, "user_id": user_id, "message_type": message_type, "message": _message_to_dict(message)}).execute()

# Modification of PostgresChatMessageHistory: https://api.python.langchain.com/en/latest/_modules/langchain/memory/chat_message_histories/postgres.html#PostgresChatMessageHistory
class PostgresMediator:
    """
    Wrapper class for encapsulating the multiple different chains used in reasoning for the tutor's thoughts

    This is a modified version of the PostgresChatMessageHistory class from langchain.memory.chat_message_histories.postgres
    It has a few different nuances and goals
    * For each message the following attributes should be encapsulated
        * ~session_id
        * ~user_id
        * ~message_content
        * ~sequential id
        * ~message_type - should be an enum corresponding to the different tags we've been using via langsmith
        * ~timestamp
    There should only really be one connection at a time so this can be thought of more as a singleton used to interface with postgres

    Can send everything to the same table

    """
    def __init__(self, table_name = "message_store"):
        try:
            connection_string = urllib.parse.quote(os.environ["SUPABASE_CONNECTION_URL"], safe='/:@', encoding=None, errors=None)
            self.connection: psycopg.Connection = psycopg.connect(connection_string)
            self.cursor: psycopg.Cursor = self.connection.cursor(row_factory=dict_row)
        except psycopg.OperationalError as error:
            pass
        
        self.table_name = table_name
        self._create_table_if_not_exists()
            # session_id=str(uuid.uuid4())
    def _create_table_if_not_exists(self) -> None:
        create_table_query = f"""CREATE TABLE IF NOT EXISTS {self.table_name} (
            id SERIAL PRIMARY KEY,
            session_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            message_type TEXT NOT NULL,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
            message JSONB NOT NULL
        );"""
        self.cursor.execute(create_table_query)
        self.connection.commit()

    
    def messages(self, session_id: str, user_id: str, message_type: str) -> List[BaseMessage]:  # type: ignore
        """Retrieve the messages from PostgreSQL"""
        query = (
            f"SELECT message FROM {self.table_name} WHERE session_id = %s AND user_id = %s AND message_type = %s ORDER BY id;"
        )
        messages = []
        try:
            self.cursor.execute(query, (session_id, user_id, message_type))
            items = [record["message"] for record in self.cursor.fetchall()]
            messages = messages_from_dict(items)
        except Exception as e:
            print(e)
        return messages

    def add_message(self, session_id: str, user_id: str, message_type: str, message: BaseMessage) -> None:
        """Append the message to the record in PostgreSQL"""
        from psycopg import sql

        query = sql.SQL("INSERT INTO {} (session_id, user_id, message_type, message) VALUES (%s, %s, %s, %s);").format(
            sql.Identifier(self.table_name)
        )
        try:
            self.cursor.execute(
                query, (session_id, user_id, message_type, json.dumps(_message_to_dict(message)))
            )
            self.connection.commit()
        except Exception as e:
            print(e)

    # def clear(self) -> None:
    #     """Clear session memory from PostgreSQL"""
    #     query = f"DELETE FROM {self.table_name} WHERE session_id = %s;"
    #     self.cursor.execute(query, (self.session_id,))
    #     self.connection.commit()

    def __del__(self) -> None:
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()


class ConversationCache:
    "Wrapper Class for storing contexts between channels. Using an object to pass by reference avoid additional cache hits"
    def __init__(self):
        # Eventually could mix this with a summary memory object: https://python.langchain.com/docs/modules/memory/agent_with_memory_in_db
        # self.thought_history = PostgresChatMessageHistory()
        # self.response_history = PostgresChatMessageHistory()
        self.conversation_id: str = str(uuid.uuid4())
        # Note the importance of escaping for the connection string make sure that "/:@" are all considered safe
        self.thought_memory: PostgresChatMessageHistory = PostgresChatMessageHistory(
            connection_string=urllib.parse.quote(os.environ["SUPABASE_CONNECTION_URL"], safe='/:@', encoding=None, errors=None),
            session_id=self.conversation_id
        )
        self.response_memory: PostgresChatMessageHistory = PostgresChatMessageHistory(
            connection_string=urllib.parse.quote(os.environ["SUPABASE_CONNECTION_URL"], safe='/:@', encoding=None, errors=None),
            session_id=self.conversation_id
        )

    def restart(self):
        self.conversation_id: str = str(uuid.uuid4())
        self.thought_memory.session_id = self.conversation_id
        self.response_memory.session_id = self.conversation_id
