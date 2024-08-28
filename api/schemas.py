from pydantic import BaseModel
import uuid


class ConversationInput(BaseModel):
    user_id: str
    conversation_id: uuid.UUID
    message: str


class ConversationDefinition(BaseModel):
    user_id: str
    conversation_id: uuid.UUID
    name: str
