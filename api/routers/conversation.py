from fastapi import APIRouter, HTTPException

# from pydantic import BaseModel
import uuid
from api import schemas

from api.dependencies import honcho, app

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


async def unpack(gen):
    result = []
    async for item in gen:
        result.append(item)
    return result


@router.get("/get")
async def get_conversations(user_id: str):
    # async with LOCK:
    # user = honcho.apps.users.get_or_create(user_id, app_id=app.id)
    # sessions = list(user.get_sessions_generator(is_active=True))
    user = honcho.apps.users.get_or_create(app_id=app.id, name=user_id)
    print(user)
    acc = []
    for convo in honcho.apps.users.sessions.list(
        app_id=app.id, user_id=user.id, is_active=True
    ):
        instance = {}
        instance["conversation_id"] = convo.id
        instance["name"] = ""
        if convo.metadata is not None and "name" in convo.metadata.keys():
            instance["name"] = convo.metadata["name"]
        acc.append(instance)

    print(acc)
    return {"conversations": acc}


@router.get("/delete")
async def delete_conversation(user_id: str, conversation_id: uuid.UUID):
    # async with LOCK:
    # user = honcho.apps.users.get_or_create(user_id, app_id=app.id)
    # user = honcho.get_or_create_user(user_id)
    try:
        # session = user.get_session(conversation_id)
        # session.close()
        user = honcho.apps.users.get_or_create(app_id=app.id, name=user_id)
        honcho.apps.users.sessions.delete(
            session_id=str(conversation_id), app_id=app.id, user_id=user.id
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Item not found") from None


@router.get("/insert")
async def add_conversation(user_id: str, location_id: str = "web"):
    print("help")
    # async with LOCK:
    # user = honcho.get_or_create_user(user_id)
    # user = honcho.apps.users.get_or_create(user_id, app_id=app.id)
    try:
        print(user_id)
        print(f"App_ID {app.id}")
        print(f"location_id {location_id}")

        user = honcho.apps.users.get_or_create(name=user_id, app_id=app.id)
        session = honcho.apps.users.sessions.create(user_id=user.id, app_id=app.id)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Item not found") from None
    # session = user.create_session(location_id=location_id)
    return {"conversation_id": session.id}


@router.post("/update")
async def update_conversations(change: schemas.ConversationDefinition):
    # async with LOCK:
    # user = honcho.get_or_create_user(change.user_id)
    user = honcho.apps.users.get_or_create(change.user_id, app_id=app.id)
    # session = user.get_session(change.conversation_id)
    honcho.apps.users.sessions.update(
        session_id=str(change.conversation_id),
        app_id=app.id,
        user_id=user.id,
        metadata={"name": change.name},
    )
    # session.update({"name": change.name})
    return
