from fastapi import APIRouter, HTTPException, Depends

from api import schemas

from api.dependencies import honcho, app
from api.security import get_current_user, verify_user_resource

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


async def unpack(gen):
    result = []
    async for item in gen:
        result.append(item)
    return result


@router.get("/get")
async def get_conversations(user_id: str, current_user=Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this resource"
        )

    user = honcho.apps.users.get_or_create(app_id=app.id, name=user_id)
    acc = []
    for convo in honcho.apps.users.sessions.list(
        app_id=app.id, user_id=user.id, is_active=True, reverse=True
    ):
        instance = {}
        instance["conversation_id"] = convo.id
        instance["name"] = ""
        if convo.metadata is not None and "name" in convo.metadata.keys():
            instance["name"] = convo.metadata["name"]
        acc.append(instance)

    return {"conversations": acc}


@router.get("/delete")
async def delete_conversation(
    user_id: str, conversation_id: str, current_user=Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this resource"
        )

    try:
        user = honcho.apps.users.get_or_create(app_id=app.id, name=user_id)
        honcho.apps.users.sessions.delete(
            session_id=str(conversation_id), app_id=app.id, user_id=user.id
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Item not found") from None


@router.get("/insert")
async def add_conversation(user_id: str, current_user=Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this resource"
        )
    try:
        user = honcho.apps.users.get_or_create(name=user_id, app_id=app.id)
        session = honcho.apps.users.sessions.create(user_id=user.id, app_id=app.id)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Item not found") from None
    return {"conversation_id": session.id}


@router.post("/update")
async def update_conversations(
    change: schemas.ConversationDefinition, current_user=Depends(get_current_user)
):
    if current_user.id != change.user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this resource"
        )

    user = honcho.apps.users.get_or_create(change.user_id, app_id=app.id)
    honcho.apps.users.sessions.update(
        session_id=str(change.conversation_id),
        app_id=app.id,
        user_id=user.id,
        metadata={"name": change.name},
    )
    return
