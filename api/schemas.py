from pydantic import BaseModel


class ConversationInput(BaseModel):
    user_id: str
    conversation_id: str
    message: str


class ConversationDefinition(BaseModel):
    user_id: str
    conversation_id: str
    name: str
